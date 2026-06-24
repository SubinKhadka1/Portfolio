"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { getWhatsAppUrl, WHATSAPP_GREETING } from "@/lib/site";

const homeNavLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#portfolio" },
  { label: "Designs", href: "/designs" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar({ variant }: { variant?: "light" | "dark" }) {
  const pathname = usePathname();
  const light = variant === "light" || pathname === "/designs";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = light
    ? [
        { label: "Home", href: "/" },
        { label: "Designs", href: "/designs" },
        { label: "Contact", href: "/#contact" },
      ]
    : homeNavLinks;

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
        light
          ? scrolled
            ? "bg-white/92 backdrop-blur-md border-b border-zinc-200 shadow-sm"
            : "bg-white/80 backdrop-blur-sm border-b border-zinc-100"
          : scrolled
            ? "bg-[#050505]/90 backdrop-blur-md border-b border-white/10"
            : "bg-transparent"
      }`}
    >
      <div className="page-container py-4 sm:py-5 flex items-center justify-between gap-3">
        {/* Logo */}
        <motion.a
          href={light ? "/" : "#home"}
          whileHover={{ scale: 1.03 }}
          className="flex items-center flex-shrink-0"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className={light ? "text-zinc-900" : "text-white"}>Subin</span>
            <span className="text-purple-500">x</span>
          </h1>
        </motion.a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`transition-colors text-sm uppercase tracking-wider ${
                light
                  ? "text-zinc-600 hover:text-zinc-900"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
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
            className={`lg:hidden w-10 h-10 rounded-full border flex items-center justify-center ${
              light
                ? "border-zinc-200 text-zinc-800"
                : "border-white/10 text-white"
            }`}
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
            className={`lg:hidden mx-[clamp(1rem,4vw,1.5rem)] mb-4 border rounded-2xl overflow-hidden ${
              light
                ? "bg-white border-zinc-200 shadow-lg"
                : "bg-[#111111] border-white/10"
            }`}
          >
            <div className="flex flex-col p-5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`py-3 transition-colors ${
                    light
                      ? "text-zinc-700 hover:text-purple-600"
                      : "text-gray-300 hover:text-purple-400"
                  }`}
                >
                  {link.label}
                </Link>
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
