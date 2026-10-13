"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveAnimation } from "@/lib/hooks";

/** Positions are percentages of the court. l / r are paddle centers, sl / sr the scores. */
type Pong = { x: number; y: number; vx: number; vy: number; l: number; r: number; sl: number; sr: number };

const TICK_MS = 50;
const PADDLE_REACH = 13;

function step(p: Pong): Pong {
  let { x, y, vx, vy, l, r, sl, sr } = p;
  x += vx;
  y += vy;
  if (y < 4 || y > 96) vy = -vy;
  if (x < 6) {
    if (Math.abs(y - l) < PADDLE_REACH) vx = Math.abs(vx);
    else {
      sr++;
      x = 50;
      y = 50;
    }
  }
  if (x > 94) {
    if (Math.abs(y - r) < PADDLE_REACH) vx = -Math.abs(vx);
    else {
      sl++;
      x = 50;
      y = 50;
    }
  }
  // Each AI tracks the ball hard when it's coming its way, and drifts otherwise.
  l += (y - l) * (vx < 0 ? 0.09 : 0.02);
  r += (y - r) * (vx > 0 ? 0.08 : 0.02);
  return { x, y, vx, vy, l, r, sl: sl % 10, sr: sr % 10 };
}

export function PongPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLiveAnimation(ref);
  const [p, setP] = useState<Pong>({ x: 50, y: 50, vx: 1.6, vy: 1.1, l: 50, r: 50, sl: 3, sr: 2 });

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setP(step), TICK_MS);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div ref={ref} className="relative h-full overflow-hidden" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-white/8" />
      <div className="absolute inset-x-0 top-[22px] flex justify-center gap-16 font-mono text-[40px] font-medium text-hi/18">
        <span>{p.sl}</span>
        <span>{p.sr}</span>
      </div>
      <div
        className="absolute left-[4%] h-[22%] -translate-y-1/2 w-2 rounded bg-hi"
        style={{ top: `${p.l}%` }}
      />
      <div
        className="absolute right-[4%] h-[22%] -translate-y-1/2 w-2 rounded bg-amber"
        style={{ top: `${p.r}%` }}
      />
      <div
        className="absolute -mt-1.5 -ml-1.5 size-3 rounded-[3px] bg-hi shadow-[0_0_18px_rgba(236,233,228,.5)]"
        style={{ left: `${p.x}%`, top: `${p.y}%` }}
      />
      <div className="absolute bottom-3.5 left-[18px] font-mono text-[11.5px] text-muted">ws://pong · realtime match</div>
    </div>
  );
}
