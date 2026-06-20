"use client";
import { motion } from "framer-motion";
import type { ClientItem } from "@/lib/types/database";
import { loopForMarquee, groupDesignsByMarqueeRow } from "@/lib/marquee";
import MarqueeTrack from "@/components/MarqueeTrack";

function ClientLogo({ name, logo, className }: { name: string; logo: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={`${name} logo`}
      className={`h-20 md:h-24 w-auto max-w-[200px] md:max-w-[250px] object-contain opacity-100 transition-all duration-300 ${className || ""}`}
    />
  );
}

type ClientsProps = {
  clients?: ClientItem[];
  rows?: number;
  repeat?: number;
  scrollDuration?: number;
};

export default function Clients({
  clients = [],
  rows = 2,
  repeat = 2,
  scrollDuration = 45,
}: ClientsProps) {
  if (clients.length === 0) return null;

  const rowData = groupDesignsByMarqueeRow(clients, rows);
  const directions: Array<"left" | "right"> = ["left", "right"];

  return (
    <section id="clients" className="py-12 md:py-16 bg-gray-100 overflow-hidden relative">
      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-10"
        >
          <p className="section-eyebrow text-purple-600">Trusted By</p>
          <h2 className="section-heading !text-gray-900">
            Clients & <span className="text-purple-600">Companies</span>
          </h2>
        </motion.div>

        <div className="relative flex flex-col gap-3 md:gap-4">
          <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-gray-100 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-gray-100 to-transparent z-10 pointer-events-none" />

          {rowData.map((row, i) => {
            const looped = loopForMarquee(row, repeat);
            return (
              <MarqueeTrack
                key={i}
                direction={directions[i % directions.length]}
                repeatCount={repeat}
                durationSec={scrollDuration}
                className="logo-track"
              >
                {looped.map((client, j) => (
                  <div key={`${client.name}-${j}`} className={`logo-slide group ${client.containerClass || ""}`}>
                    <ClientLogo name={client.name} logo={client.logo} className={client.className} />
                  </div>
                ))}
              </MarqueeTrack>
            );
          })}
        </div>
      </div>
    </section>
  );
}
