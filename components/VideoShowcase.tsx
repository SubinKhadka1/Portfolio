"use client";
import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import MarqueeTrack from "@/components/MarqueeTrack";
import { loopForMarquee } from "@/lib/marquee";
import type { VideoItem } from "@/lib/types/database";

function ReelSlide({ video }: { video: VideoItem }) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const clipStart = Math.max(0, video.clipStart ?? 0);
  const clipEnd = Math.max(clipStart + 0.5, video.clipEnd ?? 8);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const seekToStart = () => {
      if (Math.abs(el.currentTime - clipStart) > 0.15) {
        el.currentTime = clipStart;
      }
    };

    const loopClip = () => {
      if (el.currentTime >= clipEnd - 0.05) {
        el.currentTime = clipStart;
        void el.play();
      }
    };

    const playClip = () => {
      el.muted = true;
      seekToStart();
      void el.play().catch(() => {});
    };

    const onVisibility = (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) playClip();
      else el.pause();
    };

    el.addEventListener("loadedmetadata", playClip);
    el.addEventListener("canplay", playClip);
    el.addEventListener("timeupdate", loopClip);

    if (el.readyState >= 1) playClip();

    const observer = new IntersectionObserver(onVisibility, {
      threshold: 0.2,
      rootMargin: "40px",
    });
    observer.observe(el);

    return () => {
      el.removeEventListener("loadedmetadata", playClip);
      el.removeEventListener("canplay", playClip);
      el.removeEventListener("timeupdate", loopClip);
      observer.disconnect();
    };
  }, [clipStart, clipEnd, video.src]);

  return (
    <div className="reel-slide reel-slide--clean">
      <video
        ref={previewRef}
        src={video.src}
        className="reel-slide__video"
        muted
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
      />
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
  const reelItems = loopForMarquee(videos, repeat);

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
            Auto-playing clips · loops on your set start and end times
          </p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 md:w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 md:w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        <MarqueeTrack direction="left" repeatCount={repeat} durationSec={scrollDuration}>
          {reelItems.map((video, i) => (
            <ReelSlide key={`${video.id}-${i}`} video={video} />
          ))}
        </MarqueeTrack>
      </div>
    </section>
  );
}
