"use client";

import { useEffect, useState } from "react";
import { sections } from "@/lib/content";
import { usePrefersReducedMotion } from "@/lib/hooks";

const OFFSET = 96;

export function SectionNav() {
  const [active, setActive] = useState<string>(sections[0].id);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      let current: string = sections[0].id;
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - OFFSET,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <nav aria-label="Sections" className="mt-14 hidden flex-col gap-1 lg:flex">
      {sections.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            onClick={go(id)}
            aria-current={isActive ? "true" : undefined}
            className={`flex items-center gap-4 py-2 font-mono text-xs tracking-[.12em] uppercase ${
              isActive ? "text-hi" : "text-muted"
            }`}
          >
            <span
              className={`h-px transition-[width] duration-250 ${isActive ? "w-16 bg-hi" : "w-8 bg-muted"}`}
            />
            {label}
          </a>
        );
      })}
    </nav>
  );
}
