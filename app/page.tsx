"use client";

import { useEffect, useMemo, useState } from "react";

type Artwork = {
  id: number;
  title: string;
  year: string;
  category: "Paintings" | "Digital" | "Studies";
  medium: string;
  size: string;
  note: string;
  palette: string;
};

const artworks: Artwork[] = [
  { id: 1, title: "After the Flood", year: "2026", category: "Paintings", medium: "Oil, ash & pigment on linen", size: "180 × 140 cm", note: "A study of what remains after water recedes: silt, reflected light, and a memory that refuses to settle.", palette: "art-01" },
  { id: 2, title: "Soft Machinery", year: "2026", category: "Digital", medium: "Generative image, edition of 5", size: "4K variable", note: "Organic systems rehearse the movements of machines, then quietly forget the choreography.", palette: "art-02" },
  { id: 3, title: "Night Orchard", year: "2025", category: "Paintings", medium: "Oil and wax on canvas", size: "120 × 160 cm", note: "Fruit, shadow, and the electric blue of a place remembered incorrectly.", palette: "art-03" },
  { id: 4, title: "Mouth of the Sun", year: "2025", category: "Studies", medium: "Pastel and graphite on paper", size: "42 × 30 cm", note: "One of twenty-four chromatic notes made at the edge of the day.", palette: "art-04" },
  { id: 5, title: "Future Relic I", year: "2025", category: "Digital", medium: "3D composition and pigment print", size: "90 × 70 cm", note: "An artifact designed for an archaeology that has not happened yet.", palette: "art-05" },
  { id: 6, title: "Holding Weather", year: "2024", category: "Paintings", medium: "Acrylic and pumice on panel", size: "100 × 100 cm", note: "Atmosphere held briefly as matter: pressure, haze, and an approaching break.", palette: "art-06" },
  { id: 7, title: "Fault Line", year: "2024", category: "Studies", medium: "Ink, tape and found paper", size: "29 × 21 cm", note: "A small record of tension between two surfaces that appear to agree.", palette: "art-07" },
  { id: 8, title: "Signal / Bloom", year: "2024", category: "Digital", medium: "Real-time audiovisual work", size: "Duration 06:18", note: "A transmission gradually learns how to flower.", palette: "art-08" },
  { id: 9, title: "The Distance Between", year: "2023", category: "Paintings", medium: "Oil and sand on linen", size: "200 × 150 cm", note: "Two forms share a field without touching. The interval becomes the subject.", palette: "art-09" },
  { id: 10, title: "Red Index", year: "2023", category: "Studies", medium: "Gouache on archival cards", size: "Series of 18", note: "An attempt to catalogue a color by temperature, weight, and appetite.", palette: "art-10" },
  { id: 11, title: "Minor Moons", year: "2023", category: "Digital", medium: "Digital collage", size: "Variable", note: "Unimportant satellites, observed with disproportionate care.", palette: "art-11" },
  { id: 12, title: "Borrowed Ground", year: "2022", category: "Paintings", medium: "Earth, casein and linen", size: "150 × 110 cm", note: "A surface made from places the artist was only passing through.", palette: "art-12" },
];

const categories = ["All", "Paintings", "Digital", "Studies"] as const;

function Arrow({ direction = "right" }: { direction?: "right" | "down" }) {
  return <span aria-hidden="true">{direction === "right" ? "↗" : "↓"}</span>;
}

export default function Home() {
  const [filter, setFilter] = useState<(typeof categories)[number]>("All");
  const [view, setView] = useState<"gallery" | "index">("gallery");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [order, setOrder] = useState(artworks.map((work) => work.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("nova-saved");
    if (stored) setSaved(JSON.parse(stored));
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  useEffect(() => {
    localStorage.setItem("nova-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    document.body.style.overflow = selected || menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected, menuOpen]);

  const visibleWorks = useMemo(() => {
    const byOrder = order.map((id) => artworks.find((work) => work.id === id)!);
    return filter === "All" ? byOrder : byOrder.filter((work) => work.category === filter);
  }, [filter, order]);

  const shuffle = () => {
    setOrder((current) => {
      const next = [...current];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  };

  const toggleSaved = (id: number) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const install = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt as Event & { prompt: () => Promise<void> };
    await prompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="NOVA Studio home">
          NOVA<span>/</span>STUDIO
        </a>
        <p className="header-note">Independent artist<br />Somewhere, Earth</p>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#archive">Archive</a>
          <a href="#about">Practice</a>
          <a href="#contact">Contact <Arrow /></a>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">Menu</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker">
          <span>Selected works</span>
          <span>2022—2026</span>
        </div>
        <h1>A living archive<br />of <em>color, memory</em><br />& material.</h1>
        <div className="hero-stage" role="img" aria-label="A layered preview of selected abstract artworks">
          <button className="hero-piece hero-piece-a art-03" onClick={() => setSelected(artworks[2])} aria-label="Open Night Orchard"></button>
          <button className="hero-piece hero-piece-b art-01" onClick={() => setSelected(artworks[0])} aria-label="Open After the Flood"></button>
          <button className="hero-piece hero-piece-c art-08" onClick={() => setSelected(artworks[7])} aria-label="Open Signal Bloom"></button>
          <div className="hero-caption">
            <span>Current focus</span>
            <strong>After the Flood, 2026</strong>
            <small>Oil, ash & pigment on linen</small>
          </div>
        </div>
        <a className="scroll-cue" href="#archive"><span>Enter archive</span><Arrow direction="down" /></a>
      </section>

      <section className="archive" id="archive">
        <div className="section-intro">
          <p className="eyebrow">The archive / {String(visibleWorks.length).padStart(2, "0")} works</p>
          <h2>Look slowly.<br /><em>Follow instinct.</em></h2>
          <p className="intro-copy">Browse by medium, switch to the index, or shuffle the room. Every path through the work is allowed.</p>
        </div>

        <div className="archive-toolbar">
          <div className="filters" aria-label="Filter artworks">
            {categories.map((category) => (
              <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>
                {category}<sup>{category === "All" ? artworks.length : artworks.filter((work) => work.category === category).length}</sup>
              </button>
            ))}
          </div>
          <div className="view-actions">
            <button onClick={shuffle} className="shuffle-button">Shuffle <span aria-hidden="true">⟳</span></button>
            <div className="view-toggle" aria-label="Choose archive view">
              <button className={view === "gallery" ? "active" : ""} onClick={() => setView("gallery")} aria-label="Gallery view">Grid</button>
              <button className={view === "index" ? "active" : ""} onClick={() => setView("index")} aria-label="Index view">Index</button>
            </div>
          </div>
        </div>

        {view === "gallery" ? (
          <div className="art-grid">
            {visibleWorks.map((work, index) => (
              <article className={`work-card card-${(index % 6) + 1}`} key={work.id}>
                <button className={`artwork ${work.palette}`} onClick={() => setSelected(work)} aria-label={`View ${work.title}`}>
                  <span className="art-number">{String(work.id).padStart(2, "0")}</span>
                  <span className="art-open">View work <Arrow /></span>
                </button>
                <div className="work-meta">
                  <div><h3>{work.title}</h3><p>{work.medium}</p></div>
                  <span>{work.year}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="art-index">
            <div className="index-head"><span>No.</span><span>Work</span><span>Medium</span><span>Year</span><span></span></div>
            {visibleWorks.map((work) => (
              <button key={work.id} className="index-row" onClick={() => setSelected(work)}>
                <span>{String(work.id).padStart(2, "0")}</span>
                <strong>{work.title}</strong>
                <span>{work.medium}</span>
                <span>{work.year}</span>
                <Arrow />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="about" id="about">
        <p className="eyebrow">Practice / Artist statement</p>
        <div className="about-grid">
          <h2>Making images for<br />the <em>space between</em><br />knowing and feeling.</h2>
          <div className="about-copy">
            <p>NOVA / STUDIO is a multidisciplinary practice moving between painting, digital systems, and works on paper. Each piece begins as an experiment in attention.</p>
            <p>The archive is not chronological. It behaves more like memory: works surface, recede, and gather new meaning beside one another.</p>
            <a href="mailto:studio@example.com">Read the full statement <Arrow /></a>
          </div>
          <div className="studio-mark" aria-hidden="true"><span>N</span><span>—26</span></div>
        </div>
      </section>

      <footer id="contact">
        <div className="footer-lead"><span>Have a space in mind?</span><a href="mailto:studio@example.com">Let’s make<br />something <em>unfamiliar.</em> <Arrow /></a></div>
        <div className="footer-bottom">
          <div><strong>NOVA / STUDIO</strong><span>© 2026</span></div>
          <div><a href="#">Instagram ↗</a><a href="#">Are.na ↗</a><a href="#">CV ↗</a></div>
          {installPrompt ? <button className="install-button" onClick={install}>Install archive ↓</button> : <span>Available offline</span>}
        </div>
      </footer>

      {selected && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby="work-title">
          <button className="lightbox-backdrop" onClick={() => setSelected(null)} aria-label="Close artwork detail"></button>
          <div className="lightbox-panel">
            <div className={`lightbox-art ${selected.palette}`}><span>{String(selected.id).padStart(2, "0")}</span></div>
            <div className="lightbox-info">
              <div className="lightbox-top"><span>{selected.category} / {selected.year}</span><button onClick={() => setSelected(null)} aria-label="Close">Close ×</button></div>
              <div>
                <h2 id="work-title">{selected.title}</h2>
                <p className="work-note">{selected.note}</p>
              </div>
              <dl>
                <div><dt>Medium</dt><dd>{selected.medium}</dd></div>
                <div><dt>Dimensions</dt><dd>{selected.size}</dd></div>
                <div><dt>Availability</dt><dd>Inquire with studio</dd></div>
              </dl>
              <div className="lightbox-actions">
                <button onClick={() => toggleSaved(selected.id)}>{saved.includes(selected.id) ? "Saved ★" : "Save work ☆"}</button>
                <a href={`mailto:studio@example.com?subject=Inquiry: ${selected.title}`}>Inquire <Arrow /></a>
              </div>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-menu-top"><span>NOVA / STUDIO</span><button onClick={() => setMenuOpen(false)}>Close ×</button></div>
          <nav>
            <a href="#archive" onClick={() => setMenuOpen(false)}>Archive <span>01</span></a>
            <a href="#about" onClick={() => setMenuOpen(false)}>Practice <span>02</span></a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact <span>03</span></a>
          </nav>
          <p>A living archive of color,<br />memory & material.</p>
        </div>
      )}
    </main>
  );
}
