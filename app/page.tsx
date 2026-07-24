"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Artwork = {
  id: string;
  title: string;
  year: string;
  medium: string;
  description: string;
  additionalNotes: string;
  classification: ArtworkClassification;
  background: string;
  foreground: string;
  imageUrl?: string;
  artworkDate?: string;
  createdAt?: string;
};

type ArtworkClassification = {
  discipline: string;
  genre: string;
  visualLanguage: string;
  composition: string;
  palette: string[];
  mood: string[];
  subjects: string[];
};

type ArtworkAnalysis = {
  title: string;
  description: string;
  additionalNotes: string;
  classification: ArtworkClassification;
  background: string;
  foreground: "#171612" | "#F1EEE6";
};

type DetailsSection = "description" | "notes" | "details";

const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_API_IMAGE_BYTES = 760 * 1024;

async function prepareArtworkImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP artwork image.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("The source image must be 15 MB or smaller.");
  }
  if (file.size <= MAX_API_IMAGE_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.88;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the artwork image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", quality);
      });
      if (blob && blob.size <= MAX_API_IMAGE_BYTES) {
        return new File([blob], file.name, {
          type: "image/webp",
          lastModified: file.lastModified,
        });
      }

      if (quality > 0.68) quality -= 0.07;
      else scale *= 0.82;
    }
  } finally {
    bitmap.close();
  }

  throw new Error("The artwork could not be optimized for upload. Try a smaller image.");
}

async function readApiPayload(response: Response) {
  const text = await response.text();
  let payload: { error?: string; analysis?: ArtworkAnalysis; artwork?: Artwork } = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.status === 413) {
        throw new Error("The prepared image is still too large for the local server. Try a smaller source image.");
      }
      throw new Error(response.ok ? "The server returned an unreadable response." : text);
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || `The request failed (${response.status}).`);
  }
  return payload;
}

function sortArtworksByDate(items: Artwork[]) {
  return [...items].sort((a, b) => {
    const dateOrder = (b.artworkDate || `${b.year}-01-01`).localeCompare(
      a.artworkDate || `${a.year}-01-01`,
    );
    if (dateOrder !== 0) return dateOrder;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

function ArtworkVisual({ artwork }: { artwork: Artwork }) {
  return (
    <div className="artwork-visual artwork-image" aria-label={artwork.title} role="img">
      {artwork.imageUrl && <img src={artwork.imageUrl} alt={artwork.title} />}
    </div>
  );
}

export default function Home() {
  const [uploadedArtworks, setUploadedArtworks] = useState<Artwork[]>([]);
  const artworks = useMemo(() => sortArtworksByDate(uploadedArtworks), [uploadedArtworks]);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [current, setCurrent] = useState(0);
  const [viewMode, setViewMode] = useState<"none" | "spotlight" | "magnify">("none");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsArtwork, setDetailsArtwork] = useState<Artwork | null>(null);
  const [detailsSection, setDetailsSection] = useState<DetailsSection>("description");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [artworkDate, setArtworkDate] = useState("");
  const [medium, setMedium] = useState("");
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null);
  const [workflowState, setWorkflowState] = useState<"idle" | "preparing" | "analyzing" | "saving">("idle");
  const [dialogError, setDialogError] = useState("");
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLDivElement>(null);
  const magnifierCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/artworks")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Stored artworks are unavailable.");
        if (!cancelled) setUploadedArtworks(payload.artworks || []);
      })
      .catch((error) => console.warn("Stored artwork loading failed", error))
      .finally(() => {
        if (!cancelled) setLoadingArtworks(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        setCurrent(index);
        document.documentElement.style.background = artworks[index]?.background || "#D94A2E";
      },
      { threshold: [0.45, 0.7, 0.9] },
    );

    slideRefs.current.slice(0, artworks.length).forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [artworks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogOpen || detailsArtwork || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(artworks.length - 1, current + direction));
      slideRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, dialogOpen, detailsArtwork, artworks.length]);

  useEffect(() => {
    if (spotlightRef.current) spotlightRef.current.style.opacity = "0";
    if (magnifierRef.current) magnifierRef.current.style.opacity = "0";
    if (viewMode === "none") return;

    const moveViewingTool = (event: PointerEvent) => {
      if (viewMode === "spotlight" && spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        spotlightRef.current.style.opacity = "1";
      }
      if (viewMode === "magnify" && magnifierRef.current && magnifierCanvasRef.current) {
        const zoom = 1.8;
        const radius = 150;
        magnifierRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        magnifierRef.current.style.opacity = "1";
        magnifierCanvasRef.current.style.transform =
          `translate3d(${radius - event.clientX * zoom}px, ${radius - event.clientY * zoom}px, 0) scale(${zoom})`;
      }
    };
    window.addEventListener("pointermove", moveViewingTool, { passive: true });
    return () => window.removeEventListener("pointermove", moveViewingTool);
  }, [viewMode, current]);

  useEffect(() => {
    document.body.style.overflow = dialogOpen || detailsArtwork ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [dialogOpen, detailsArtwork]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetDialog = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    setArtworkDate("");
    setMedium("");
    setAnalysis(null);
    setDialogError("");
    setWorkflowState("idle");
  };

  const closeDialog = () => {
    if (workflowState !== "idle") return;
    setDialogOpen(false);
    resetDialog();
  };

  const chooseImage = async (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
    setAnalysis(null);
    setDialogError("");
    if (!file) return;

    setWorkflowState("preparing");
    try {
      setSelectedFile(await prepareArtworkImage(file));
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "The artwork image could not be prepared.");
    } finally {
      setWorkflowState("idle");
    }
  };

  const analyzeArtwork = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !artworkDate) {
      setDialogError("Choose an artwork image and add its date.");
      return;
    }

    setDialogError("");
    setWorkflowState("analyzing");
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("artworkDate", artworkDate);
      formData.append("medium", medium);
      const response = await fetch("/api/artworks/analyze", { method: "POST", body: formData });
      const payload = await readApiPayload(response);
      if (!payload.analysis) throw new Error("Artwork review returned no details.");
      setAnalysis(payload.analysis);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Artwork review failed.");
    } finally {
      setWorkflowState("idle");
    }
  };

  const publishArtwork = async () => {
    if (!selectedFile || !analysis) return;
    setDialogError("");
    setWorkflowState("saving");
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("artworkDate", artworkDate);
      formData.append("medium", medium || "Mixed media");
      formData.append("title", analysis.title);
      formData.append("description", analysis.description);
      formData.append("additionalNotes", analysis.additionalNotes);
      formData.append("classification", JSON.stringify(analysis.classification));
      formData.append("background", analysis.background);
      formData.append("foreground", analysis.foreground);
      const response = await fetch("/api/artworks", { method: "POST", body: formData });
      const payload = await readApiPayload(response);
      if (!payload.artwork) throw new Error("The published artwork was not returned.");
      setUploadedArtworks((existing) => sortArtworksByDate([...existing, payload.artwork!]));
      setCurrent(0);
      setDialogOpen(false);
      resetDialog();
      window.setTimeout(() => slideRefs.current[0]?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Artwork could not be published.");
      setWorkflowState("idle");
    }
  };

  const currentArtwork = artworks[Math.min(current, artworks.length - 1)];

  return (
    <main className={`presentation ${viewMode !== "none" ? "viewing-tool-on" : ""}`}>
      <div
        ref={spotlightRef}
        className={`color-spotlight ${viewMode === "spotlight" ? "active" : ""}`}
        aria-hidden="true"
      >
        <span />
      </div>
      {currentArtwork && (
        <div
          ref={magnifierRef}
          className={`magnifier-lens ${viewMode === "magnify" ? "active" : ""}`}
          style={{ "--slide-bg": currentArtwork.background } as React.CSSProperties}
          aria-hidden="true"
        >
          <div className="magnifier-canvas" ref={magnifierCanvasRef}>
            <ArtworkVisual artwork={currentArtwork} />
          </div>
          <span className="magnifier-center" />
        </div>
      )}

      {artworks.length === 0 && (
        <section className="art-slide empty-gallery" aria-label="Artwork collection">
          <div className="slide-top-right">
            <div className="artist-line">
              <p className="artist-name">Dheeraj Ray</p>
              <button
                className="add-artwork-toggle"
                type="button"
                aria-label="Add artwork"
                title="Add artwork"
                onClick={() => setDialogOpen(true)}
              >
                <span aria-hidden="true" />
              </button>
            </div>
          </div>
          <p>{loadingArtworks ? "Loading collection…" : "No artworks yet."}</p>
        </section>
      )}

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
            <div className="artist-line">
              <p className="artist-name">Dheeraj Ray</p>
              <button
                className="spotlight-toggle"
                type="button"
                aria-label={viewMode === "spotlight" ? "Turn off color spotlight" : "Turn on color spotlight"}
                aria-pressed={viewMode === "spotlight"}
                title={viewMode === "spotlight" ? "Turn off color spotlight" : "Turn on color spotlight"}
                onClick={() => setViewMode((mode) => mode === "spotlight" ? "none" : "spotlight")}
              >
                <span className="spotlight-icon" aria-hidden="true" />
              </button>
              <button
                className="magnifier-toggle"
                type="button"
                aria-label={viewMode === "magnify" ? "Turn off magnifier" : "Turn on magnifier"}
                aria-pressed={viewMode === "magnify"}
                title={viewMode === "magnify" ? "Turn off magnifier" : "Turn on magnifier"}
                onClick={() => setViewMode((mode) => mode === "magnify" ? "none" : "magnify")}
              >
                <span className="magnifier-icon" aria-hidden="true" />
              </button>
              <button
                className="add-artwork-toggle"
                type="button"
                aria-label="Add artwork"
                title="Add artwork"
                onClick={() => { setViewMode("none"); setDialogOpen(true); }}
              >
                <span aria-hidden="true" />
              </button>
            </div>
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
            <span>
              {artwork.medium}
              {artwork.classification?.genre ? ` · ${artwork.classification.genre}` : ""}
            </span>
            <p>{artwork.description}</p>
            {artwork.additionalNotes && (
              <button
                type="button"
                onClick={() => {
                  setDetailsSection("description");
                  setDetailsArtwork(artwork);
                }}
              >
                Additional notes <i aria-hidden="true">↗</i>
              </button>
            )}
          </div>

          <div className="side-progress" aria-hidden="true">
            {artworks.map((_, dotIndex) => (
              <span key={dotIndex} className={dotIndex === index ? "active" : ""} />
            ))}
          </div>
        </section>
      ))}

      {detailsArtwork && (
        <div className="editorial-overlay" role="dialog" aria-modal="true" aria-labelledby="editorial-title">
          <button
            className="editorial-backdrop"
            type="button"
            aria-label="Close artwork review"
            onClick={() => setDetailsArtwork(null)}
          />
          <article
            className="editorial-panel"
            style={{
              "--panel-bg": detailsArtwork.background,
              "--panel-fg": detailsArtwork.foreground,
            } as React.CSSProperties}
          >
            <header>
              <span>Additional notes / {detailsArtwork.year}</span>
              <button type="button" onClick={() => setDetailsArtwork(null)}>Close ×</button>
            </header>
            <div className="editorial-content">
              <section className="editorial-intro">
                <p>Dheeraj Ray</p>
                <h2 id="editorial-title">{detailsArtwork.title}</h2>
                <div>
                  <span>{detailsArtwork.medium}</span>
                  <span>{detailsArtwork.classification?.discipline}</span>
                </div>
              </section>

              <nav className="editorial-mobile-nav" aria-label="Additional note sections">
                {([
                  ["description", "Description"],
                  ["notes", "Notes"],
                  ["details", "Details"],
                ] as const).map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    aria-pressed={detailsSection === section}
                    onClick={() => setDetailsSection(section)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <section className={`editorial-copy ${detailsSection === "details" ? "mobile-hidden" : ""}`}>
                <div className={detailsSection === "description" ? "mobile-active" : ""}>
                  <span>01 / Description</span>
                  <p>{detailsArtwork.description}</p>
                </div>
                <div className={detailsSection === "notes" ? "mobile-active" : ""}>
                  <span>02 / Additional notes</span>
                  <p>{detailsArtwork.additionalNotes}</p>
                </div>
              </section>

              <section className={`classification-grid ${detailsSection === "details" ? "mobile-active" : ""}`}>
                <div>
                  <span>Genre</span>
                  <p>{detailsArtwork.classification?.genre || "Unclassified"}</p>
                </div>
                <div>
                  <span>Visual language</span>
                  <p>{detailsArtwork.classification?.visualLanguage || "—"}</p>
                </div>
                <div>
                  <span>Composition</span>
                  <p>{detailsArtwork.classification?.composition || "—"}</p>
                </div>
                <div>
                  <span>Palette</span>
                  <p>{detailsArtwork.classification?.palette?.join(" · ") || "—"}</p>
                </div>
                <div>
                  <span>Mood</span>
                  <p>{detailsArtwork.classification?.mood?.join(" · ") || "—"}</p>
                </div>
                <div>
                  <span>Subjects</span>
                  <p>{detailsArtwork.classification?.subjects?.join(" · ") || "—"}</p>
                </div>
              </section>
            </div>
          </article>
        </div>
      )}

      {dialogOpen && (
        <div className="add-dialog" role="dialog" aria-modal="true" aria-labelledby="add-artwork-title">
          <button className="dialog-backdrop" onClick={closeDialog} aria-label="Close add artwork dialog" />
          <div className="dialog-panel">
            <div className="dialog-header">
              <div>
                <span>{analysis ? "02 / Review" : "01 / Import"}</span>
                <h2 id="add-artwork-title">{analysis ? "Review the details" : "Add an artwork"}</h2>
              </div>
              <button type="button" onClick={closeDialog} disabled={workflowState !== "idle"}>Close ×</button>
            </div>

            <div className="dialog-body">
              <div className={`upload-preview ${previewUrl ? "has-image" : ""}`}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected artwork preview" />
                ) : (
                  <label htmlFor="artwork-image">
                    <span>Choose image</span>
                    <small>JPEG, PNG or WebP · max 15 MB</small>
                  </label>
                )}
              </div>

              {!analysis ? (
                <form className="artwork-form" onSubmit={analyzeArtwork}>
                  <label className="field file-field" htmlFor="artwork-image">
                    <span>Artwork image</span>
                    <input
                      id="artwork-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => chooseImage(event.target.files?.[0] || null)}
                      required
                    />
                    <strong>{workflowState === "preparing" ? "Preparing image…" : selectedFile?.name || "Select a file"}</strong>
                  </label>
                  <label className="field">
                    <span>Date of artwork</span>
                    <input type="date" value={artworkDate} onChange={(event) => setArtworkDate(event.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Medium <small>optional</small></span>
                    <input
                      type="text"
                      value={medium}
                      onChange={(event) => setMedium(event.target.value)}
                      placeholder="e.g. Oil on canvas"
                      maxLength={120}
                    />
                  </label>
                  {dialogError && <p className="dialog-error" role="alert">{dialogError}</p>}
                  <button className="primary-dialog-action" type="submit" disabled={workflowState !== "idle"}>
                    {workflowState === "preparing"
                      ? "Preparing image…"
                      : workflowState === "analyzing"
                        ? "Reviewing artwork…"
                        : "Review with OpenAI ↗"}
                  </button>
                </form>
              ) : (
                <div className="artwork-form review-form">
                  <label className="field">
                    <span>Proposed title</span>
                    <input
                      value={analysis.title}
                      onChange={(event) => setAnalysis({ ...analysis, title: event.target.value })}
                      maxLength={120}
                    />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      value={analysis.description}
                      onChange={(event) => setAnalysis({ ...analysis, description: event.target.value })}
                      maxLength={1200}
                      rows={6}
                    />
                  </label>
                  <label className="field">
                    <span>Additional notes</span>
                    <textarea
                      value={analysis.additionalNotes}
                      onChange={(event) => setAnalysis({ ...analysis, additionalNotes: event.target.value })}
                      maxLength={1800}
                      rows={8}
                    />
                  </label>
                  <div className="classification-edit-grid">
                    {([
                      ["discipline", "Discipline"],
                      ["genre", "Genre"],
                      ["visualLanguage", "Visual language"],
                      ["composition", "Composition"],
                    ] as const).map(([key, label]) => (
                      <label className="field" key={key}>
                        <span>{label}</span>
                        <input
                          value={analysis.classification[key]}
                          onChange={(event) => setAnalysis({
                            ...analysis,
                            classification: {
                              ...analysis.classification,
                              [key]: event.target.value,
                            },
                          })}
                          maxLength={160}
                        />
                      </label>
                    ))}
                  </div>
                  {([
                    ["palette", "Palette"],
                    ["mood", "Mood"],
                    ["subjects", "Subjects"],
                  ] as const).map(([key, label]) => (
                    <label className="field" key={key}>
                      <span>{label} <small>separate with commas</small></span>
                      <input
                        value={analysis.classification[key].join(", ")}
                        onChange={(event) => setAnalysis({
                          ...analysis,
                          classification: {
                            ...analysis.classification,
                            [key]: event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          },
                        })}
                      />
                    </label>
                  ))}
                  <div className="color-fields">
                    <label className="field">
                      <span>Page color</span>
                      <input
                        type="color"
                        value={analysis.background}
                        onChange={(event) => setAnalysis({ ...analysis, background: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Text color</span>
                      <select
                        value={analysis.foreground}
                        onChange={(event) => setAnalysis({ ...analysis, foreground: event.target.value as ArtworkAnalysis["foreground"] })}
                      >
                        <option value="#171612">Dark</option>
                        <option value="#F1EEE6">Light</option>
                      </select>
                    </label>
                  </div>
                  {dialogError && <p className="dialog-error" role="alert">{dialogError}</p>}
                  <div className="review-actions">
                    <button type="button" onClick={() => setAnalysis(null)} disabled={workflowState !== "idle"}>Back</button>
                    <button className="primary-dialog-action" type="button" onClick={publishArtwork} disabled={workflowState !== "idle"}>
                      {workflowState === "saving" ? "Publishing…" : "Publish artwork ↗"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
