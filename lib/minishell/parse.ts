export type RedirectionOp = "<" | ">" | ">>" | "<<";
export type Redirection = { op: RedirectionOp; target: string };
export type SimpleCommand = { argv: string[]; redirections: Redirection[] };

type Token = { kind: "word"; value: string } | { kind: "op"; value: "|" | RedirectionOp };

export type ExpansionContext = {
  variable: (name: string) => string;
  glob: (pattern: string) => string[];
};

export class ShellSyntaxError extends Error {}

const isSpace = (c: string) => c === " " || c === "\t";
const isOperator = (c: string) => c === "|" || c === "<" || c === ">";
const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9_]/;

/** Expands the `$NAME` or `$?` at text[i]; returns the value and how many characters it consumed. */
function readVariable(text: string, i: number, ctx: Pick<ExpansionContext, "variable">): [string, number] {
  const next = text[i + 1];
  if (next === "?") return [ctx.variable("?"), 2];
  if (!next || !NAME_START.test(next)) return ["$", 1];
  let j = i + 1;
  while (j < text.length && NAME_CHAR.test(text[j])) j++;
  return [ctx.variable(text.slice(i + 1, j)), j - i];
}

/** Variable expansion as inside double quotes (also used for heredoc bodies). */
export function expandVariables(text: string, ctx: Pick<ExpansionContext, "variable">): string {
  let out = "";
  for (let i = 0; i < text.length; ) {
    if (text[i] === "$") {
      const [value, consumed] = readVariable(text, i, ctx);
      out += value;
      i += consumed;
    } else out += text[i++];
  }
  return out;
}

export function tokenize(line: string, ctx: ExpansionContext): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const c = line[i];
    if (isSpace(c)) {
      i++;
      continue;
    }
    if (c === "|") {
      tokens.push({ kind: "op", value: "|" });
      i++;
      continue;
    }
    if (c === "<" || c === ">") {
      const double = line[i + 1] === c;
      tokens.push({ kind: "op", value: (double ? c + c : c) as RedirectionOp });
      i += double ? 2 : 1;
      continue;
    }

    // A heredoc delimiter is taken literally.
    const literal = tokens.at(-1)?.value === "<<";
    let value = "";
    let quoted = false;
    let globbable = false;
    while (i < line.length && !isSpace(line[i]) && !isOperator(line[i])) {
      const ch = line[i];
      if (ch === "'" || ch === '"') {
        const end = line.indexOf(ch, i + 1);
        if (end < 0) throw new ShellSyntaxError(`unexpected EOF while looking for matching \`${ch}'`);
        const inner = line.slice(i + 1, end);
        value += ch === '"' && !literal ? expandVariables(inner, ctx) : inner;
        quoted = true;
        i = end + 1;
      } else if (ch === "$" && !literal) {
        const [expanded, consumed] = readVariable(line, i, ctx);
        value += expanded;
        i += consumed;
      } else {
        if (ch === "*") globbable = true;
        value += ch;
        i++;
      }
    }

    if (!quoted && value === "") continue; // an unset variable expands to nothing
    if (!quoted && !literal && (value === "~" || value.startsWith("~/"))) value = ctx.variable("HOME") + value.slice(1);

    const matches = globbable && !quoted ? ctx.glob(value) : [];
    if (matches.length) matches.forEach((m) => tokens.push({ kind: "word", value: m }));
    else tokens.push({ kind: "word", value });
  }

  return tokens;
}

export function parse(tokens: Token[]): SimpleCommand[] {
  if (!tokens.length) return [];
  const commands: SimpleCommand[] = [];
  let current: SimpleCommand = { argv: [], redirections: [] };
  const isEmpty = (c: SimpleCommand) => !c.argv.length && !c.redirections.length;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === "word") current.argv.push(token.value);
    else if (token.value === "|") {
      if (isEmpty(current)) throw new ShellSyntaxError("syntax error near unexpected token `|'");
      commands.push(current);
      current = { argv: [], redirections: [] };
    } else {
      const target = tokens[i + 1];
      if (!target || target.kind !== "word") {
        throw new ShellSyntaxError(`syntax error near unexpected token \`${target ? target.value : "newline"}'`);
      }
      current.redirections.push({ op: token.value, target: target.value });
      i++;
    }
  }

  if (isEmpty(current)) throw new ShellSyntaxError("syntax error near unexpected token `|'");
  commands.push(current);
  return commands;
}
