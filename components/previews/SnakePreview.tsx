"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveAnimation } from "@/lib/hooks";

type Cell = { x: number; y: number };
type Game = { snake: Cell[]; apple: Cell; episode: number };

const W = 18;
const H = 10;
const TICK_MS = 150;
const EXPLORATION = 0.08;
const MAX_LENGTH = 26;
const START: Cell[] = [
  { x: 5, y: 5 },
  { x: 4, y: 5 },
  { x: 3, y: 5 },
];
const MOVES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const dist = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Greedy move toward the apple, with an ε-greedy random move. */
function step({ snake, apple, episode }: Game): Game {
  const head = snake[0];
  const body = snake.slice(0, -1);
  const options = MOVES.map(([dx, dy]) => ({ x: head.x + dx, y: head.y + dy })).filter(
    (c) => c.x >= 0 && c.y >= 0 && c.x < W && c.y < H && !body.some((b) => same(b, c)),
  );
  if (!options.length || snake.length > MAX_LENGTH) return { snake: START, apple, episode: episode + 1 };

  options.sort((a, b) => dist(a, apple) - dist(b, apple));
  const next = Math.random() < EXPLORATION ? options[options.length - 1] : options[0];
  const ate = same(next, apple);
  const nextSnake = [next, ...snake];
  if (!ate) nextSnake.pop();

  let nextApple = apple;
  if (ate) {
    do {
      nextApple = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) };
    } while (nextSnake.some((b) => same(b, nextApple)));
  }
  return { snake: nextSnake, apple: nextApple, episode };
}

function cellColor(game: Game, x: number, y: number) {
  const i = game.snake.findIndex((s) => s.x === x && s.y === y);
  if (i === 0) return "#ece9e4";
  if (i > 0) return `rgba(143,209,138,${Math.max(0.25, 1 - i * 0.04)})`;
  if (game.apple.x === x && game.apple.y === y) return "#f0b45a";
  return "#181816";
}

export function SnakePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLiveAnimation(ref);
  const [game, setGame] = useState<Game>({ snake: START, apple: { x: 12, y: 4 }, episode: 142 });

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setGame(step), TICK_MS);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div ref={ref} className="relative flex h-full items-center justify-center px-4" aria-hidden>
      <div className="grid w-full max-w-[375px] grid-cols-[repeat(18,minmax(0,1fr))] gap-[3px]">
        {Array.from({ length: W * H }, (_, n) => (
          <div
            key={n}
            className="aspect-square rounded-[4px]"
            style={{ background: cellColor(game, n % W, Math.floor(n / W)) }}
          />
        ))}
      </div>
      <div className="absolute top-4 left-[18px] flex gap-[18px] font-mono text-[11.5px] text-muted">
        <span>
          episode <span className="text-hi">{game.episode}</span>
        </span>
        <span>
          length <span className="text-hi">{game.snake.length}</span>
        </span>
        <span className="hidden sm:inline">
          policy <span className="text-green">ε-greedy</span>
        </span>
      </div>
      <div className="absolute top-4 right-[18px] font-mono text-[11.5px] text-amber">live agent</div>
    </div>
  );
}
