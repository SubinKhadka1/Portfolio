"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Star,
  Eye,
  EyeOff,
  GripVertical,
  Play,
  Pause,
} from "lucide-react";
import type { Project } from "@/lib/types/database";

function VideoCardPreview({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-black group">
      <video
        src={src}
        className="w-full h-full object-cover"
        muted
        playsInline
        loop
        autoPlay={playing}
      />
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {playing ? (
          <Pause size={28} className="text-white" />
        ) : (
          <Play size={28} className="text-white fill-white" />
        )}
      </button>
    </div>
  );
}

function ClientCardPreview({ project }: { project: Project }) {
  const className = project.metadata?.className || "";
  const containerClass = project.metadata?.containerClass || "";

  return (
    <div
      className={`aspect-[4/3] w-full rounded-xl bg-gray-100 border border-zinc-700/50 flex items-center justify-center p-4 ${containerClass}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={project.media_url}
        alt={project.title}
        className={`max-h-full max-w-full object-contain ${className}`}
      />
    </div>
  );
}

export default function ProjectGrid({
  projects: initial,
  type,
}: {
  projects: Project[];
  type: "video" | "client";
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function toggleField(id: string, field: "featured" | "published", value: boolean) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...projects];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setProjects(reordered);
    setDragIndex(null);

    await fetch("/api/projects/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((p, i) => ({ id: p.id, sort_order: i })),
      }),
    });
    router.refresh();
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-zinc-400">No {type}s yet.</p>
        <Link href={`/admin/projects/new?type=${type}`} className="admin-btn-primary inline-flex mt-4">
          Add {type}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project, index) => (
        <article
          key={project.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-purple-500/30 transition-colors group"
        >
          <div className="p-3 pb-0">
            {type === "video" ? (
              <VideoCardPreview src={project.media_url} />
            ) : (
              <ClientCardPreview project={project} />
            )}
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">{project.title || "Untitled"}</p>
                {type === "video" && (
                  <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{project.description}</p>
                )}
                {type === "video" && (
                  <p className="text-zinc-600 text-xs mt-1 font-mono">
                    {project.metadata?.duration || "—"} · clip {project.metadata?.clipStart ?? 0}s–{project.metadata?.clipEnd ?? 8}s
                  </p>
                )}
              </div>
              <span className="text-zinc-600 cursor-grab shrink-0" title="Drag to reorder">
                <GripVertical size={16} />
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {type === "video" && (
                  <button
                    onClick={() => toggleField(project.id, "featured", !project.featured)}
                    title="Featured on homepage"
                    className={`p-1.5 rounded-lg transition-colors ${
                      project.featured ? "text-yellow-400 bg-yellow-400/10" : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    <Star size={15} />
                  </button>
                )}
                <button
                  onClick={() => toggleField(project.id, "published", !project.published)}
                  title="Published"
                  className={`p-1.5 rounded-lg transition-colors ${
                    project.published ? "text-green-400 bg-green-400/10" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {project.published ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              <div className="flex gap-1">
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="p-2 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
                >
                  <Pencil size={15} />
                </Link>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
