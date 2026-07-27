"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { ArtworkSoundtrack, youtubeVideoId } from "./artwork-soundtracks";

type YouTubePlayer = {
  cueVideoById(videoId: string): void;
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

export default function ArtworkSoundtrackPlayer({
  soundtrack,
  artworkTitle,
  background,
  foreground,
}: {
  soundtrack?: ArtworkSoundtrack | null;
  artworkTitle: string;
  background: string;
  foreground: string;
}) {
  const videoId = youtubeVideoId(soundtrack?.youtubeUrl || "");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [titleOverflowing, setTitleOverflowing] = useState(false);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const titleViewportRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || !videoId || !playerHostRef.current) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerHostRef.current) return;
      if (playerRef.current) {
        playerRef.current.cueVideoById(videoId);
        setCurrentTime(0);
        setPlaying(false);
        return;
      }
      playerRef.current = new YT.Player(playerHostRef.current, {
        width: 280,
        height: 200,
        videoId,
        playerVars: {
          controls: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            setDuration(playerRef.current?.getDuration() || 0);
          },
          onStateChange: ({ data }) => {
            if (cancelled) return;
            setPlaying(data === 1);
            setDuration(playerRef.current?.getDuration() || 0);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, videoId]);

  useEffect(() => {
    if (!playerRef.current || !videoId) return;
    playerRef.current.pauseVideo();
    playerRef.current.cueVideoById(videoId);
    setCurrentTime(0);
    setPlaying(false);
  }, [artworkTitle, videoId]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCurrentTime(playerRef.current?.getCurrentTime() || 0);
      setDuration(playerRef.current?.getDuration() || 0);
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const measureTitle = () => {
      setTitleOverflowing(Boolean(
        titleTextRef.current
        && titleViewportRef.current
        && titleTextRef.current.scrollWidth > titleViewportRef.current.clientWidth,
      ));
    };
    measureTitle();
    window.addEventListener("resize", measureTitle);
    return () => window.removeEventListener("resize", measureTitle);
  }, [open, soundtrack?.artist, soundtrack?.title]);

  useEffect(() => () => {
    playerRef.current?.destroy();
    playerRef.current = null;
  }, []);

  if (!soundtrack) return null;
  const displayTitle = `${soundtrack.title} — ${soundtrack.artist}`;

  const togglePlayer = () => {
    if (open) {
      playerRef.current?.pauseVideo();
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  return (
    <aside
      className={`soundtrack-control ${open ? "is-open" : ""}`}
      aria-label={`Soundtrack for ${artworkTitle}`}
      style={{
        "--soundtrack-bg": background,
        "--soundtrack-fg": foreground,
      } as CSSProperties}
    >
      <button
        className="soundtrack-toggle"
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close soundtrack player" : `Open soundtrack: ${displayTitle}`}
        title={open ? "Close soundtrack" : displayTitle}
        onClick={togglePlayer}
      >
        <span aria-hidden="true">♪</span>
      </button>
      <div className="soundtrack-drawer" aria-hidden={!open}>
        <div className="soundtrack-video">
          {videoId ? <div ref={playerHostRef} /> : <p>Playable YouTube link pending.</p>}
        </div>
        <div
          ref={titleViewportRef}
          className={`soundtrack-title-viewport ${titleOverflowing ? "is-overflowing" : ""}`}
          title={displayTitle}
        >
          <div className="soundtrack-title-track">
            <span ref={titleTextRef}>{displayTitle}</span>
            {titleOverflowing && <span aria-hidden="true">{displayTitle}</span>}
          </div>
        </div>
        <div className="soundtrack-timeline">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            step="0.1"
            value={Math.min(currentTime, Math.max(duration, 1))}
            disabled={!ready || !duration}
            aria-label={`Seek through ${displayTitle}`}
            onChange={(event) => {
              const nextTime = Number(event.target.value);
              setCurrentTime(nextTime);
              playerRef.current?.seekTo(nextTime, false);
            }}
            onPointerUp={(event) => {
              playerRef.current?.seekTo(Number(event.currentTarget.value), true);
            }}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </aside>
  );
}
