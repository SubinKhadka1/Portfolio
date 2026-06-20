import Link from "next/link";
import { Plus } from "lucide-react";
import StatsCards from "@/components/admin/StatsCards";
import { getDashboardStats } from "@/lib/projects";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

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

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { type: "design", label: "Manage Designs", count: stats.designs },
          { type: "video", label: "Manage Videos", count: stats.videos },
          { type: "client", label: "Manage Clients", count: stats.clients },
        ].map(({ type, label, count }) => (
          <Link
            key={type}
            href={`/admin/projects?type=${type}`}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-purple-500/30 transition-colors group"
          >
            <p className="text-zinc-500 text-xs uppercase tracking-wider">{type}</p>
            <p className="text-3xl font-bold text-white mt-1">{count}</p>
            <p className="text-purple-400 text-sm mt-2 group-hover:underline">{label} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
