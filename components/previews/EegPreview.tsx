"use client";

import { useRef } from "react";
import { useAnimationClock, useElementSize, useLiveAnimation } from "@/lib/hooks";

const AMBER = "#f0b45a";
const CHANNELS = ["C3", "Cz", "C4", "FC1", "CP2"];
const LABEL_W = 40;
const STEP = 3;
const SPEED = 0.035; // px per ms
const FIRST_EVENT = 110;
const EVENT_PERIOD = 230;
const EPOCH = 70;
const RAMP = 14;
// Imagining a left-hand movement suppresses the mu rhythm over the right motor cortex (C4), and vice versa.
const EVENTS = [
  { label: "T1 · left", channel: 2 },
  { label: "T2 · right", channel: 0 },
];

const eventAt = (n: number) => FIRST_EVENT + n * EVENT_PERIOD;

/** Amplitude factor: event-related desynchronization on the contralateral channel inside each epoch. */
function erd(channel: number, u: number) {
  const n = Math.floor((u - FIRST_EVENT) / EVENT_PERIOD);
  if (n < 0) return 1;
  const d = u - eventAt(n);
  if (d >= EPOCH || EVENTS[n % 2].channel !== channel) return 1;
  return 1 - 0.7 * Math.min(1, d / RAMP, (EPOCH - d) / RAMP);
}

export function EegPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const offset = useAnimationClock(useLiveAnimation(ref)) * SPEED;
  const { width: w, height: h } = useElementSize(ref, { width: 340, height: 160 });
  const rowH = h / CHANNELS.length;
  const scale = rowH / 30;

  const epochs = [];
  for (let n = Math.max(0, Math.floor((offset - EPOCH - FIRST_EVENT) / EVENT_PERIOD)); ; n++) {
    const x = eventAt(n) - offset + LABEL_W;
    if (x > w) break;
    epochs.push({ n, x });
  }

  return (
    <div className="h-full px-4 py-3.5" aria-hidden>
      <div ref={ref} className="size-full">
        <svg viewBox={`0 0 ${w} ${h}`} className="block size-full">
          <defs>
            <clipPath id="eeg-plot">
              <rect x={LABEL_W} y={0} width={w} height={h} />
            </clipPath>
          </defs>
          <g clipPath="url(#eeg-plot)">
            {epochs.map(({ n, x }) => (
              <g key={n}>
                <rect x={x} y={0} width={EPOCH} height={h} fill="rgba(240,180,90,.07)" />
                <text x={x + 5} y={11} fontSize={9} fill={AMBER} opacity={0.8} className="font-mono">
                  {EVENTS[n % 2].label}
                </text>
              </g>
            ))}
          </g>
          {CHANNELS.map((c, i) => {
            const base = rowH * (i + 0.5);
            let d = "";
            for (let x = LABEL_W; x <= w; x += STEP) {
              const u = x - LABEL_W + offset;
              const mu = Math.sin(u * 0.09 + i) * 4 + Math.sin(u * 0.31 + i * 2) * 3;
              const y = base + scale * (mu * erd(i, u) + Math.sin(u * 1.7 + i * 5) * 1.5);
              d += `${x === LABEL_W ? "M" : "L"}${x},${y.toFixed(1)}`;
            }
            const highlighted = i === 0 || i === 2;
            return (
              <g key={c}>
                <text x={0} y={base + 3.5} fill="#6f6a62" fontSize={10} className="font-mono">
                  {c}
                </text>
                <path
                  d={d}
                  fill="none"
                  stroke={highlighted ? AMBER : "#a39e95"}
                  strokeWidth={1.1}
                  opacity={highlighted ? 1 : 0.55}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
