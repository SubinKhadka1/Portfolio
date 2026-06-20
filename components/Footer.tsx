"use client";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-black border-t border-white/[0.06]">
      <div className="section-container py-4 md:py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          {/* Brand */}
          <a href="#home" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <span className="text-sm font-bold text-white">
              Subin<span className="text-purple-400">.</span>
            </span>
          </a>

          {/* Copyright */}
          <p className="text-gray-600 text-xs order-last sm:order-none">
            © {new Date().getFullYear()} Subin Khadka
          </p>

          {/* Back to top */}
          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp size={14} />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
