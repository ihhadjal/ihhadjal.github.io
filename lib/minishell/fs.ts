import { contact, projects, skills } from "@/lib/content";

export type FsNode = { type: "file"; content: string } | { type: "dir"; children: Map<string, FsNode> };

export const HOME = "/home/ihhadjal";

const file = (content: string): FsNode => ({ type: "file", content });
const dir = (entries: Record<string, FsNode> = {}): FsNode => ({
  type: "dir",
  children: new Map(Object.entries(entries)),
});

const lines = (...l: string[]) => l.join("\n") + "\n";

const STUB = "/* full source: https://github.com/ihhadjal/minishell_42 */";

const cSource = (header: string, body: string) =>
  lines(`/* ${header} */`, "", '#include "minishell.h"', "", body.trimEnd());

export function createFileSystem(): FsNode {
  const projectFiles = Object.fromEntries(
    projects.map((p) => [
      `${p.slug}.md`,
      file(
        lines(
          `# ${p.title}`,
          "",
          p.description,
          "",
          `stack: ${p.tags.join(", ")}`,
          ...(p.href ? [`repo:  ${p.href}`] : []),
        ),
      ),
    ]),
  );

  const home = dir({
    "about.txt": file(
      lines(
        "Iheb Hadjali — software engineer (backend · machine learning · AI)",
        "",
        "Full Stack Developer @ GPI France, Nice.",
        "Master's-level Data Architecture & Engineering track at École 42 Nice.",
        "",
        "I build backend systems that hold up in production,",
        "and machine-learning models from the math up.",
        "",
        "Languages: Arabic · Italian · French · English (C2)",
      ),
    ),
    "contact.txt": file(
      lines(
        `github    ${contact.github}`,
        `linkedin  ${contact.linkedin}`,
        `email     ${contact.email}`,
        `phone     ${contact.phone.display}`,
      ),
    ),
    "skills.txt": file(lines(...skills.map((s) => `${s.k.padEnd(16)}${s.v}`))),
    ".plan": file(
      lines("now:  modernizing a legacy healthcare backend @ GPI France", "next: more ML, more data engineering"),
    ),
    projects: dir(projectFiles),
    minishell: dir({
      "Makefile": file(
        lines(
          "NAME    = minishell",
          "CC      = cc",
          "CFLAGS  = -Wall -Wextra -Werror",
          "SRCS    = $(wildcard src/*.c)",
          "",
          "$(NAME): $(SRCS:.c=.o)",
          "\t$(CC) $(CFLAGS) $^ -lreadline -o $@",
        ),
      ),
      "README.md": file(
        lines(
          "# minishell",
          "",
          "As beautiful as a shell. A small bash written in C at École 42:",
          "prompt, history, quotes, $VAR / $? expansion, pipes, < > >> << redirections,",
          "builtins (echo cd pwd export unset env exit) and ctrl-C / ctrl-D / ctrl-\\ handling.",
          "",
          "The one running on this page is a TypeScript port of the same ideas.",
        ),
      ),
      include: dir({
        "minishell.h": file(
          lines(
            "#ifndef MINISHELL_H",
            "# define MINISHELL_H",
            "",
            "# include <readline/readline.h>",
            "# include <signal.h>",
            "",
            "extern int\tg_signal;",
            "",
            "typedef struct s_shell",
            "{",
            "\tchar\t**env;",
            "\tint\t\texit_status;",
            "}\tt_shell;",
            "",
            "#endif",
          ),
        ),
      }),
      src: dir({
        "main.c": file(
          cSource(
            "main.c — read, parse, execute, repeat",
            lines(
              "int\tg_signal = 0;",
              "",
              "int\tmain(int argc, char **argv, char **envp)",
              "{",
              "\tt_shell\tshell;",
              "\tchar\t*line;",
              "",
              "\t(void)argc;",
              "\t(void)argv;",
              "\tinit_shell(&shell, envp);",
              "\tsetup_signals();",
              "\twhile (1)",
              "\t{",
              '\t\tline = readline("minishell$ ");',
              "\t\tif (!line)",
              "\t\t\tbreak ;",
              "\t\tif (*line)",
              "\t\t\tadd_history(line);",
              "\t\texecute_line(&shell, line);",
              "\t\tfree(line);",
              "\t}",
              '\tprintf("exit\\n");',
              "\treturn (shell.exit_status);",
              "}",
            ),
          ),
        ),
        "lexer.c": file(cSource("lexer.c — split the line into words and operators, honoring quotes", STUB)),
        "expander.c": file(cSource("expander.c — $VAR and $? expansion, quote removal", STUB)),
        "parser.c": file(cSource("parser.c — build the pipeline of simple commands and redirections", STUB)),
        "heredoc.c": file(cSource("heredoc.c — read << bodies until the delimiter", STUB)),
        "executor.c": file(cSource("executor.c — fork, pipe, dup2, execve, waitpid", STUB)),
        "builtins.c": file(cSource("builtins.c — echo cd pwd export unset env exit", STUB)),
        "signals.c": file(cSource("signals.c — ctrl-C, ctrl-D, ctrl-\\", STUB)),
      }),
    }),
  });

  return dir({ home: dir({ ihhadjal: home }), tmp: dir() });
}

/** Resolves `path` against `cwd` into a normalized absolute path. */
export function normalize(cwd: string, path: string): string {
  const parts: string[] = [];
  for (const segment of (path.startsWith("/") ? path : `${cwd}/${path}`).split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return "/" + parts.join("/");
}

export function lookup(root: FsNode, path: string): FsNode | undefined {
  let node: FsNode | undefined = root;
  for (const segment of path.split("/").filter(Boolean)) {
    if (node.type !== "dir") return undefined;
    node = node.children.get(segment);
    if (!node) return undefined;
  }
  return node;
}

export function splitPath(path: string): [parent: string, name: string] {
  const slash = path.lastIndexOf("/");
  return [path.slice(0, slash) || "/", path.slice(slash + 1)];
}
