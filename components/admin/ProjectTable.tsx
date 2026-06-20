"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Star, Eye, EyeOff, GripVertical } from "lucide-react";
import type { Project } from "@/lib/types/database";

export default function ProjectTable({
  projects: initial,
}: {
  projects: Project[];
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
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this design?")) return;
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
      <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
        <p className="text-zinc-400">No designs yet.</p>
        <Link href="/admin/projects/new?type=design" className="admin-btn-primary inline-flex">
          Add your first design
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-left">
              <th className="p-4 w-8" />
              <th className="p-4">Preview</th>
              <th className="p-4">Title</th>
              <th className="p-4 hidden sm:table-cell">Format</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => {
              const isPortrait = project.metadata?.aspectRatio === "portrait";
              return (
                <tr
                  key={project.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-4 text-zinc-600 cursor-grab">
                    <GripVertical size={16} />
                  </td>
                  <td className="p-4">
                    <div
                      className={`rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 ${
                        isPortrait ? "w-12 h-[60px]" : "w-14 h-14"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.media_url}
                        alt={project.title}
                        className={`w-full h-full ${isPortrait ? "object-contain" : "object-cover"}`}
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-white font-medium">{project.title || "Untitled"}</p>
                    <p className="text-zinc-600 text-xs mt-0.5 font-mono truncate max-w-[200px]">
                      {project.media_url.split("/").pop()}
                    </p>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-zinc-400 text-xs">
                    {isPortrait ? "1080 × 1350" : "1080 × 1080"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleField(project.id, "published", !project.published)}
                        title="Toggle published"
                        className={`p-1.5 rounded-lg transition-colors ${
                          project.published ? "text-green-400 bg-green-400/10" : "text-zinc-600 hover:text-zinc-400"
                        }`}
                      >
                        {project.published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="p-2 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
