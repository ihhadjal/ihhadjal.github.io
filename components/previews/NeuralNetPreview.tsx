"use client";

import { useRef } from "react";
import { useAnimationClock, useLiveAnimation } from "@/lib/hooks";

const AMBER = "#f0b45a";
const GREEN = "#8fd18a";
const LAYERS = [4, 6, 6, 2];
const OUTPUT = LAYERS.length - 1;
const OUTPUT_LABELS = ["B", "M"]; // benign / malignant
const STAGE_MS = 520;
// 0–2: forward pass, one layer per stage · 3: softmax output · 4–6: backpropagation · 7: rest
const STAGES = 8;
const PASS_MS = STAGE_MS * STAGES;

const X = (i: number) => 30 + i * 100;
const Y = (n: number, j: number) => 85 + (j - (n - 1) / 2) * 26;

const edges = LAYERS.slice(0, -1).flatMap((n, i) =>
  Array.from({ length: n }, (_, j) =>
    Array.from({ length: LAYERS[i + 1] }, (_, k) => ({
      i,
      j,
      k,
      x1: X(i),
      y1: Y(n, j),
      x2: X(i + 1),
      y2: Y(LAYERS[i + 1], k),
    })),
  ).flat(),
);

const ease = (f: number) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);

/** Amber blended over the preview background, opaque so edges don't show through the nodes. */
const nodeFill = (level: number) => {
  const mix = (from: number, to: number) => Math.round(from + (to - from) * level);
  return `rgb(${mix(13, 240)},${mix(13, 180)},${mix(12, 90)})`;
};

export function NeuralNetPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useAnimationClock(useLiveAnimation(ref));
  const started = t > 0;

  const pass = Math.floor(t / PASS_MS);
  const progress = (t % PASS_MS) / STAGE_MS;
  const stage = Math.floor(progress);
  const f = ease(progress - stage);
  const forwardLayer = stage <= 2 ? stage : -1;
  const backwardLayer = stage >= 4 && stage <= 6 ? 6 - stage : -1;
  const winner = pass % 3 === 2 ? 1 : 0;
  const loss = 0.03 + 0.66 * Math.exp(-pass / 6);

  // Each pass routes the signal through a different subset of weights.
  const active = (j: number, k: number) => (j + k + pass) % 4 === 0;

  const edgeStroke = (e: (typeof edges)[number]) => {
    if (!active(e.j, e.k)) return "rgba(255,255,255,.08)";
    if (e.i === forwardLayer) return "rgba(240,180,90,.9)";
    if (e.i === backwardLayer) return "rgba(143,209,138,.75)";
    return started ? "rgba(240,180,90,.22)" : "rgba(240,180,90,.45)";
  };

  const nodeLevel = (i: number, j: number) => {
    if (!started) return i === OUTPUT ? 1 : 0;
    if (i === OUTPUT) {
      if (stage === 3) return j === winner ? 1 : 0.15;
      return stage > 3 && stage < 7 && j === winner ? 0.35 : 0;
    }
    const fed = i === 0 || edges.some((e) => e.i === i - 1 && e.k === j && active(e.j, e.k));
    if (!fed || stage === 7) return 0;
    if (stage === i) return 1;
    return stage > i ? 0.3 : 0;
  };

  const pulses = edges
    .filter((e) => active(e.j, e.k) && (e.i === forwardLayer || e.i === backwardLayer))
    .map((e) => {
      const forward = e.i === forwardLayer;
      const s = forward ? f : 1 - f;
      return (
        <circle
          key={`p${e.i}-${e.j}-${e.k}`}
          cx={e.x1 + (e.x2 - e.x1) * s}
          cy={e.y1 + (e.y2 - e.y1) * s}
          r={2.6}
          fill={forward ? AMBER : GREEN}
        />
      );
    });

  return (
    <div ref={ref} className="relative flex h-full items-center justify-center px-4 pt-10 pb-4" aria-hidden>
      <svg viewBox="0 0 360 170" className="size-full">
        {edges.map((e) => (
          <line
            key={`l${e.i}-${e.j}-${e.k}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={edgeStroke(e)}
            strokeWidth={1}
          />
        ))}
        {pulses}
        {LAYERS.map((n, i) =>
          Array.from({ length: n }, (_, j) => {
            const level = nodeLevel(i, j);
            return (
              <circle
                key={`c${i}-${j}`}
                cx={X(i)}
                cy={Y(n, j)}
                r={6}
                fill={nodeFill(level)}
                stroke={level > 0 || i === OUTPUT ? AMBER : "#a39e95"}
                strokeWidth={1.5}
                style={{ transition: "fill .25s, stroke .25s" }}
              />
            );
          }),
        )}
        {OUTPUT_LABELS.map((label, j) => (
          <text
            key={label}
            x={X(OUTPUT) + 13}
            y={Y(2, j) + 3.5}
            fontSize={10}
            className="font-mono"
            fill={started && stage === 3 && j === winner ? AMBER : "#6f6a62"}
          >
            {label}
          </text>
        ))}
      </svg>
      <div className="absolute top-4 left-[18px] flex gap-[18px] font-mono text-[11.5px] text-muted">
        <span>
          epoch <span className="text-hi">{12 + pass}</span>
        </span>
        <span>
          loss <span className="text-hi">{loss.toFixed(3)}</span>
        </span>
        <span className="hidden sm:inline">
          {stage >= 4 && stage <= 6 ? (
            <span className="text-green">backprop</span>
          ) : (
            <span className="text-amber">forward</span>
          )}
        </span>
      </div>
      <div className="absolute top-4 right-[18px] font-mono text-[11.5px] text-amber">training</div>
    </div>
  );
}
