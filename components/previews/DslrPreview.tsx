"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveAnimation } from "@/lib/hooks";

const HOUSES = [
  { name: "Gryffindor", color: "#c9614a" },
  { name: "Slytherin", color: "#6aa37a" },
  { name: "Ravenclaw", color: "#6c8fc9" },
  { name: "Hufflepuff", color: "#f0b45a" },
];
const FIRST_STUDENT = [0.82, 0.64, 0.91, 0.73];
const TICK_MS = 2200;
const TEST_SET_SIZE = 400;

/** Deterministic PRNG so each student always gets the same scores. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One sigmoid output per one-vs-all classifier; the most confident one sorts the student. */
function scores(student: number) {
  if (student === 0) return FIRST_STUDENT;
  const rnd = mulberry32(student * 7919 + 1);
  const winner = Math.floor(rnd() * HOUSES.length);
  return HOUSES.map((_, i) => (i === winner ? 0.8 + rnd() * 0.18 : 0.06 + rnd() * 0.62));
}

export function DslrPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLiveAnimation(ref);
  const [student, setStudent] = useState(0);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setStudent((s) => s + 1), TICK_MS);
    return () => clearInterval(id);
  }, [live]);

  const probs = scores(student);
  const winner = probs.indexOf(Math.max(...probs));

  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-2.5 px-6 py-[18px]" aria-hidden>
      <div className="mb-1 flex justify-between font-mono text-[11px] text-muted">
        <span>
          student <span className="text-hi">#{String((student % TEST_SET_SIZE) + 1).padStart(3, "0")}</span>
        </span>
        <span style={{ color: HOUSES[winner].color }}>→ {HOUSES[winner].name}</span>
      </div>
      {HOUSES.map((h, i) => (
        <div
          key={h.name}
          className="grid grid-cols-[86px_minmax(0,1fr)_32px] items-center gap-3 font-mono text-[11.5px] text-body"
        >
          <span>{h.name}</span>
          <div
            className="h-3 rounded-[3px] transition-[width,opacity] duration-700 ease-out"
            style={{
              width: `${probs[i] * 100}%`,
              background: h.color,
              opacity: student === 0 || i === winner ? 1 : 0.45,
            }}
          />
          <span className={`text-right ${i === winner ? "text-hi" : "text-muted"}`}>{probs[i].toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
