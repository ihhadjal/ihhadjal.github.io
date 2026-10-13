import { Projects } from "@/components/Projects";
import { SectionNav } from "@/components/SectionNav";
import { Spotlight } from "@/components/Spotlight";
import { Hi, SectionLabel, TagList } from "@/components/ui";
import { contact, experienceTags, skills } from "@/lib/content";

const rowHover = "-mx-6 grid grid-cols-1 gap-x-7 gap-y-2 rounded-xl p-6 transition-colors duration-200 hover:bg-white/3 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)]";

function Sidebar() {
  return (
    <header className="flex flex-none flex-col justify-between pt-16 lg:sticky lg:top-0 lg:h-screen lg:w-[40%] lg:py-24">
      <div>
        <div className="flex items-center gap-2.5 font-mono text-xs tracking-[.04em] text-muted">
          Full Stack Developer @ GPI France · Nice
        </div>
        <h1 className="mt-[22px] text-[clamp(40px,5vw,56px)] leading-[1.02] font-semibold tracking-[-.035em] text-hi">
          Iheb Hadjali
        </h1>
        <p className="mt-3.5 text-xl font-medium tracking-[-.01em] text-mid">
          Software engineer — backend, machine learning &amp; AI
        </p>
        <p className="mt-4 max-w-[340px] text-pretty">
          I build backend systems that hold up in production, and machine-learning models from the math up.
        </p>
        <SectionNav />
      </div>
      <div className="mt-10 flex flex-wrap gap-5 font-mono text-[13px]">
        <a href={contact.github} target="_blank" rel="noreferrer">
          github ↗
        </a>
        <a href={contact.linkedin} target="_blank" rel="noreferrer">
          linkedin ↗
        </a>
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
        <a href={contact.phone.href}>{contact.phone.display}</a>
      </div>
    </header>
  );
}

function About() {
  return (
    <section id="about" className="max-w-[620px] scroll-mt-24">
      <SectionLabel>About</SectionLabel>
      <p className="mb-4 text-pretty">
        Software engineer focused on <Hi>backend development</Hi>, <Hi>machine learning</Hi>, and{" "}
        <Hi>artificial intelligence</Hi>. Hands-on experience modernizing production backend systems, designing and
        implementing REST APIs, building machine learning models from scratch, and processing complex scientific
        datasets.
      </p>
      <p className="mb-4 text-pretty">
        I&apos;m currently in the Master&apos;s-level Data Architecture &amp; Engineering track at <Hi>École 42 Nice</Hi>,
        a project-based curriculum where I&apos;m specializing in ML, AI and data engineering. Strong interest in
        developing scalable software solutions and applying AI to real-world challenges.
      </p>
      <p className="text-sm text-muted">Arabic · Italian · French · English (C2)</p>
    </section>
  );
}

function Experience() {
  return (
    <section id="experience" className="mt-28 max-w-[680px] scroll-mt-24">
      <SectionLabel className="mb-7">Experience</SectionLabel>
      <div className={rowHover}>
        <div className="pt-1 font-mono text-xs text-muted">MAY 2026 — NOW</div>
        <div>
          <h3 className="text-[17px] font-semibold text-hi">Full Stack Developer · GPI France</h3>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-[18px] text-[15px] text-pretty">
            <li>
              Modernized a legacy healthcare backend by migrating stateful Java workflows to stateless Spring Boot REST
              services, improving maintainability, API consistency and separation of concerns
            </li>
            <li>
              Analyzed legacy Struts2 and Hibernate code to extract reusable business logic from UI and session
              infrastructure and redesign it into testable service-layer components.
            </li>
            <li>
              Designed and delivered hundreds of REST endpoints covering CRUD operations, relational validation, file
              imports and complex business rules including cascade operations, reference-cycle detection and
              proprietary data decoding.
            </li>
          </ul>
          <TagList tags={experienceTags} />
        </div>
      </div>
      <div className={rowHover}>
        <div className="pt-1 font-mono text-xs text-muted">IN PROGRESS</div>
        <div>
          <h3 className="text-[17px] font-semibold text-hi">Data Architecture &amp; Engineering · École 42 Nice</h3>
          <p className="mt-2.5 text-[15px] text-pretty">
            Foundations in algorithms, Python, C/C++, backend development, Unix systems, networking, data processing
            and machine-learning fundamentals.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stack() {
  return (
    <section id="skills" className="mt-28 max-w-[680px] scroll-mt-24">
      <SectionLabel className="mb-6">Stack</SectionLabel>
      <div className="flex flex-col">
        {skills.map((s) => (
          <div
            key={s.k}
            className="grid grid-cols-1 gap-x-6 gap-y-1 border-t sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)] sm:gap-y-6 border-white/7 py-4"
          >
            <div className="pt-0.5 font-mono text-xs text-muted">{s.k}</div>
            <div className="text-[15px] text-mid">{s.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Spotlight />
      <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col px-6 lg:flex-row lg:gap-16 lg:px-12">
        <Sidebar />
        <main className="min-w-0 flex-1 py-16 lg:py-24">
          <About />
          <Experience />
          <Projects />
          <Stack />
          <footer className="mt-24 max-w-[520px] text-[13px] text-muted">
            Designed &amp; built by Iheb Hadjali · Nice, France.
          </footer>
        </main>
      </div>
    </div>
  );
}
