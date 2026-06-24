"use client";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function Footer({ variant = "dark" }: { variant?: "light" | "dark" }) {
  const light = variant === "light";
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className={`relative border-t ${
        light ? "bg-white border-zinc-200" : "bg-black border-white/[0.06]"
      }`}
    >
      <div className="section-container py-4 md:py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <a href={light ? "/" : "#home"} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <span className={`text-sm font-bold ${light ? "text-zinc-900" : "text-white"}`}>
              Subin<span className="text-purple-500">x</span>
            </span>
          </a>

          <p className={`text-xs order-last sm:order-none ${light ? "text-zinc-500" : "text-gray-600"}`}>
            © {new Date().getFullYear()} Subin Khadka
          </p>

          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
              light
                ? "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-purple-600 hover:border-purple-300"
                : "border-white/[0.08] bg-white/[0.03] text-gray-400 hover:text-purple-400 hover:border-purple-500/30"
            }`}
            aria-label="Back to top"
          >
            <ArrowUp size={14} />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
