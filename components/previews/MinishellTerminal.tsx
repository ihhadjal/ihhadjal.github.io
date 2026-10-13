"use client";

import { useEffect, useRef, useState } from "react";
import type { SimpleCommand } from "@/lib/minishell/parse";
import { Shell } from "@/lib/minishell/shell";

type Line = { kind: "cmd"; prompt: string; text: string } | { kind: "out" | "err" | "info"; text: string };

type PendingHeredoc = {
  commands: SimpleCommand[];
  delimiters: string[];
  bodies: string[];
  current: string[];
};

const PROMPT = "minishell$";
const HEREDOC_PROMPT = ">";
const MAX_LINES = 400;
const DEMO = 'echo "hello 42" | cat -e';

function bootLines(shell: Shell): Line[] {
  const prepared = shell.prepare(DEMO);
  const output = "commands" in prepared ? shell.run(prepared.commands).lines : [];
  return [
    { kind: "cmd", prompt: PROMPT, text: DEMO },
    ...output,
    { kind: "info", text: "# this shell is live — click here and type help" },
  ];
}

const lineColor: Record<Line["kind"], string> = {
  cmd: "",
  out: "text-body",
  err: "text-red",
  info: "text-muted",
};

export function MinishellTerminal() {
  const [shell, setShell] = useState(() => new Shell());
  const [lines, setLines] = useState<Line[]>(() => bootLines(shell));
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingHeredoc | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, pending]);

  const append = (more: Line[]) => setLines((prev) => [...prev, ...more].slice(-MAX_LINES));

  const run = (commands: SimpleCommand[], bodies: string[], echoed: Line[]) => {
    const result = shell.run(commands, bodies);
    if (result.clear) {
      setLines(result.lines);
      return;
    }
    const out: Line[] = [...echoed, ...result.lines];
    if (result.exit) {
      out.push({ kind: "info", text: `# process exited with status ${shell.status} — new session started` });
      setShell(new Shell());
    }
    append(out);
  };

  const submit = (text: string) => {
    setInput("");
    setHistoryIndex(null);

    if (pending) {
      const echoed: Line[] = [{ kind: "cmd", prompt: HEREDOC_PROMPT, text }];
      if (text !== pending.delimiters[pending.bodies.length]) {
        setPending({ ...pending, current: [...pending.current, text] });
        append(echoed);
        return;
      }
      const bodies = [...pending.bodies, pending.current.map((l) => l + "\n").join("")];
      if (bodies.length < pending.delimiters.length) {
        setPending({ ...pending, bodies, current: [] });
        append(echoed);
        return;
      }
      setPending(null);
      run(pending.commands, bodies, echoed);
      return;
    }

    const echoed: Line[] = [{ kind: "cmd", prompt: PROMPT, text }];
    if (text.trim()) shell.history.push(text);
    const prepared = shell.prepare(text);
    if ("error" in prepared) append([...echoed, { kind: "err", text: prepared.error }]);
    else if (prepared.heredocs.length) {
      setPending({ commands: prepared.commands, delimiters: prepared.heredocs, bodies: [], current: [] });
      append(echoed);
    } else run(prepared.commands, [], echoed);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { history } = shell;

    if (e.key === "Enter") {
      e.preventDefault();
      submit(input);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (pending || !history.length) return;
      if (e.key === "ArrowUp") {
        const next = Math.max(0, (historyIndex ?? history.length) - 1);
        setHistoryIndex(next);
        setInput(history[next]);
      } else if (historyIndex !== null) {
        const next = historyIndex + 1;
        setHistoryIndex(next < history.length ? next : null);
        setInput(next < history.length ? history[next] : "");
      }
    } else if (e.ctrlKey && e.key === "c") {
      const el = e.currentTarget;
      if (el.selectionStart !== el.selectionEnd) return; // let the copy happen
      e.preventDefault();
      append([{ kind: "cmd", prompt: pending ? HEREDOC_PROMPT : PROMPT, text: `${input}^C` }]);
      setInput("");
      setPending(null);
      setHistoryIndex(null);
      shell.status = 130;
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setLines([]);
    } else if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      if (input) return;
      // End of input closes a heredoc early, or exits the shell.
      submit(pending ? pending.delimiters[pending.bodies.length] : "exit");
    } else if (e.key === "Tab" && input && !pending) {
      const completion = shell.complete(input);
      if (completion.input === input && !completion.options) return; // nothing to do, keep normal tab focus
      e.preventDefault();
      setInput(completion.input);
      if (completion.options) {
        append([
          { kind: "cmd", prompt: PROMPT, text: input },
          { kind: "out", text: completion.options.join("  ") },
        ]);
      }
    }
  };

  const focusInput = () => {
    if (window.getSelection()?.toString()) return; // don't break text selection
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={scrollRef}
      onClick={focusInput}
      className="h-full cursor-text overflow-y-auto px-[22px] py-5 font-mono text-[12.5px] leading-[1.85] text-body [scrollbar-color:rgba(255,255,255,.12)_transparent] [scrollbar-width:thin] [tab-size:4]"
    >
      <div role="log" aria-live="polite" aria-label="minishell output">
        {lines.map((line, i) =>
          line.kind === "cmd" ? (
            <div key={i} className="break-words whitespace-pre-wrap">
              <span className="text-green">{line.prompt}</span> <span className="text-hi">{line.text}</span>
            </div>
          ) : (
            <div key={i} className={`break-words whitespace-pre-wrap ${lineColor[line.kind]}`}>
              {line.text || " "}
            </div>
          ),
        )}
      </div>
      <label className="flex items-center gap-[1ch]">
        <span className="shrink-0 text-green">{pending ? HEREDOC_PROMPT : PROMPT}</span>
        <span className="relative flex min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHistoryIndex(null);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="minishell command"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            className="w-full bg-transparent p-0 text-hi caret-amber outline-none pointer-coarse:text-base"
          />
          {!focused && !input && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 h-[15px] w-2 animate-blink bg-hi motion-reduce:animate-none"
            />
          )}
        </span>
      </label>
    </div>
  );
}
