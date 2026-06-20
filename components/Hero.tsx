"use client";

import { motion, useInView } from "framer-motion";
import { ArrowUpRight, MessageCircle, Sparkles } from "lucide-react";
import { useRef, useState, useEffect, ReactNode } from "react";
import Instagram from "@/components/icons/Instagram";
import { getWhatsAppUrl, SOCIAL_LINKS, WHATSAPP_GREETING } from "@/lib/site";

function SocialIcon({ children }: { children: ReactNode }) {
  return <span className="[&>svg]:w-5 [&>svg]:h-5">{children}</span>;
}

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.035 10.125 11.927v-8.438H7.078v-3.489h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.687.235 2.687.235v2.953H15.83c-1.49 0-1.956.925-1.956 1.874v2.267h3.328l-.532 3.489h-2.796V24C19.612 23.108 24 18.092 24 12.073z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.062 2.062 0 01-2.063 2.065zM7.119 20.452H3.555V9h3.564v11.452z" />
  </svg>
);

const socials = [
  { icon: FacebookIcon, href: SOCIAL_LINKS.facebook, label: "Facebook" },
  { icon: MessageCircle, href: getWhatsAppUrl(WHATSAPP_GREETING), label: "WhatsApp" },
  { icon: LinkedinIcon, href: SOCIAL_LINKS.linkedin, label: "LinkedIn" },
  { icon: Instagram, href: SOCIAL_LINKS.instagram, label: "Instagram" },
];

function Counter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start = 0;

    const timer = setInterval(() => {
      start += Math.ceil(value / 50);

      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center text-center"
    >
      <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">
        {count}
        <span className="text-purple-400">{suffix}</span>
      </h3>

      <p className="text-gray-500 text-xs sm:text-sm leading-snug px-1">{label}</p>
    </div>
  );
}

export default function Hero({
  heroImage = "/Profile.png",
  heroAlt = "Subin Khadka",
}: {
  heroImage?: string;
  heroAlt?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section
      id="home"
      className="relative min-h-[100dvh] overflow-hidden bg-[#050505] pt-16 sm:pt-20 md:pt-24"
    >
      {/* Background Glow Effects */}
      <div className="absolute top-[-100px] right-[-200px] w-[800px] h-[800px] bg-purple-700/15 blur-[200px] rounded-full pointer-events-none" />
      <div className="absolute right-[-150px] top-[300px] w-[500px] h-[500px] bg-violet-500/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[-100px] w-[400px] h-[400px] bg-purple-900/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 page-container">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 sm:gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* LEFT — Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            {/* Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-500/5 mb-4"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 font-medium tracking-[3px] uppercase text-xs sm:text-sm">
                Freelance Designer &amp; Editor
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-white font-extrabold leading-[1] tracking-tight mb-3 text-[clamp(2.5rem,5.5vw,5rem)]"
            >
              Hi, I&apos;m{" "}
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
                Subin
              </span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-[clamp(1rem,2.2vw,1.6rem)] font-semibold mb-4 bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent"
            >
              Graphic Designer + Video Editor
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-[500px] mb-7 mx-auto lg:mx-0"
            >
              I create eye-catching flyers, reels, social media creatives,
              branding materials, advertisements and marketing visuals that
              help businesses attract attention, engage audiences and grow
              their brand across digital platforms.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6 justify-center lg:justify-start w-full sm:w-auto"
            >
              <a
                href="#portfolio"
                className="group relative inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 text-white font-semibold text-sm sm:text-base shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10">See My Designs</span>
                <ArrowUpRight className="relative z-10 w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </a>

              <a
                href={getWhatsAppUrl(WHATSAPP_GREETING)}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-white/[0.03] border border-white/10 text-white font-semibold text-sm sm:text-base hover:border-purple-500/40 hover:bg-purple-500/[0.06] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 backdrop-blur-sm"
              >
                <span>Get in Touch</span>
                <MessageCircle className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
              </a>
            </motion.div>

            {/* Socials */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="flex gap-3 justify-center lg:justify-start"
            >
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/10 hover:scale-110 transition-all duration-300"
                >
                  <SocialIcon>
                    <Icon />
                  </SocialIcon>
                </a>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex justify-center items-center lg:order-2 order-1 pt-2 sm:pt-0"
          >
            <div className="relative max-w-[85vw] sm:max-w-none">
              {/* Glow behind photo */}
              <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full scale-125 pointer-events-none" />

              {/* Decorative ring */}
              <div className="absolute -inset-3 rounded-[36px] border border-purple-500/10 pointer-events-none" />

              {/* Photo container — smaller size */}
              <div className="relative w-[230px] h-[320px] sm:w-[280px] sm:h-[380px] md:w-[320px] md:h-[430px] lg:w-[350px] lg:h-[470px] xl:w-[380px] xl:h-[510px] rounded-[24px] sm:rounded-[28px] overflow-hidden border border-white/10 bg-[#1a100c] shadow-[0_0_60px_rgba(168,85,247,0.2)]">
                {!imgFailed ? (
                  <img
                    src={heroImage}
                    alt={heroAlt}
                    className="w-full h-full object-cover object-center scale-110"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-purple-950 to-black flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-purple-500/20 mx-auto mb-3 flex items-center justify-center text-3xl">
                        👤
                      </div>
                      <p className="text-gray-600 text-xs">Photo</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating accent badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -bottom-2 sm:-bottom-3 -left-2 sm:-left-4 bg-[#111]/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-purple-500/20 shadow-lg"
              >
                <span className="text-xs sm:text-sm font-medium text-white">✨ Creative Pro</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -top-1 sm:-top-2 -right-2 sm:-right-4 bg-[#111]/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-purple-500/20 shadow-lg"
              >
                <span className="text-xs font-medium text-purple-300">🎨 Designer</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Stats — Centered */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-6 sm:py-8 md:py-10 mt-2 sm:mt-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 sm:gap-y-8 gap-x-4 sm:gap-x-6 md:gap-10 w-full max-w-5xl mx-auto text-center place-items-center">
            <Counter value={1} suffix="+" label="Years of Experience" />
            <Counter value={50} suffix="+" label="Projects Completed" />
            <Counter value={15} suffix="+" label="Happy Clients" />
            <Counter value={5} suffix="M+" label="Social Media Reach" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
