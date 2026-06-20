"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Send, MessageCircle, Clock } from "lucide-react";
import Instagram from "@/components/icons/Instagram";
import {
  buildContactWhatsAppMessage,
  getWhatsAppUrl,
  SOCIAL_LINKS,
  WHATSAPP_DISPLAY,
  WHATSAPP_GREETING,
} from "@/lib/site";

const LinkedinIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.062 2.062 0 01-2.063 2.065zM7.119 20.452H3.555V9h3.564v11.452z" />
  </svg>
);

const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.035 10.125 11.927v-8.438H7.078v-3.489h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.687.235 2.687.235v2.953H15.83c-1.49 0-1.956.925-1.956 1.874v2.267h3.328l-.532 3.489h-2.796V24C19.612 23.108 24 18.092 24 12.073z" />
  </svg>
);

const contactMethods = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: WHATSAPP_DISPLAY,
    href: getWhatsAppUrl(WHATSAPP_GREETING),
    hint: "Tap to chat directly",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Kathmandu, Nepal",
    hint: "Available worldwide",
  },
];

const socialLinks = [
  { icon: Instagram, label: "Instagram", href: SOCIAL_LINKS.instagram },
  { icon: FacebookIcon, label: "Facebook", href: SOCIAL_LINKS.facebook },
  { icon: LinkedinIcon, label: "LinkedIn", href: SOCIAL_LINKS.linkedin },
  { icon: MessageCircle, label: "WhatsApp", href: getWhatsAppUrl(WHATSAPP_GREETING) },
];

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", project: "Video Editing", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    const message = buildContactWhatsAppMessage(formData);
    window.open(getWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    setSubmitted(true);
    setFormData({ name: "", email: "", project: "Video Editing", message: "" });
  };

  return (
    <section id="contact" className="py-12 sm:py-16 md:py-24 bg-black relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(100%,48rem)] h-64 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10 md:mb-14"
        >
          <p className="section-eyebrow">Get in Touch</p>
          <h2 className="section-heading">
            Let&apos;s <span className="text-purple-400">Work Together</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto leading-relaxed px-2">
            Fill out the form and it will open WhatsApp with your message ready to send.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-5 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 flex flex-col gap-3 sm:gap-4"
          >
            {contactMethods.map((method, i) => (
              <motion.div
                key={method.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5 hover:border-purple-500/25 transition-colors group"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:bg-purple-500/15 transition-colors">
                    <method.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">{method.label}</p>
                    {method.href ? (
                      <a
                        href={method.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-purple-400 transition-colors text-sm font-medium block truncate"
                      >
                        {method.value}
                      </a>
                    ) : (
                      <span className="text-white text-sm font-medium">{method.value}</span>
                    )}
                    <p className="text-gray-600 text-xs mt-0.5">{method.hint}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-purple-500/10 to-transparent p-5 sm:p-6 mt-auto">
              <div className="flex items-center gap-2 text-purple-300 text-xs uppercase tracking-wider mb-3">
                <Clock size={14} />
                Response Time
              </div>
              <p className="text-white font-semibold text-base sm:text-lg mb-1">Within 24 hours</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Open for freelance, contracts, and agency collaborations.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {socialLinks.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 rounded-full border border-white/[0.1] bg-white/[0.03] flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 md:p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="contact-form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 sm:space-y-5 relative z-10"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="text-gray-400 text-xs font-medium block mb-2">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs font-medium block mb-2">Your Email</label>
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Project Category</label>
                    <select
                      value={formData.project}
                      onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                      className="form-input form-select"
                    >
                      <option value="Video Editing">Video Editing</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Motion Graphics">Motion Graphics</option>
                      <option value="Social Media Ads">Social Media Ads</option>
                      <option value="Branding">Branding / Identity</option>
                      <option value="Other">Other Creative Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Project Details</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell me about your project, timeline, and goals..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="form-input resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-primary flex-1 !rounded-xl !py-3.5 sm:!py-4 text-sm sm:text-base"
                    >
                      <Send size={18} /> Send via WhatsApp
                    </motion.button>
                    <a
                      href={getWhatsAppUrl(WHATSAPP_GREETING)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary flex-1 sm:flex-none !rounded-xl !py-3.5 sm:!py-4 text-sm justify-center"
                    >
                      <MessageCircle size={18} /> Chat on WhatsApp
                    </a>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="success-message"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-12 sm:py-16 space-y-6 relative z-10"
                >
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mx-auto text-2xl border border-purple-500/30">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Opening WhatsApp</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed px-4">
                      Your message is ready in WhatsApp. Tap send to reach me directly.
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
                  >
                    Send another message →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
