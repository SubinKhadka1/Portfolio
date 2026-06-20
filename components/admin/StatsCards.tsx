"use client";

import type { DashboardStats } from "@/lib/types/database";
import { Image, Video, Users, Star, Eye, EyeOff, FolderOpen } from "lucide-react";

export default function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: "Total Projects", value: stats.total, icon: FolderOpen, color: "text-purple-400" },
    { label: "Designs", value: stats.designs, icon: Image, color: "text-blue-400" },
    { label: "Videos", value: stats.videos, icon: Video, color: "text-pink-400" },
    { label: "Clients", value: stats.clients, icon: Users, color: "text-emerald-400" },
    { label: "Featured", value: stats.featured, icon: Star, color: "text-yellow-400" },
    { label: "Published", value: stats.published, icon: Eye, color: "text-green-400" },
    { label: "Drafts", value: stats.unpublished, icon: EyeOff, color: "text-zinc-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Icon size={18} className={color} />
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-zinc-500 text-xs mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
