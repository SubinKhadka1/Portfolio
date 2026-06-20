"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image,
  Video,
  Users,
  Plus,
  LogOut,
  ExternalLink,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/projects?type=design", label: "Designs", icon: Image },
  { href: "/admin/projects?type=video", label: "Videos", icon: Video },
  { href: "/admin/projects?type=client", label: "Clients", icon: Users },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const currentType = searchParams.get("type");

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col transform transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">Subin<span className="text-purple-500">.</span></p>
            <p className="text-zinc-500 text-xs mt-0.5">Admin Dashboard</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-zinc-400">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const linkType = href.includes("type=") ? href.split("type=")[1] : null;
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : href === "/admin/settings"
                  ? pathname === "/admin/settings"
                  : pathname.startsWith("/admin/projects") && linkType === currentType;

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <ExternalLink size={18} />
            View Portfolio
          </Link>
          <Link
            href="/admin/projects/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          >
            <Plus size={18} />
            New Project
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
