"use client";

import { useRef } from "react";
import { useAnimationClock, useLiveAnimation } from "@/lib/hooks";

const AMBER = "#f0b45a";
const X0 = 24;
const X1 = 345;
const ITERATIONS = 400;
const LEARNING_RATE = 0.5;
const DESCENT_MS = 4600;
const HOLD_MS = 1800;
const RUN_MS = DESCENT_MS + HOLD_MS;
// Deliberately wrong start (opposite slope) so the descent is visible.
const START = { t0: 140, t1: -100 };

// Seeded LCG so the scatter is identical on every build.
let seed = 7;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const points = Array.from({ length: 26 }, () => {
  const x = 30 + rnd() * 300;
  return { x, y: 30 + (x - 30) * 0.42 + (rnd() - 0.5) * 44 };
});

// Like the project: normalize the feature, then run batch gradient descent on θ₀ + θ₁·x.
const normalize = (x: number) => (x - 30) / 300;
const steps: { t0: number; t1: number; cost: number }[] = [];
{
  let { t0, t1 } = START;
  for (let i = 0; i <= ITERATIONS; i++) {
    let g0 = 0;
    let g1 = 0;
    let cost = 0;
    for (const p of points) {
      const xn = normalize(p.x);
      const err = t0 + t1 * xn - p.y;
      g0 += err;
      g1 += err * xn;
      cost += err * err;
    }
    steps.push({ t0, t1, cost: cost / (2 * points.length) });
    t0 -= (LEARNING_RATE * g0) / points.length;
    t1 -= (LEARNING_RATE * g1) / points.length;
  }
}

export function RegressionPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useAnimationClock(useLiveAnimation(ref));
  // Before the first frame (or with reduced motion) show the converged fit.
  // Squared time spends longer on the early iterations, where the line moves the most.
  const progress = Math.min(1, (t % RUN_MS) / DESCENT_MS);
  const iteration = t === 0 ? ITERATIONS : Math.round(ITERATIONS * progress * progress);
  const { t0, t1, cost } = steps[iteration];
  const predict = (x: number) => t0 + t1 * normalize(x);

  return (
    <div ref={ref} className="h-full px-4 py-3.5" aria-hidden>
      <svg viewBox="0 0 360 170" className="size-full">
        <defs>
          <clipPath id="regression-plot">
            <rect x={20} y={0} width={340} height={160} />
          </clipPath>
        </defs>
        <line x1={20} y1={160} x2={350} y2={160} stroke="rgba(255,255,255,.12)" />
        <line x1={20} y1={10} x2={20} y2={160} stroke="rgba(255,255,255,.12)" />
        <g clipPath="url(#regression-plot)">
          {points.map((p, i) => (
            <line
              key={`r${i}`}
              x1={p.x}
              y1={p.y}
              x2={p.x}
              y2={predict(p.x)}
              stroke="rgba(240,180,90,.22)"
              strokeDasharray="2 3"
            />
          ))}
          <line x1={X0} y1={predict(X0)} x2={X1} y2={predict(X1)} stroke={AMBER} strokeWidth={2} />
        </g>
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#a39e95" />
        ))}
        <text x={230} y={40} fill={AMBER} fontSize={11} className="font-mono">
          θ₀ + θ₁·km
        </text>
        <text x={30} y={150} fill="#6f6a62" fontSize={10} className="font-mono">
          iter <tspan fill="#ece9e4">{String(iteration).padStart(3, "0")}</tspan>
          <tspan dx={12}>cost </tspan>
          <tspan fill="#ece9e4">{cost.toFixed(1)}</tspan>
        </text>
      </svg>
    </div>
  );
}
