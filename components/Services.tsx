"use client";
import { motion } from "framer-motion";
import { Palette, Video, Zap, Box, Megaphone, Sparkles, TrendingUp, Clapperboard } from "lucide-react";

const services = [
  { icon: Palette, title: "Graphic Design", desc: "Flyers, posters & social creatives that grab attention." },
  { icon: Video, title: "Video Editing", desc: "Professional cuts, color grading & storytelling." },
  { icon: Zap, title: "Motion Graphics", desc: "Animated graphics that bring your content to life." },
  { icon: Box, title: "Branding Design", desc: "Logos, brand kits & visual identity systems." },
  { icon: Megaphone, title: "Social Media Ads", desc: "High-converting creatives for Facebook & Instagram." },
  { icon: Sparkles, title: "AI Video Generation", desc: "Smart AI-powered video concepts, edits & enhancements." },
  { icon: TrendingUp, title: "Creative Marketing", desc: "Campaign visuals that grow your audience." },
  { icon: Clapperboard, title: "Reels Editing", desc: "Viral-ready short-form content for social media." },
];

export default function Services() {
  return (
    <section id="services" className="py-8 md:py-12 bg-black relative overflow-hidden">
      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-14"
        >
          <p className="section-eyebrow">What I Do</p>
          <h2 className="section-heading">My <span className="text-purple-400">Services</span></h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white/[0.02] p-5 rounded-xl border border-white/[0.08] hover:border-purple-500/30 hover:shadow-[0_12px_40px_rgba(124,58,237,0.12)] transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-purple-500/15 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                  <service.icon size={20} className="text-purple-400" />
                </div>
                <h3 className="text-white font-semibold text-sm leading-snug">{service.title}</h3>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed mt-1 sm:mt-0 sm:pl-[3.25rem]">{service.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
