"use client";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Subin completely transformed our social media presence. His video editing skills are next-level. The food reels he made for BEANS n BUN brought in so much customer engagement and foot traffic!",
    author: "Prabin Sharma",
    role: "CEO, BEANS n BUN",
    initials: "PS",
    rating: 5,
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    quote: "The brand campaign posters and promotional video ads Subin created for our visa services got us thousands of qualified leads. A true creative genius who blends aesthetics with marketing strategy perfectly.",
    author: "Samikshya Thapa",
    role: "Marketing Director, Success Education",
    initials: "ST",
    rating: 5,
    gradient: "from-blue-500 to-teal-500",
  },
  {
    quote: "Subin consistently delivers top-tier motion graphics and logo animations. He understands the brief perfectly and always goes the extra mile. Working with him was a breeze and worth every penny.",
    author: "Ashish Shrestha",
    role: "Creative Lead, Digital Growth Nepal",
    initials: "AS",
    rating: 5,
    gradient: "from-pink-500 to-purple-500",
  }
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 md:py-24 bg-black relative overflow-hidden">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="section-eyebrow">Feedback</p>
          <h2 className="section-heading">
            Client <span className="text-purple-400">Testimonials</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {testimonials.map((test, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -6 }}
              className="bg-white/[0.03] p-6 sm:p-8 rounded-2xl border border-white/[0.08] hover:border-purple-500/25 flex flex-col items-center text-center transition-all duration-300 group relative"
            >
              <span className="absolute top-5 right-6 text-6xl font-serif text-white/[0.03] group-hover:text-purple-500/10 transition-colors pointer-events-none select-none">
                &ldquo;
              </span>

              <div className="flex justify-center gap-1 mb-5 relative z-10">
                {[...Array(test.rating)].map((_, starIdx) => (
                  <span key={starIdx} className="text-yellow-500 text-base">★</span>
                ))}
              </div>

              <p className="text-gray-400 text-sm sm:text-base leading-relaxed italic mb-8 relative z-10">
                &ldquo;{test.quote}&rdquo;
              </p>

              <div className="flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 w-full relative z-10">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${test.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/10`}>
                  {test.initials}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm tracking-wide">
                    {test.author}
                  </h4>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {test.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
