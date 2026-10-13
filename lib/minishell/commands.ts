import { type FsNode, splitPath } from "./fs";
import type { Shell } from "./shell";

export type CommandResult = { out?: string; err?: string; status: number; clear?: boolean; exit?: boolean };

export type CommandContext = {
  shell: Shell;
  /** Piped or redirected input, or null when reading from the (non-existent) keyboard. */
  stdin: string | null;
  /** Output goes straight to the terminal rather than into a pipe or file. */
  tty: boolean;
  /** Not part of a pipeline, so builtins may change shell state (bash runs piped builtins in a subshell). */
  alone: boolean;
};

type Command = (args: string[], ctx: CommandContext) => CommandResult;

const ok = (out = ""): CommandResult => ({ out, status: 0 });
const fail = (err: string, status = 1): CommandResult => ({ err, status });

/** Splits leading `-abc` flags from operands. */
function parseFlags(args: string[]) {
  const flags = new Set<string>();
  let i = 0;
  for (; i < args.length && /^-[A-Za-z]+$/.test(args[i]); i++) for (const f of args[i].slice(1)) flags.add(f);
  return { flags, operands: args.slice(i) };
}

function invalidOption(name: string, flags: Set<string>, allowed: string): CommandResult | null {
  for (const f of flags) if (!allowed.includes(f)) return fail(`${name}: invalid option -- '${f}'`, 2);
  return null;
}

/** Reads the named files, or stdin when there are none. */
function readSources(name: string, files: string[], ctx: CommandContext) {
  if (!files.length) return { sources: [{ name: null as string | null, content: ctx.stdin ?? "" }], errors: [] };
  const sources: { name: string | null; content: string }[] = [];
  const errors: string[] = [];
  for (const f of files) {
    const node = ctx.shell.node(f);
    if (!node) errors.push(`${name}: ${f}: No such file or directory`);
    else if (node.type === "dir") errors.push(`${name}: ${f}: Is a directory`);
    else sources.push({ name: f, content: node.content });
  }
  return { sources, errors };
}

/** Lines of a text, without the empty string a trailing newline would produce. */
const splitLines = (text: string) => (text === "" ? [] : text.replace(/\n$/, "").split("\n"));
const joinLines = (lines: string[]) => (lines.length ? lines.join("\n") + "\n" : "");

const withErrors = (result: CommandResult, errors: string[]): CommandResult =>
  errors.length ? { ...result, err: errors.join("\n"), status: Math.max(result.status, 1) } : result;

const isIdentifier = (name: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);

function lineCount(args: string[]) {
  let n = 10;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" && args[i + 1] !== undefined) n = Number(args[++i]);
    else if (/^-n?\d+$/.test(args[i])) n = Number(args[i].replace(/^-n?/, ""));
    else rest.push(args[i]);
  }
  return { n: Number.isFinite(n) ? n : 10, files: rest };
}

const HELP = joinLines([
  "minishell — a tiny bash, running in your browser.",
  "",
  "builtins  echo [-n] · cd · pwd · export · unset · env · exit",
  "commands  ls · cat · grep · wc · head · tail · touch · mkdir · rm · whoami · history · clear · help",
  "syntax    pipes |  redirections < > >>  heredocs <<  $VAR  $?  'single' \"double\" quotes  * globs",
  "keys      ↑ ↓ history · Tab completion · Ctrl+C cancel · Ctrl+L clear · Ctrl+D exit",
  "",
  "try       cat about.txt · ls projects · cat contact.txt · cd minishell/src · ls *.c | wc -l",
]);

export const COMMANDS: Record<string, Command> = {
  echo(args) {
    let i = 0;
    while (i < args.length && /^-n+$/.test(args[i])) i++;
    return ok(args.slice(i).join(" ") + (i ? "" : "\n"));
  },

  cd(args, { shell, alone }) {
    if (args.length > 1) return fail("minishell: cd: too many arguments");
    let target = args[0] ?? shell.env.get("HOME");
    if (target === undefined) return fail("minishell: cd: HOME not set");
    let out = "";
    if (target === "-") {
      const previous = shell.env.get("OLDPWD");
      if (previous === undefined) return fail("minishell: cd: OLDPWD not set");
      target = previous;
      out = target + "\n";
    }
    const node = shell.node(target);
    if (!node) return fail(`minishell: cd: ${target}: No such file or directory`);
    if (node.type !== "dir") return fail(`minishell: cd: ${target}: Not a directory`);
    if (alone) shell.chdir(shell.resolve(target));
    return ok(out);
  },

  pwd: (_, { shell }) => ok(shell.cwd + "\n"),

  export(args, { shell, alone }) {
    if (!args.length) {
      const entries = [...shell.env].sort(([a], [b]) => a.localeCompare(b));
      return ok(joinLines(entries.map(([k, v]) => `declare -x ${k}="${v}"`)));
    }
    const errors: string[] = [];
    for (const arg of args) {
      const eq = arg.indexOf("=");
      const name = eq < 0 ? arg : arg.slice(0, eq);
      if (!isIdentifier(name)) errors.push(`minishell: export: \`${arg}': not a valid identifier`);
      else if (eq >= 0 && alone) shell.env.set(name, arg.slice(eq + 1));
    }
    return withErrors(ok(), errors);
  },

  unset(args, { shell, alone }) {
    const errors: string[] = [];
    for (const name of args) {
      if (!isIdentifier(name)) errors.push(`minishell: unset: \`${name}': not a valid identifier`);
      else if (alone) shell.env.delete(name);
    }
    return withErrors(ok(), errors);
  },

  env: (_, { shell }) => ok(joinLines([...shell.env].map(([k, v]) => `${k}=${v}`))),

  exit(args, { shell, alone }) {
    const out = alone ? "exit\n" : "";
    if (!args.length) return { out, status: shell.status, exit: alone };
    if (!/^[+-]?\d+$/.test(args[0])) {
      return { out, err: `minishell: exit: ${args[0]}: numeric argument required`, status: 2, exit: alone };
    }
    if (args.length > 1) return { out, err: "minishell: exit: too many arguments", status: 1 };
    return { out, status: ((Number(args[0]) % 256) + 256) % 256, exit: alone };
  },

  ls(args, ctx) {
    const { flags, operands } = parseFlags(args);
    const invalid = invalidOption("ls", flags, "al1");
    if (invalid) return invalid;
    const targets = operands.length ? operands : ["."];
    const errors: string[] = [];
    const files: string[] = [];
    const dirs: { target: string; entries: string[] }[] = [];

    const describe = (name: string, node: FsNode) => {
      const isDir = node.type === "dir";
      if (flags.has("l")) {
        const size = isDir ? 4096 : new TextEncoder().encode(node.content).length;
        return `${isDir ? "drwxr-xr-x" : "-rw-r--r--"}  ihhadjal  ${String(size).padStart(5)}  ${name}`;
      }
      return isDir && ctx.tty ? `${name}/` : name;
    };

    for (const target of targets) {
      const node = ctx.shell.node(target);
      if (!node) {
        errors.push(`ls: cannot access '${target}': No such file or directory`);
        continue;
      }
      if (node.type === "file") files.push(describe(target, node));
      else {
        const names = [...node.children.keys()].filter((n) => flags.has("a") || !n.startsWith(".")).sort();
        const entries = [...(flags.has("a") ? [".", ".."] : []), ...names].map((n) =>
          describe(n, n === "." || n === ".." ? node : node.children.get(n)!),
        );
        dirs.push({ target, entries });
      }
    }

    // Like ls: file operands first as one group, then each directory under its own header.
    const columns = ctx.tty && !flags.has("l") && !flags.has("1");
    const format = (entries: string[]) =>
      columns ? (entries.length ? entries.join("  ") + "\n" : "") : joinLines(entries);
    const blocks = [
      ...(files.length ? [format(files)] : []),
      ...dirs.map((d) => (targets.length > 1 ? `${d.target}:\n${format(d.entries)}` : format(d.entries))),
    ];
    const result = ok(blocks.join("\n"));
    return errors.length ? { ...result, err: errors.join("\n"), status: 2 } : result;
  },

  cat(args, ctx) {
    const { flags, operands } = parseFlags(args);
    const invalid = invalidOption("cat", flags, "en");
    if (invalid) return invalid;
    const { sources, errors } = readSources("cat", operands, ctx);
    let text = sources.map((s) => s.content).join("");
    if (flags.has("n")) {
      const trailing = text.endsWith("\n");
      text = splitLines(text)
        .map((l, i) => `${String(i + 1).padStart(6)}\t${l}`)
        .join("\n") + (trailing ? "\n" : "");
    }
    if (flags.has("e")) text = text.replace(/\n/g, "$\n");
    return withErrors(ok(text), errors);
  },

  grep(args, ctx) {
    const { flags, operands } = parseFlags(args);
    const invalid = invalidOption("grep", flags, "icnv");
    if (invalid) return invalid;
    const [pattern, ...files] = operands;
    if (pattern === undefined) return fail("usage: grep [-icnv] pattern [file ...]", 2);
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags.has("i") ? "i" : "");
    } catch {
      regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags.has("i") ? "i" : "");
    }
    const { sources, errors } = readSources("grep", files, ctx);
    const out: string[] = [];
    let matched = false;
    for (const source of sources) {
      const prefix = sources.length > 1 && source.name ? `${source.name}:` : "";
      const hits = splitLines(source.content)
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => regex.test(line) !== flags.has("v"));
      if (hits.length) matched = true;
      if (flags.has("c")) out.push(`${prefix}${hits.length}`);
      else out.push(...hits.map(({ line, i }) => `${prefix}${flags.has("n") ? `${i + 1}:` : ""}${line}`));
    }
    if (errors.length) return { out: joinLines(out), err: errors.join("\n"), status: 2 };
    return { out: joinLines(out), status: matched ? 0 : 1 };
  },

  wc(args, ctx) {
    const { flags, operands } = parseFlags(args);
    const invalid = invalidOption("wc", flags, "lwc");
    if (invalid) return invalid;
    const shown = flags.size ? ["l", "w", "c"].filter((f) => flags.has(f)) : ["l", "w", "c"];
    const { sources, errors } = readSources("wc", operands, ctx);
    const count = (text: string) => ({
      l: (text.match(/\n/g) ?? []).length,
      w: text.split(/\s+/).filter(Boolean).length,
      c: new TextEncoder().encode(text).length,
    });
    const rows = sources.map((s) => ({ name: s.name, ...count(s.content) }));
    if (rows.length > 1) {
      rows.push({
        name: "total",
        l: rows.reduce((a, r) => a + r.l, 0),
        w: rows.reduce((a, r) => a + r.w, 0),
        c: rows.reduce((a, r) => a + r.c, 0),
      });
    }
    const bare = rows.length === 1 && !rows[0].name && shown.length === 1;
    const format = (r: (typeof rows)[number]) =>
      bare
        ? String(r[shown[0] as "l"])
        : shown.map((f) => String(r[f as "l"]).padStart(7)).join(" ") + (r.name ? ` ${r.name}` : "");
    return withErrors(ok(joinLines(rows.map(format))), errors);
  },

  head(args, ctx) {
    const { n, files } = lineCount(args);
    const { sources, errors } = readSources("head", files, ctx);
    return withErrors(ok(joinLines(sources.flatMap((s) => splitLines(s.content).slice(0, n)))), errors);
  },

  tail(args, ctx) {
    const { n, files } = lineCount(args);
    const { sources, errors } = readSources("tail", files, ctx);
    return withErrors(ok(joinLines(sources.flatMap((s) => (n ? splitLines(s.content).slice(-n) : [])))), errors);
  },

  touch(args, { shell }) {
    if (!args.length) return fail("touch: missing file operand");
    const errors: string[] = [];
    for (const f of args) {
      if (shell.node(f)) continue;
      const error = shell.writeFile(shell.resolve(f), "", true);
      if (error) errors.push(`touch: cannot touch '${f}': ${error}`);
    }
    return withErrors(ok(), errors);
  },

  mkdir(args, { shell }) {
    const { flags, operands } = parseFlags(args);
    if (!operands.length) return fail("mkdir: missing operand");
    const errors: string[] = [];
    for (const d of operands) {
      const error = shell.mkdir(shell.resolve(d), flags.has("p"));
      if (error) errors.push(`mkdir: cannot create directory '${d}': ${error}`);
    }
    return withErrors(ok(), errors);
  },

  rm(args, { shell }) {
    const { flags, operands } = parseFlags(args);
    if (!operands.length) return fail("rm: missing operand");
    const errors: string[] = [];
    for (const f of operands) {
      const node = shell.node(f);
      if (!node) {
        if (!flags.has("f")) errors.push(`rm: cannot remove '${f}': No such file or directory`);
      } else if (node.type === "dir" && !flags.has("r")) errors.push(`rm: cannot remove '${f}': Is a directory`);
      else {
        const [parent, name] = splitPath(shell.resolve(f));
        const dir = shell.node(parent);
        if (dir?.type === "dir") dir.children.delete(name);
      }
    }
    return withErrors(ok(), errors);
  },

  whoami: (_, { shell }) => ok((shell.env.get("USER") ?? "ihhadjal") + "\n"),

  history: (_, { shell }) =>
    ok(joinLines(shell.history.map((line, i) => `${String(i + 1).padStart(5)}  ${line}`))),

  clear: () => ({ status: 0, clear: true }),

  help: () => ok(HELP),
};
