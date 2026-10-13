"use client";

import { useEffect, useRef } from "react";

const gradient = (x: string, y: string) =>
  `radial-gradient(560px circle at ${x} ${y}, rgba(240,180,90,.07), transparent 70%)`;

export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (ref.current) ref.current.style.background = gradient(`${e.clientX}px`, `${e.clientY}px`);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 pointer-coarse:hidden"
      style={{ background: gradient("50%", "30%") }}
    />
  );
}
