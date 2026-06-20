"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { getWhatsAppUrl, WHATSAPP_GREETING } from "@/lib/site";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#portfolio" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050505]/90 backdrop-blur-md border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="page-container py-4 sm:py-5 flex items-center justify-between gap-3">
        {/* Logo */}
        <motion.a
          href="#home"
          whileHover={{ scale: 1.03 }}
          className="flex items-center flex-shrink-0"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-white">Subin</span>
            <span className="text-purple-500">.</span>
          </h1>
        </motion.a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-gray-300 hover:text-white transition-colors text-sm uppercase tracking-wider"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <a
            href={getWhatsAppUrl(WHATSAPP_GREETING)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-all"
          >
            Hire Me
          </a>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden mx-[clamp(1rem,4vw,1.5rem)] mb-4 bg-[#111111] border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="flex flex-col p-5">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-gray-300 hover:text-purple-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <a
                href={getWhatsAppUrl(WHATSAPP_GREETING)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="mt-4 flex justify-center items-center rounded-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold"
              >
                Hire Me
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
