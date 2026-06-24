"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import MarqueeTrack from "@/components/MarqueeTrack";
import { loopForMarquee } from "@/lib/marquee";
import type { VideoItem } from "@/lib/types/database";

function VideoModal({
  video,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  video: VideoItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev, togglePlay]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.muted = false;
    videoRef.current.play().catch(() => {});
    setPlaying(true);
    setMuted(false);
    setProgress(0);
  }, [video.src]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(Number.isNaN(p) ? 0 : p);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime =
      ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[min(90vw,400px)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary btn-icon absolute top-2 right-2 sm:-top-12 sm:right-0 z-20"
          aria-label="Close video"
        >
          <X size={18} />
        </button>

        <div className="reel-slide reel-modal-player group">
          <video
            ref={videoRef}
            src={video.src}
            className="absolute inset-0 w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onEnded={onNext}
            playsInline
          />
          <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-3 pb-2">
              <div className="h-1 bg-white/20 rounded-full cursor-pointer" onClick={handleSeek}>
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 pb-3 bg-gradient-to-t from-black/90 to-transparent pt-4">
              <button type="button" onClick={togglePlay} className="btn btn-secondary btn-icon">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={toggleMute} className="btn btn-secondary btn-icon">
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end mt-4 gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="btn btn-secondary btn-icon disabled:opacity-30"
            aria-label="Previous video"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="btn btn-secondary btn-icon disabled:opacity-30"
            aria-label="Next video"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReelSlide({ video, onOpen }: { video: VideoItem; onOpen: () => void }) {
  const slideRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const hideBtnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOpenBtn, setShowOpenBtn] = useState(false);
  const clipStart = Math.max(0, video.clipStart ?? 0);
  const clipEnd = Math.max(clipStart + 0.5, video.clipEnd ?? 8);

  const revealOpenBtn = useCallback(() => {
    if (hideBtnTimerRef.current) {
      clearTimeout(hideBtnTimerRef.current);
      hideBtnTimerRef.current = null;
    }
    setShowOpenBtn(true);
  }, []);

  const hideOpenBtn = useCallback((immediate = false) => {
    if (hideBtnTimerRef.current) clearTimeout(hideBtnTimerRef.current);
    const delay = immediate ? 0 : 1800;
    hideBtnTimerRef.current = setTimeout(() => {
      setShowOpenBtn(false);
      hideBtnTimerRef.current = null;
    }, delay);
  }, []);

  useEffect(() => {
    return () => {
      if (hideBtnTimerRef.current) clearTimeout(hideBtnTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    const slide = slideRef.current;
    if (!el || !slide) return;

    let retryTimer: number | null = null;

    const seekToStart = () => {
      if (Math.abs(el.currentTime - clipStart) > 0.12) {
        el.currentTime = clipStart;
      }
    };

    const loopClip = () => {
      if (el.currentTime >= clipEnd - 0.08) {
        el.currentTime = clipStart;
      }
    };

    const playClip = () => {
      if (!visibleRef.current || document.hidden) return;
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.preload = "auto";
      seekToStart();
      const attempt = el.play();
      if (attempt) {
        attempt.catch(() => {
          window.setTimeout(() => {
            if (visibleRef.current && el.paused) {
              void el.play().catch(() => {});
            }
          }, 250);
        });
      }
    };

    const pauseClip = () => {
      el.pause();
    };

    const onVisibility = (entries: IntersectionObserverEntry[]) => {
      const visible = Boolean(entries[0]?.isIntersecting);
      visibleRef.current = visible;
      if (visible) playClip();
      else pauseClip();
    };

    const onPageVisible = () => {
      if (visibleRef.current) playClip();
    };

    const onStalled = () => {
      if (visibleRef.current) playClip();
    };

    const onPause = () => {
      if (visibleRef.current && !document.hidden) {
        window.setTimeout(playClip, 120);
      }
    };

    el.addEventListener("loadedmetadata", playClip);
    el.addEventListener("canplay", playClip);
    el.addEventListener("timeupdate", loopClip);
    el.addEventListener("stalled", onStalled);
    el.addEventListener("waiting", onStalled);
    el.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", onPageVisible);

    if (el.readyState >= 1) playClip();

    const observer = new IntersectionObserver(onVisibility, {
      threshold: [0, 0.15, 0.35],
      rootMargin: "80px 0px",
    });
    observer.observe(slide);

    retryTimer = window.setInterval(() => {
      if (visibleRef.current && !document.hidden && el.paused) {
        playClip();
      }
    }, 2500);

    return () => {
      el.removeEventListener("loadedmetadata", playClip);
      el.removeEventListener("canplay", playClip);
      el.removeEventListener("timeupdate", loopClip);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("waiting", onStalled);
      el.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onPageVisible);
      observer.disconnect();
      if (retryTimer) window.clearInterval(retryTimer);
    };
  }, [clipStart, clipEnd, video.src]);

  return (
    <div
      ref={slideRef}
      className={`reel-slide reel-slide--clean group/reel${showOpenBtn ? " is-pressed" : ""}`}
      onPointerEnter={revealOpenBtn}
      onPointerLeave={() => hideOpenBtn(true)}
      onPointerDown={revealOpenBtn}
      onPointerUp={(e) => hideOpenBtn(e.pointerType === "mouse")}
      onPointerCancel={() => hideOpenBtn(true)}
    >
      <video
        ref={previewRef}
        src={video.src}
        className="reel-slide__video"
        muted
        playsInline
        autoPlay
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
      />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="reel-fullscreen-btn"
        aria-label="Watch full video"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}

export default function VideoShowcase({
  videos = [],
  repeat = 2,
  scrollDuration = 35,
}: {
  videos?: VideoItem[];
  repeat?: number;
  scrollDuration?: number;
}) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const reelItems = loopForMarquee(videos, repeat);

  const activeIndex = activeVideo !== null ? videos.findIndex((v) => v.id === activeVideo) : -1;
  const activeVideoData = activeIndex >= 0 ? videos[activeIndex] : null;

  const goNext = useCallback(() => {
    if (activeIndex < videos.length - 1) setActiveVideo(videos[activeIndex + 1].id);
  }, [activeIndex, videos]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) setActiveVideo(videos[activeIndex - 1].id);
  }, [activeIndex, videos]);

  if (videos.length === 0) {
    return (
      <section id="videos" className="py-14 md:py-20 bg-black">
        <div className="section-container text-center">
          <p className="section-eyebrow">Showreel</p>
          <h2 className="section-heading">
            Video <span className="text-purple-400">Reels</span>
          </h2>
          <p className="text-gray-500 text-sm mt-4">Add videos from the admin dashboard to show them here.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="videos" className="py-14 md:py-20 bg-black overflow-hidden">
      <div className="section-container mb-6 md:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="section-eyebrow">Showreel</p>
          <h2 className="section-heading">
            Video <span className="text-purple-400">Reels</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto px-2">
            Auto-playing clips · press a reel to open full screen
          </p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 md:w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 md:w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        <MarqueeTrack direction="left" repeatCount={repeat} durationSec={scrollDuration}>
          {reelItems.map((video, i) => (
            <ReelSlide
              key={`${video.id}-${i}`}
              video={video}
              onOpen={() => setActiveVideo(video.id)}
            />
          ))}
        </MarqueeTrack>
      </div>

      <AnimatePresence>
        {activeVideoData && (
          <VideoModal
            key={activeVideoData.id}
            video={activeVideoData}
            onClose={() => setActiveVideo(null)}
            onNext={goNext}
            onPrev={goPrev}
            hasNext={activeIndex < videos.length - 1}
            hasPrev={activeIndex > 0}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
