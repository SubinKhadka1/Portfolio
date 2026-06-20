"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const skillGroups = [
  {
    label: "Design",
    skills: [
      { name: "Photoshop", level: 92, accent: "#31A8FF" },
      { name: "Canva", level: 95, accent: "#00C4CC" },
      { name: "Figma", level: 78, accent: "#F24E1E" },
    ],
  },
  {
    label: "Video & Motion",
    skills: [
      { name: "Premiere Pro", level: 90, accent: "#9999FF" },
      { name: "After Effects", level: 80, accent: "#CF96FD" },
      { name: "CapCut", level: 90, accent: "#7C3AED" },
    ],
  },
];

function SkillRow({
  name,
  level,
  accent,
  index,
}: {
  name: string;
  level: number;
  accent: string;
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -12 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="group flex items-center gap-4 sm:gap-5 py-4 sm:py-5"
    >
      <div
        className="w-1.5 h-8 rounded-full flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: accent }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 mb-2.5">
          <span className="text-white font-medium text-sm sm:text-base truncate">{name}</span>
          <span className="text-gray-500 text-xs sm:text-sm tabular-nums flex-shrink-0 group-hover:text-purple-300 transition-colors">
            {level}%
          </span>
        </div>
        <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${accent}99, ${accent})`,
              boxShadow: inView ? `0 0 12px ${accent}40` : "none",
            }}
            initial={{ width: 0 }}
            animate={inView ? { width: `${level}%` } : { width: 0 }}
            transition={{ duration: 1, delay: index * 0.07 + 0.15, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function About() {
  let rowIndex = 0;

  return (
    <section id="about" className="py-16 md:py-24 bg-black relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,36rem)] h-64 bg-purple-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <p className="section-eyebrow">Expertise</p>
          <h2 className="section-heading">
            My <span className="text-purple-400">Skills</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            Tools I use daily to design, edit, and deliver polished creative work.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
          {skillGroups.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: gi * 0.1 }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-center gap-3 mb-1 pb-4 border-b border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400/80 font-semibold">
                  {group.label}
                </span>
                <span className="flex-1 h-px bg-gradient-to-r from-purple-500/20 to-transparent" />
                <span className="text-gray-600 text-xs tabular-nums">{group.skills.length} tools</span>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {group.skills.map((skill) => {
                  const idx = rowIndex++;
                  return (
                    <SkillRow
                      key={skill.name}
                      name={skill.name}
                      level={skill.level}
                      accent={skill.accent}
                      index={idx}
                    />
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mt-8 md:mt-10 max-w-2xl mx-auto"
        >
          {skillGroups.flatMap((g) => g.skills).map((skill, i) => (
            <motion.span
              key={`tag-${skill.name}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.04 }}
              whileHover={{ y: -2 }}
              className="px-3.5 py-1.5 rounded-full text-xs text-gray-400 border border-white/[0.08] bg-white/[0.02] hover:text-white hover:border-white/[0.15] transition-colors cursor-default"
            >
              {skill.name}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
