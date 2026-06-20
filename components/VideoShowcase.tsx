"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, X, Volume2, VolumeX, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import MarqueeTrack from "@/components/MarqueeTrack";
import { loopForMarquee } from "@/lib/marquee";
import type { VideoItem } from "@/lib/types/database";

const gradients = [
  "from-purple-800 to-indigo-900",
  "from-pink-800 to-purple-900",
  "from-blue-800 to-cyan-900",
  "from-violet-800 to-indigo-900",
  "from-indigo-800 to-purple-900",
  "from-cyan-800 to-blue-900",
];

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
    return () => { document.body.style.overflow = ""; };
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
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev, togglePlay]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
      setPlaying(true);
      setMuted(false);
      setProgress(0);
    }
  }, [video.src]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(p) ? 0 : p);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime = (e.clientX - rect.left) / rect.width * videoRef.current.duration;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[min(90vw,400px)]"
      >
        <button type="button" onClick={onClose} className="btn btn-secondary btn-icon absolute top-2 right-2 sm:-top-12 sm:right-0 z-20">
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
              <span className="text-xs text-gray-300 ml-auto">{video.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold line-clamp-2">{video.title}</h3>
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{video.description}</p>
            <p className="text-gray-500 text-sm mt-0.5">{video.duration}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onPrev} disabled={!hasPrev} className="btn btn-secondary btn-icon disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={onNext} disabled={!hasNext} className="btn btn-secondary btn-icon disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReelSlide({
  video,
  index,
  onOpen,
}: {
  video: VideoItem;
  index: number;
  onOpen: () => void;
}) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  const clipStart = video.clipStart ?? 0;
  const clipEnd = video.clipEnd ?? 8;

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (el.currentTime >= clipEnd) {
        el.currentTime = clipStart;
      }
    };

    const startPreview = () => {
      el.currentTime = clipStart;
      el.muted = true;
      el.play().catch(() => {});
    };

    el.addEventListener("timeupdate", handleTimeUpdate);
    if (el.readyState >= 1) startPreview();
    else el.addEventListener("loadedmetadata", startPreview, { once: true });

    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", startPreview);
    };
  }, [clipStart, clipEnd, video.src]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    if (hovered) {
      el.pause();
      el.muted = false;
      el.volume = 0.85;
    } else {
      el.muted = true;
      el.currentTime = clipStart;
      el.play().catch(() => {});
    }
  }, [hovered, clipStart]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`reel-slide bg-gradient-to-br ${gradients[index % gradients.length]} ${hovered ? "is-hovered" : ""} cursor-pointer`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
    >
      <video
        ref={previewRef}
        src={video.src}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none" />

      {video.featured && (
        <span className="absolute top-3 left-3 text-[10px] font-bold text-black bg-purple-400 px-2 py-0.5 rounded-full uppercase z-10">
          Featured
        </span>
      )}

      <span className="absolute top-3 right-3 text-[11px] text-white/90 glass px-2 py-0.5 rounded-full z-10">
        {video.duration}
      </span>

      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-black/30 backdrop-blur-[2px]"
        >
          <p className="text-white text-xs font-medium px-3 text-center line-clamp-2">{video.title}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="btn btn-primary btn-sm"
          >
            <Maximize2 size={14} /> Open Full Video
          </button>
        </motion.div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 pointer-events-none z-10">
        <p className="text-purple-300 text-[9px] sm:text-[10px] uppercase tracking-wide">{video.duration}</p>
        <h3 className="text-white text-[11px] sm:text-sm font-medium leading-snug line-clamp-2">{video.title}</h3>
        <p className="text-gray-400 text-[10px] sm:text-xs leading-snug line-clamp-1 mt-0.5">{video.description}</p>
      </div>
    </div>
  );
}

export default function VideoShowcase({
  videos = [],
  repeat = 2,
  scrollDuration = 50,
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
            Loops automatically · Tap or hover to preview · Tap any reel to watch full video
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
              index={i % videos.length}
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
