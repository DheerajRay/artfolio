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
const MAX_API_IMAGE_BYTES = 3 * 1024 * 1024;
const SLIDESHOW_DELAY_MS = 7_000;

async function encodeCanvasImage(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<{ blob: Blob; type: "image/webp" | "image/jpeg" } | null> {
  for (const type of ["image/webp", "image/jpeg"] as const) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
    if (blob && blob.type === type) return { blob, type };
  }
  return null;
}

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
    let scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.9;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the artwork image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const encoded = await encodeCanvasImage(canvas, quality);
      if (!encoded) {
        throw new Error("This browser could not encode the artwork image.");
      }
      if (encoded.blob.size <= MAX_API_IMAGE_BYTES) {
        const extension = encoded.type === "image/webp" ? "webp" : "jpg";
        const outputName = file.name.replace(/\.[^.]+$/, "") || "artwork";
        return new File([encoded.blob], `${outputName}.${extension}`, {
          type: encoded.type,
          lastModified: file.lastModified,
        });
      }

      const targetRatio = Math.sqrt(MAX_API_IMAGE_BYTES / encoded.blob.size);
      scale *= Math.max(0.55, Math.min(0.86, targetRatio * 0.94));
      quality = Math.max(0.56, quality - 0.06);
    }
  } finally {
    bitmap.close();
  }

  throw new Error("The artwork could not be optimized for upload. Try a smaller image.");
}

async function readApiPayload(response: Response) {
  const text = await response.text();
  let payload: {
    error?: string;
    analysis?: ArtworkAnalysis;
    artwork?: Artwork;
    deleted?: boolean;
    authorized?: boolean;
  } = {};

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
  const [viewMode, setViewMode] = useState<"none" | "magnify">("none");
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoginState, setAdminLoginState] = useState<"idle" | "signing-in">("idle");
  const [deletingArtwork, setDeletingArtwork] = useState<Artwork | null>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState("");
  const [detailsArtwork, setDetailsArtwork] = useState<Artwork | null>(null);
  const [detailsSection, setDetailsSection] = useState<DetailsSection>("description");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [artworkDate, setArtworkDate] = useState("");
  const [medium, setMedium] = useState("");
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null);
  const [workflowState, setWorkflowState] = useState<"idle" | "preparing" | "analyzing" | "saving">("idle");
  const [dialogError, setDialogError] = useState("");
  const presentationRef = useRef<HTMLElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const slideshowIndexRef = useRef(0);
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
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((payload) => setAdminAuthorized(Boolean(payload.authorized)))
      .catch(() => setAdminAuthorized(false))
      .finally(() => setAdminChecked(true));
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
      if (dialogOpen || deletingArtwork || detailsArtwork || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(artworks.length - 1, current + direction));
      slideRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, dialogOpen, deletingArtwork, detailsArtwork, artworks.length]);

  useEffect(() => {
    if (magnifierRef.current) magnifierRef.current.style.opacity = "0";
    if (viewMode === "none") return;

    const moveViewingTool = (event: PointerEvent) => {
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
    const syncFullscreenState = () => {
      setSlideshowActive(document.fullscreenElement === presentationRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!slideshowActive || artworks.length < 2) return;
    const timer = window.setInterval(() => {
      const next = (slideshowIndexRef.current + 1) % artworks.length;
      slideshowIndexRef.current = next;
      setCurrent(next);
      const slideHeight = slideRefs.current[next]?.offsetHeight || presentationRef.current?.clientHeight || 0;
      presentationRef.current?.scrollTo({
        top: next * slideHeight,
        behavior: "smooth",
      });
    }, SLIDESHOW_DELAY_MS);
    return () => window.clearInterval(timer);
  }, [artworks.length, slideshowActive]);

  useEffect(() => {
    document.body.style.overflow = dialogOpen || adminDialogOpen || deletingArtwork || detailsArtwork ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [adminDialogOpen, dialogOpen, deletingArtwork, detailsArtwork]);

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

  const confirmDeleteArtwork = async () => {
    if (!deletingArtwork || deleteState === "deleting") return;
    setDeleteError("");
    setDeleteState("deleting");
    try {
      const response = await fetch(`/api/artworks/${deletingArtwork.id}`, { method: "DELETE" });
      const payload = await readApiPayload(response);
      if (!payload.deleted) throw new Error("The server did not confirm deletion.");

      setUploadedArtworks((existing) => {
        const remaining = existing.filter((artwork) => artwork.id !== deletingArtwork.id);
        setCurrent((active) => Math.max(0, Math.min(active, remaining.length - 1)));
        return remaining;
      });
      setDetailsArtwork(null);
      setDeletingArtwork(null);
      setDeleteState("idle");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Artwork could not be deleted.");
      setDeleteState("idle");
    }
  };

  const signInAsOwner = async (event: FormEvent) => {
    event.preventDefault();
    setAdminError("");
    setAdminLoginState("signing-in");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const payload = await readApiPayload(response);
      if (!payload.authorized) throw new Error("Owner access was not confirmed.");
      setAdminAuthorized(true);
      setAdminDialogOpen(false);
      setAdminPassword("");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Owner sign-in failed.");
    } finally {
      setAdminLoginState("idle");
    }
  };

  const currentArtwork = artworks[Math.min(current, artworks.length - 1)];

  const startSlideshow = async (startIndex: number) => {
    if (!presentationRef.current || artworks.length === 0) return;
    setViewMode("none");
    slideshowIndexRef.current = startIndex;
    setCurrent(startIndex);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    try {
      await presentationRef.current.requestFullscreen();
      setSlideshowActive(true);
      const alignToStartingArtwork = () => {
        const slideHeight = slideRefs.current[startIndex]?.offsetHeight || presentationRef.current?.clientHeight || 0;
        presentationRef.current?.scrollTo({
          top: startIndex * slideHeight,
          behavior: "auto",
        });
      };
      alignToStartingArtwork();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(alignToStartingArtwork);
      });
    } catch (error) {
      console.warn("Fullscreen slideshow could not start", error);
      setSlideshowActive(false);
    }
  };

  return (
    <main
      ref={presentationRef}
      className={`presentation ${viewMode !== "none" ? "viewing-tool-on" : ""} ${slideshowActive ? "slideshow-active" : ""}`}
    >
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
              {adminChecked && (adminAuthorized ? (
                <button
                  className="add-artwork-toggle"
                  type="button"
                  aria-label="Add artwork"
                  title="Add artwork"
                  onClick={() => setDialogOpen(true)}
                >
                  <span aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="admin-toggle"
                  type="button"
                  aria-label="Owner sign in"
                  title="Owner sign in"
                  onClick={() => { setAdminError(""); setAdminDialogOpen(true); }}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
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
                className="slideshow-toggle"
                type="button"
                aria-label="Start fullscreen slideshow"
                title="Start fullscreen slideshow"
                onClick={() => startSlideshow(index)}
              >
                <span className="slideshow-icon" aria-hidden="true" />
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
              {adminChecked && (adminAuthorized ? (
                <>
                  <button
                    className="add-artwork-toggle"
                    type="button"
                    aria-label="Add artwork"
                    title="Add artwork"
                    onClick={() => { setViewMode("none"); setDialogOpen(true); }}
                  >
                    <span aria-hidden="true" />
                  </button>
                  <button
                    className="delete-artwork-toggle"
                    type="button"
                    aria-label={`Delete ${artwork.title}`}
                    title="Delete artwork"
                    onClick={() => {
                      setViewMode("none");
                      setDeleteError("");
                      setDeletingArtwork(artwork);
                    }}
                  >
                    <span aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button
                  className="admin-toggle"
                  type="button"
                  aria-label="Owner sign in"
                  title="Owner sign in"
                  onClick={() => { setAdminError(""); setAdminDialogOpen(true); }}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
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

      {adminDialogOpen && (
        <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
          <button
            className="dialog-backdrop"
            type="button"
            onClick={() => adminLoginState === "idle" && setAdminDialogOpen(false)}
            aria-label="Close owner sign in"
          />
          <form className="admin-panel" onSubmit={signInAsOwner}>
            <span>Private controls</span>
            <h2 id="admin-dialog-title">Owner access</h2>
            <p>Sign in to add, review, or remove artwork. Visitors can continue exploring the portfolio.</p>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </label>
            {adminError && <p className="dialog-error" role="alert">{adminError}</p>}
            <div className="admin-actions">
              <button
                type="button"
                onClick={() => setAdminDialogOpen(false)}
                disabled={adminLoginState === "signing-in"}
              >
                Cancel
              </button>
              <button type="submit" disabled={adminLoginState === "signing-in"}>
                {adminLoginState === "signing-in" ? "Signing in…" : "Unlock controls"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingArtwork && (
        <div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-artwork-title">
          <button
            className="dialog-backdrop"
            type="button"
            onClick={() => deleteState === "idle" && setDeletingArtwork(null)}
            aria-label="Cancel artwork deletion"
          />
          <div className="delete-panel">
            <div>
              <span>Remove from collection</span>
              <h2 id="delete-artwork-title">Delete “{deletingArtwork.title}”?</h2>
              <p>This permanently removes the artwork, its image, and its editorial details.</p>
            </div>
            {deleteError && <p className="dialog-error" role="alert">{deleteError}</p>}
            <div className="delete-actions">
              <button
                type="button"
                onClick={() => setDeletingArtwork(null)}
                disabled={deleteState === "deleting"}
              >
                Keep artwork
              </button>
              <button
                type="button"
                onClick={confirmDeleteArtwork}
                disabled={deleteState === "deleting"}
              >
                {deleteState === "deleting" ? "Deleting…" : "Delete artwork"}
              </button>
            </div>
          </div>
        </div>
      )}

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

              <section className={`classification-index ${detailsSection === "details" ? "mobile-active" : ""}`}>
                <div className="classification-primary">
                  {([
                    ["01", "Genre", detailsArtwork.classification?.genre || "Unclassified"],
                    ["02", "Visual language", detailsArtwork.classification?.visualLanguage || "—"],
                    ["03", "Composition", detailsArtwork.classification?.composition || "—"],
                  ] as const).map(([number, label, value]) => (
                    <div key={label}>
                      <span>{number} / {label}</span>
                      <p>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="classification-tags">
                  {([
                    ["Palette", detailsArtwork.classification?.palette || []],
                    ["Mood", detailsArtwork.classification?.mood || []],
                    ["Subjects", detailsArtwork.classification?.subjects || []],
                  ] as const).map(([label, values]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <div>
                        {values.length > 0
                          ? values.map((value) => <i key={value}>{value}</i>)
                          : <i>—</i>}
                      </div>
                    </div>
                  ))}
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

            {workflowState === "analyzing" ? (
              <div className="ai-review-loading" role="status" aria-live="polite">
                <div className="ai-review-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  <span>OpenAI review in progress</span>
                  <h3>Looking closely at the work</h3>
                  <p>Reading its composition, visual language, palette, and the details that reward a second look.</p>
                </div>
                <div className="ai-review-pulse" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </main>
  );
}
