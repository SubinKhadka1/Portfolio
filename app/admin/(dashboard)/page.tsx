import Link from "next/link";
import { Plus } from "lucide-react";
import StatsCards from "@/components/admin/StatsCards";
import { getCategories } from "@/lib/categories";
import { getDashboardStats } from "@/lib/projects";

export default async function AdminDashboardPage() {
  const [stats, categories] = await Promise.all([
    getDashboardStats(),
    getCategories("design"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Overview of your portfolio content</p>
        </div>
        <Link href="/admin/projects/new" className="admin-btn-primary">
          <Plus size={18} />
          New Project
        </Link>
      </div>

      <StatsCards stats={stats} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: "design", label: "Manage Designs", count: stats.designs, href: "/admin/projects?type=design" },
          { key: "video", label: "Manage Videos", count: stats.videos, href: "/admin/projects?type=video" },
          { key: "client", label: "Manage Clients", count: stats.clients, href: "/admin/projects?type=client" },
          {
            key: "gallery",
            label: "Manage Design Gallery",
            count: categories.length,
            href: "/admin/gallery-sections",
            eyebrow: "Design Gallery",
          },
        ].map(({ key, label, count, href, eyebrow }) => (
          <Link
            key={key}
            href={href}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-purple-500/30 transition-colors group"
          >
            <p className="text-zinc-500 text-xs uppercase tracking-wider">{eyebrow ?? key}</p>
            <p className="text-3xl font-bold text-white mt-1">{count}</p>
            <p className="text-purple-400 text-sm mt-2 group-hover:underline">{label} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
