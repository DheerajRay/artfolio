"use client";

import { useEffect, useRef, useState } from "react";

type Artwork = {
  id: string;
  title: string;
  year: string;
  medium: string;
  description: string;
  background: string;
  foreground: string;
  variant: string;
};

const artworks: Artwork[] = [
  {
    id: "01",
    title: "When the Sun Forgets",
    year: "2026",
    medium: "Oil, pigment and graphite",
    description: "A study of warmth disappearing slowly—held between a remembered landscape and an invented horizon.",
    background: "#D94A2E",
    foreground: "#191511",
    variant: "sun",
  },
  {
    id: "02",
    title: "Blue Has No Distance",
    year: "2026",
    medium: "Acrylic and wax on canvas",
    description: "Blue becomes atmosphere, object, and interruption. Part of an ongoing series about impossible depth.",
    background: "#2338A2",
    foreground: "#F1EEE6",
    variant: "blue",
  },
  {
    id: "03",
    title: "Things We Almost Said",
    year: "2025",
    medium: "Mixed media on linen",
    description: "Fragments gather without resolving—a conversation reconstructed from gesture, pressure and erased marks.",
    background: "#D9CFB6",
    foreground: "#171612",
    variant: "said",
  },
  {
    id: "04",
    title: "A Small Electric Weather",
    year: "2025",
    medium: "Digital composition",
    description: "A weather system built from signal and color, moving between the synthetic and the strangely familiar.",
    background: "#C9F03A",
    foreground: "#171612",
    variant: "electric",
  },
  {
    id: "05",
    title: "Night Holds Everything",
    year: "2024",
    medium: "Oil and charcoal on panel",
    description: "Darkness is treated as material rather than absence: layered, scraped back, and allowed to hold the image.",
    background: "#17181C",
    foreground: "#E8DDD0",
    variant: "night",
  },
];

function ArtworkVisual({ artwork }: { artwork: Artwork }) {
  return (
    <div className={`artwork-visual visual-${artwork.variant}`} aria-label={`Dummy artwork for ${artwork.title}`} role="img">
      <span className="form form-a" />
      <span className="form form-b" />
      <span className="form form-c" />
      <span className="form form-d" />
      <span className="mark mark-a" />
      <span className="mark mark-b" />
    </div>
  );
}

export default function Home() {
  const [current, setCurrent] = useState(0);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        setCurrent(index);
        document.documentElement.style.background = artworks[index].background;
      },
      { threshold: [0.45, 0.7, 0.9] }
    );

    slideRefs.current.forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(artworks.length - 1, current + direction));
      slideRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current]);

  return (
    <main className="presentation">
      {artworks.map((artwork, index) => (
        <section
          key={artwork.id}
          ref={(node) => { slideRefs.current[index] = node; }}
          className="art-slide"
          data-index={index}
          style={{
            "--slide-bg": artwork.background,
            "--slide-fg": artwork.foreground,
          } as React.CSSProperties}
          aria-label={`${artwork.title}, artwork ${index + 1} of ${artworks.length}`}
        >
          <div className="slide-index">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>/</span>
            <span>{String(artworks.length).padStart(2, "0")}</span>
          </div>

          <div className="slide-top-right">
            <p className="artist-name">Dheeraj Ray</p>
            <div className="title-block">
              <span>{artwork.year}</span>
              <h1>{artwork.title}</h1>
            </div>
          </div>

          <ArtworkVisual artwork={artwork} />

          <button
            className="scroll-suggestion"
            onClick={() => slideRefs.current[Math.min(index + 1, artworks.length - 1)]?.scrollIntoView({ behavior: "smooth" })}
            disabled={index === artworks.length - 1}
            aria-label={index === artworks.length - 1 ? "Final artwork" : "Scroll to next artwork"}
          >
            <span>{index === artworks.length - 1 ? "End of selection" : "Scroll to next work"}</span>
            <i aria-hidden="true">{index === artworks.length - 1 ? "—" : "↓"}</i>
          </button>

          <div className="artwork-description">
            <span>{artwork.medium}</span>
            <p>{artwork.description}</p>
          </div>

          <div className="side-progress" aria-hidden="true">
            {artworks.map((_, dotIndex) => (
              <span key={dotIndex} className={dotIndex === index ? "active" : ""} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
