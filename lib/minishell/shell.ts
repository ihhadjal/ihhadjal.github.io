import { COMMANDS, type CommandResult } from "./commands";
import { createFileSystem, type FsNode, HOME, lookup, normalize, splitPath } from "./fs";
import { expandVariables, parse, type SimpleCommand, ShellSyntaxError, tokenize } from "./parse";

export type OutputLine = { kind: "out" | "err"; text: string };
export type RunResult = { lines: OutputLine[]; clear?: boolean; exit?: boolean };
export type Prepared = { commands: SimpleCommand[]; heredocs: string[] } | { error: string };

const escapeRegExp = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const toLines = (text: string, kind: OutputLine["kind"]): OutputLine[] =>
  text
    .replace(/\n$/, "")
    .split("\n")
    .map((t) => ({ kind, text: t }));

export class Shell {
  readonly root: FsNode = createFileSystem();
  cwd = HOME;
  status = 0;
  readonly history: string[] = [];
  readonly env = new Map<string, string>([
    ["USER", "ihhadjal"],
    ["HOME", HOME],
    ["PWD", HOME],
    ["SHELL", "/bin/minishell"],
    ["PATH", "/usr/local/bin:/usr/bin:/bin"],
    ["LANG", "en_US.UTF-8"],
    ["TERM", "xterm-256color"],
    ["SHLVL", "1"],
  ]);

  resolve(path: string) {
    return normalize(this.cwd, path);
  }

  node(path: string) {
    return lookup(this.root, this.resolve(path));
  }

  chdir(path: string) {
    this.env.set("OLDPWD", this.cwd);
    this.cwd = path;
    this.env.set("PWD", path);
  }

  /** Writes (or appends to) a file at an absolute path; returns an error message on failure. */
  writeFile(path: string, content: string, append: boolean): string | null {
    const [parentPath, name] = splitPath(path);
    const parent = lookup(this.root, parentPath);
    if (parent?.type !== "dir") return "No such file or directory";
    const existing = parent.children.get(name);
    if (existing?.type === "dir") return "Is a directory";
    parent.children.set(name, { type: "file", content: (append && existing ? existing.content : "") + content });
    return null;
  }

  mkdir(path: string, parents: boolean): string | null {
    const [parentPath, name] = splitPath(path);
    let parent = lookup(this.root, parentPath);
    if (!parent && parents) {
      const error = this.mkdir(parentPath, true);
      if (error) return error;
      parent = lookup(this.root, parentPath);
    }
    if (parent?.type !== "dir") return "No such file or directory";
    if (parent.children.has(name)) return parents ? null : "File exists";
    parent.children.set(name, { type: "dir", children: new Map() });
    return null;
  }

  variable(name: string) {
    return name === "?" ? String(this.status) : (this.env.get(name) ?? "");
  }

  /** Expands a `*` pattern in its last path segment; returns no matches rather than the pattern. */
  glob(pattern: string): string[] {
    const slash = pattern.lastIndexOf("/");
    const dirPart = pattern.slice(0, slash + 1);
    const base = pattern.slice(slash + 1);
    if (dirPart.includes("*")) return [];
    const dir = this.node(dirPart || ".");
    if (dir?.type !== "dir") return [];
    const re = new RegExp("^" + base.split("*").map(escapeRegExp).join(".*") + "$");
    return [...dir.children.keys()]
      .filter((name) => re.test(name) && (base.startsWith(".") || !name.startsWith(".")))
      .sort()
      .map((name) => dirPart + name);
  }

  /** Parses a line and reports the heredoc delimiters that must be read before it can run. */
  prepare(line: string): Prepared {
    try {
      const commands = parse(
        tokenize(line, { variable: (n) => this.variable(n), glob: (p) => this.glob(p) }),
      );
      const heredocs = commands.flatMap((c) => c.redirections.filter((r) => r.op === "<<").map((r) => r.target));
      return { commands, heredocs };
    } catch (e) {
      if (!(e instanceof ShellSyntaxError)) throw e;
      this.status = 2;
      return { error: `minishell: ${e.message}` };
    }
  }

  run(commands: SimpleCommand[], heredocBodies: string[] = []): RunResult {
    const lines: OutputLine[] = [];
    const result: RunResult = { lines };
    const bodies = [...heredocBodies];
    let piped: string | null = null;

    commands.forEach((command, index) => {
      let stdin = piped;
      let outFile: string | null = null;
      let failed = false;

      for (const r of command.redirections) {
        if (r.op === "<<") {
          stdin = expandVariables(bodies.shift() ?? "", { variable: (n) => this.variable(n) });
          continue;
        }
        const path = this.resolve(r.target);
        if (r.op === "<") {
          const node = lookup(this.root, path);
          if (node?.type !== "file") {
            lines.push({ kind: "err", text: `minishell: ${r.target}: ${node ? "Is a directory" : "No such file or directory"}` });
            failed = true;
            break;
          }
          stdin = node.content;
        } else {
          // `>` truncates when opened; output is then appended, so both cases append below.
          const error = this.writeFile(path, "", r.op === ">>");
          if (error) {
            lines.push({ kind: "err", text: `minishell: ${r.target}: ${error}` });
            failed = true;
            break;
          }
          outFile = path;
        }
      }

      const isLast = index === commands.length - 1;
      if (failed) {
        this.status = 1;
        piped = "";
        return;
      }

      const res: CommandResult = command.argv.length
        ? this.exec(command.argv, { stdin, tty: isLast && !outFile, alone: commands.length === 1 })
        : { status: 0 };
      if (res.err) lines.push(...toLines(res.err, "err"));
      if (res.clear) result.clear = true;
      if (res.exit) result.exit = true;
      this.status = res.status;

      const out = res.out ?? "";
      if (outFile) {
        this.writeFile(outFile, out, true);
        piped = "";
      } else if (isLast) {
        if (out) lines.push(...toLines(out, "out"));
      } else piped = out;
    });

    return result;
  }

  private exec(argv: string[], io: { stdin: string | null; tty: boolean; alone: boolean }): CommandResult {
    const [name, ...args] = argv;
    const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
    if (command) return command(args, { shell: this, ...io });
    if (name.includes("/")) {
      const node = this.node(name);
      if (!node) return { err: `minishell: ${name}: No such file or directory`, status: 127 };
      return { err: `minishell: ${name}: ${node.type === "dir" ? "Is a directory" : "Permission denied"}`, status: 126 };
    }
    return { err: `minishell: ${name}: command not found`, status: 127 };
  }

  /** Tab completion: completes the last word, or lists the candidates when ambiguous. */
  complete(input: string): { input: string; options?: string[] } {
    const word = /\S*$/.exec(input)![0];
    const before = input.slice(0, input.length - word.length);
    const isCommand = /(^|\|)\s*$/.test(before) && !word.includes("/");

    let candidates: { value: string; label: string }[];
    if (isCommand) {
      candidates = Object.keys(COMMANDS)
        .filter((c) => c.startsWith(word))
        .map((c) => ({ value: c + " ", label: c }));
    } else {
      const slash = word.lastIndexOf("/");
      const dirPart = word.slice(0, slash + 1);
      const base = word.slice(slash + 1);
      const dir = this.node(dirPart || ".");
      if (dir?.type !== "dir") return { input };
      candidates = [...dir.children]
        .filter(([name]) => name.startsWith(base) && (base.startsWith(".") || !name.startsWith(".")))
        .map(([name, node]) => ({
          value: dirPart + name + (node.type === "dir" ? "/" : " "),
          label: name + (node.type === "dir" ? "/" : ""),
        }));
    }

    if (!candidates.length) return { input };
    if (candidates.length === 1) return { input: before + candidates[0].value };
    let prefix = candidates[0].value;
    for (const c of candidates) while (!c.value.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (prefix.length > word.length) return { input: before + prefix };
    return { input, options: candidates.map((c) => c.label).sort() };
  }
}
