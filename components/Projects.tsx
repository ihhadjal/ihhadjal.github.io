import { type Project, projectMeta, projects } from "@/lib/content";
import { ChatPreview } from "./previews/ChatPreview";
import { DslrPreview } from "./previews/DslrPreview";
import { EegPreview } from "./previews/EegPreview";
import { MinishellTerminal } from "./previews/MinishellTerminal";
import { NeuralNetPreview } from "./previews/NeuralNetPreview";
import { PongPreview } from "./previews/PongPreview";
import { RegressionPreview } from "./previews/RegressionPreview";
import { SnakePreview } from "./previews/SnakePreview";
import { SectionLabel, TagList } from "./ui";

const previews: Record<string, React.ReactNode> = {
  "neural-network": <NeuralNetPreview />,
  "eeg-bci": <EegPreview />,
  learn2slither: <SnakePreview />,
  "mcp-server": <ChatPreview />,
  dslr: <DslrPreview />,
  ft_linear_regression: <RegressionPreview />,
  ft_transcendence: <PongPreview />,
  minishell: <MinishellTerminal />,
};

const featured = projects.filter((p) => p.badge === "FEATURED");
const secondary = projects.filter((p) => !p.badge);
const interactive = projects.filter((p) => p.badge === "INTERACTIVE");

const cardBase =
  "overflow-hidden rounded-2xl border border-white/7 bg-card transition-[border-color,transform] duration-250 hover:border-amber/35";

function ProjectTitle({ p }: { p: Project }) {
  if (!p.href) return <span className="text-hi">{p.title}</span>;
  return (
    <a href={p.href} target="_blank" rel="noreferrer">
      {p.title} ↗
    </a>
  );
}

function Meta({ p, size }: { p: Project; size: "sm" | "md" }) {
  return (
    <div className={`font-mono tracking-[.06em] text-muted ${size === "md" ? "text-[11.5px]" : "text-[11px]"}`}>
      {projectMeta(p)}
    </div>
  );
}

function PreviewFrame({ slug, height }: { slug: string; height: string }) {
  return <div className={`border-b border-white/6 bg-preview ${height}`}>{previews[slug]}</div>;
}

function FeaturedCard({ p }: { p: Project }) {
  return (
    <article className={`${cardBase} hover:-translate-y-0.5`}>
      <PreviewFrame slug={p.slug} height="h-[300px]" />
      <div className="px-7 pt-[26px] pb-7">
        <Meta p={p} size="md" />
        <h3 className="mt-2 text-2xl font-semibold tracking-[-.02em]">
          <ProjectTitle p={p} />
        </h3>
        <p className="mt-2.5 max-w-[620px] text-[15px] text-pretty">{p.description}</p>
        <TagList tags={p.tags} />
      </div>
    </article>
  );
}

function SecondaryBody({ p }: { p: Project }) {
  return (
    <>
      <Meta p={p} size="sm" />
      <h3 className="mt-1.5 text-lg font-semibold">
        <ProjectTitle p={p} />
      </h3>
      <p className="mt-2 text-sm text-pretty">{p.description}</p>
      <div className="mt-3 font-mono text-[11.5px] text-amber">{p.tags.join(" · ")}</div>
    </>
  );
}

function SecondaryCard({ p }: { p: Project }) {
  return (
    <article className={cardBase}>
      <PreviewFrame slug={p.slug} height="h-[190px]" />
      <div className="px-[22px] pt-5 pb-[22px]">
        <SecondaryBody p={p} />
      </div>
    </article>
  );
}

function InteractiveCard({ p }: { p: Project }) {
  return (
    <article className={`${cardBase} col-span-full focus-within:border-amber/35`}>
      <PreviewFrame slug={p.slug} height="h-[300px]" />
      <div className="px-[22px] pt-5 pb-[22px]">
        <SecondaryBody p={p} />
        <p className="mt-3 font-mono text-[11.5px] text-muted">
          ↑ a working shell — click the terminal and type <span className="text-hi">help</span>
        </p>
      </div>
    </article>
  );
}

export function Projects() {
  return (
    <section id="projects" className="mt-28 scroll-mt-24">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
        <SectionLabel className="">Projects — showroom</SectionLabel>
        <div className="font-mono text-xs text-muted">
          {String(projects.length).padStart(2, "0")} works · live previews
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {featured.map((p) => (
          <FeaturedCard key={p.slug} p={p} />
        ))}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-6">
          {secondary.map((p) => (
            <SecondaryCard key={p.slug} p={p} />
          ))}
          {interactive.map((p) => (
            <InteractiveCard key={p.slug} p={p} />
          ))}
        </div>
      </div>

      <a
        href="https://github.com/ihhadjal?tab=repositories"
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex items-center gap-2 font-semibold"
      >
        View all 18 repositories on GitHub <span className="text-amber">→</span>
      </a>
    </section>
  );
}
