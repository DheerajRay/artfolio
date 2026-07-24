"use client";

import { useEffect, useRef, useState } from "react";

type Project = {
  id: string;
  title: string;
  kind: string;
  year: string;
  image: string;
  imageAlt: string;
  accent: string;
  blurb: string;
};

// Mock content for the first visual prototype.
// This array is intentionally shaped so it can later come from the artwork input system.
const projects: Project[] = [
  {
    id: "01",
    title: "Soft Collision",
    kind: "Painting / Series",
    year: "2026",
    image: "https://picsum.photos/seed/soft-collision/1400/1800",
    imageAlt: "Dummy artwork for Soft Collision",
    accent: "#ff4f2e",
    blurb: "Color fields meet, resist, and begin to behave like weather.",
  },
  {
    id: "02",
    title: "False Spring",
    kind: "Mixed Media",
    year: "2026",
    image: "https://picsum.photos/seed/false-spring/1800/1200",
    imageAlt: "Dummy artwork for False Spring",
    accent: "#c7ff35",
    blurb: "A bright season arrives too early and leaves evidence everywhere.",
  },
  {
    id: "03",
    title: "Loud Silence",
    kind: "Digital / Moving Image",
    year: "2025",
    image: "https://picsum.photos/seed/loud-silence/1400/1700",
    imageAlt: "Dummy artwork for Loud Silence",
    accent: "#6158ff",
    blurb: "An image system built from interruption, repetition, and withheld sound.",
  },
  {
    id: "04",
    title: "Common Ground",
    kind: "Painting / Diptych",
    year: "2025",
    image: "https://picsum.photos/seed/common-ground/1800/1300",
    imageAlt: "Dummy artwork for Common Ground",
    accent: "#ffca28",
    blurb: "Two surfaces attempt to share the same horizon.",
  },
  {
    id: "05",
    title: "Body Electric",
    kind: "Study / Works on Paper",
    year: "2024",
    image: "https://picsum.photos/seed/body-electric/1300/1800",
    imageAlt: "Dummy artwork for Body Electric",
    accent: "#ee6ba7",
    blurb: "Fast notes on gesture, appetite, and the charge held in a line.",
  },
  {
    id: "06",
    title: "After Image",
    kind: "Installation",
    year: "2024",
    image: "https://picsum.photos/seed/after-image/1800/1200",
    imageAlt: "Dummy artwork for After Image",
    accent: "#50d6c5",
    blurb: "What the eye keeps after the object has left the room.",
  },
];

export default function Home() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accent, setAccent] = useState("#ff4f2e");
  const [progress, setProgress] = useState(0);
  const [cursorLabel, setCursorLabel] = useState("View");
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateProgress = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? window.scrollY / total : 0);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  useEffect(() => {
    document.body.style.overflow = activeProject || menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeProject, menuOpen]);

  const moveCursor = (event: React.PointerEvent<HTMLElement>) => {
    if (!cursorRef.current) return;
    cursorRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  };

  return (
    <main
      className="portfolio"
      style={{ "--accent": accent } as React.CSSProperties}
      onPointerMove={moveCursor}
    >
      <div className="custom-cursor" ref={cursorRef} aria-hidden="true">
        {cursorLabel}
      </div>

      <header className="portfolio-header">
        <a href="#top" className="identity" aria-label="Noa Kline home">
          NOA KLINE<sup>®</sup>
        </a>
        <p className="header-role">
          Visual artist &amp;<br />image maker
        </p>
        <nav className="top-nav" aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="mailto:hello@example.com">Let&apos;s talk ↗</a>
        </nav>
        <button className="mobile-nav-button" onClick={() => setMenuOpen(true)}>
          Menu
        </button>
      </header>

      <section className="portfolio-hero" id="top">
        <div className="hero-orbit orbit-one" aria-hidden="true">NEW WORK / 2026 / NEW WORK / 2026 /</div>
        <div className="hero-orbit orbit-two" aria-hidden="true">PAINT / PIXELS / PAPER / LIGHT /</div>

        <div className="hero-copy">
          <span className="hero-intro">Independent artist exploring<br />the emotional life of color.</span>
          <h1>
            <span>NOA</span>
            <span className="outline-word">KLINE</span>
          </h1>
        </div>

        <div className="hero-images" aria-label="Featured dummy artwork montage">
          <button
            className="floating-image image-one"
            onClick={() => setActiveProject(projects[0])}
            onPointerEnter={() => { setCursorLabel("Open"); setAccent(projects[0].accent); }}
            onPointerLeave={() => setCursorLabel("View")}
          >
            <img src={projects[0].image} alt={projects[0].imageAlt} />
          </button>
          <button
            className="floating-image image-two"
            onClick={() => setActiveProject(projects[2])}
            onPointerEnter={() => { setCursorLabel("Open"); setAccent(projects[2].accent); }}
            onPointerLeave={() => setCursorLabel("View")}
          >
            <img src={projects[2].image} alt={projects[2].imageAlt} />
          </button>
          <button
            className="floating-image image-three"
            onClick={() => setActiveProject(projects[4])}
            onPointerEnter={() => { setCursorLabel("Open"); setAccent(projects[4].accent); }}
            onPointerLeave={() => setCursorLabel("View")}
          >
            <img src={projects[4].image} alt={projects[4].imageAlt} />
          </button>
        </div>

        <div className="hero-foot">
          <a href="#work">Scroll to explore <span>↓</span></a>
          <span>Available for commissions<br />&amp; selected collaborations</span>
        </div>
      </section>

      <section className="ticker" aria-label="Selected work">
        <div>
          <span>Selected work</span><i>✦</i><span>Selected work</span><i>✦</i>
          <span>Selected work</span><i>✦</i><span>Selected work</span><i>✦</i>
        </div>
      </section>

      <section className="work-section" id="work">
        <div className="work-heading">
          <span>(01—06)</span>
          <h2>Recent<br /><em>obsessions</em></h2>
          <p>Projects, fragments, and ongoing experiments. Click anywhere that feels interesting.</p>
        </div>

        <div className="project-list">
          {projects.map((project, index) => (
            <article
              className={`project project-${(index % 3) + 1}`}
              key={project.id}
              onPointerEnter={() => {
                setAccent(project.accent);
                setCursorLabel("Open");
              }}
              onPointerLeave={() => setCursorLabel("View")}
            >
              <button className="project-image" onClick={() => setActiveProject(project)}>
                <img src={project.image} alt={project.imageAlt} loading={index > 1 ? "lazy" : "eager"} />
                <span className="image-no">{project.id}</span>
                <span className="image-action">Open project ↗</span>
              </button>
              <button className="project-meta" onClick={() => setActiveProject(project)}>
                <div>
                  <span>{project.kind}</span>
                  <span>{project.year}</span>
                </div>
                <h3>{project.title}</h3>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto" id="about">
        <div className="manifesto-stamp" aria-hidden="true">
          <span>NK</span>
          <small>EST. 2020</small>
        </div>
        <p className="manifesto-label">A little about me</p>
        <h2>
          I make work for the moment when
          <em> certainty becomes curiosity.</em>
        </h2>
        <div className="manifesto-bottom">
          <p>
            NOA KLINE is the placeholder identity for this first mockup. This space
            will become your personal world—your name, voice, process, and work—without
            losing the movement and surprise of the prototype.
          </p>
          <a href="mailto:hello@example.com">More about the practice ↗</a>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <p>Have an idea, a wall, or a strange proposition?</p>
        <a href="mailto:hello@example.com">
          Let&apos;s make<br /><em>something happen.</em>
          <span>↗</span>
        </a>
        <div className="contact-meta">
          <span>Based somewhere on Earth</span>
          <div><a href="#">Instagram ↗</a><a href="#">Are.na ↗</a><a href="#">Email ↗</a></div>
          <span>© 2026 NOA KLINE</span>
        </div>
      </section>

      <div className="scroll-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      {activeProject && (
        <div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" onClick={() => setActiveProject(null)}>
            Close <span>×</span>
          </button>
          <div className="modal-image-wrap">
            <img src={activeProject.image} alt={activeProject.imageAlt} />
          </div>
          <div className="modal-copy">
            <div className="modal-index">
              <span>Project {activeProject.id}</span>
              <span>{activeProject.year}</span>
            </div>
            <h2 id="modal-title">{activeProject.title}</h2>
            <p>{activeProject.blurb}</p>
            <dl>
              <div><dt>Type</dt><dd>{activeProject.kind}</dd></div>
              <div><dt>Status</dt><dd>Selected work</dd></div>
            </dl>
            <a href="mailto:hello@example.com">Ask about this work ↗</a>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="portfolio-menu" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="menu-top">
            <span>NOA KLINE®</span>
            <button onClick={() => setMenuOpen(false)}>Close ×</button>
          </div>
          <nav>
            <a href="#work" onClick={() => setMenuOpen(false)}>Work <sup>01</sup></a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About <sup>02</sup></a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact <sup>03</sup></a>
          </nav>
          <p>Color, memory, material, and whatever comes next.</p>
        </div>
      )}
    </main>
  );
}
