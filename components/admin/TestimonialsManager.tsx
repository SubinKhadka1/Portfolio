"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import type { Testimonial } from "@/lib/types/database";

export default function TestimonialsManager({
  testimonials: initial,
}: {
  testimonials: Testimonial[];
}) {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function togglePublished(id: string, current: boolean) {
    const res = await fetch(`/api/testimonials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !current }),
    });
    if (res.ok) {
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, published: !current } : t))
      );
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this testimonial? This cannot be undone.")) return;
    const res = await fetch(`/api/testimonials/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    }
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...testimonials];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setTestimonials(reordered);
    setDragIndex(null);

    setSaving(true);
    await fetch("/api/testimonials/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((t, i) => ({ id: t.id, sort_order: (i + 1) * 1000 })),
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">
          {testimonials.length} testimonial{testimonials.length !== 1 ? "s" : ""} · drag to reorder
          {saving && <span className="ml-2 text-purple-400">Saving…</span>}
        </p>
        <Link href="/admin/testimonials/new" className="admin-btn-primary">
          <Plus size={16} />
          New Testimonial
        </Link>
      </div>

      {testimonials.length === 0 && (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-zinc-400 mb-4">No testimonials yet.</p>
          <Link href="/admin/testimonials/new" className="admin-btn-primary inline-flex">
            Add your first testimonial
          </Link>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {testimonials.map((t, index) => (
          <article
            key={t.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={`bg-zinc-900 border rounded-xl p-4 flex items-start gap-4 transition-colors group ${
              dragIndex === index
                ? "border-purple-500/50 opacity-50"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {/* Drag handle */}
            <span className="text-zinc-600 cursor-grab mt-1 shrink-0 group-hover:text-zinc-400 transition-colors">
              <GripVertical size={18} />
            </span>

            {/* Avatar */}
            <div
              className={`w-10 h-10 shrink-0 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-xs shadow`}
            >
              {t.initials}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-semibold text-sm">{t.author}</p>
                {t.role && (
                  <span className="text-zinc-500 text-xs">· {t.role}</span>
                )}
                <span className="text-yellow-500 text-xs">
                  {"★".repeat(t.rating)}
                </span>
                {!t.published && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                    Hidden
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed mt-1 line-clamp-2 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => togglePublished(t.id, t.published)}
                title={t.published ? "Hide from homepage" : "Show on homepage"}
                className={`p-1.5 rounded-lg transition-colors ${
                  t.published
                    ? "text-green-400 hover:text-zinc-400 hover:bg-zinc-800"
                    : "text-zinc-600 hover:text-green-400 hover:bg-zinc-800"
                }`}
              >
                {t.published ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>

              <Link
                href={`/admin/testimonials/${t.id}`}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
              >
                <Pencil size={15} />
              </Link>

              <button
                onClick={() => handleDelete(t.id)}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
