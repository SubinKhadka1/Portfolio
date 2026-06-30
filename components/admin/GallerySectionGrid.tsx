"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil, FolderOpen, ExternalLink } from "lucide-react";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category } from "@/lib/types/database";

export type GallerySectionCard = Category & {
  designCount: number;
  previewUrls: string[];
};

function SectionPreview({ section }: { section: GallerySectionCard }) {
  const urls = section.previewUrls.slice(0, 4);

  if (urls.length === 0) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl bg-zinc-800 border border-zinc-700/50 flex flex-col items-center justify-center gap-2">
        <FolderOpen size={28} className="text-zinc-600" />
        <p className="text-zinc-600 text-xs">No designs yet</p>
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50 grid grid-cols-2 gap-0.5">
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function GallerySectionGrid({
  sections: initial,
}: {
  sections: GallerySectionCard[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [sections]
  );

  const label = (section: GallerySectionCard) =>
    draftNames[section.id] ?? section.name;

  async function saveName(id: string) {
    const name = (draftNames[id] ?? "").trim();
    const current = sections.find((s) => s.id === id);
    if (!current || !name || name === current.name) {
      setDraftNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingId(null);
      return;
    }

    setBusyId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        cache: "no-store",
      });
      const data = await parseResponseJson<Category & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Could not save name");
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      setDraftNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingId(null);
      setMessage("Section name saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save name");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex || busyId) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setSections(reordered.map((s, i) => ({ ...s, sort_order: i + 1 })));
    setDragIndex(null);

    setBusyId("order");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
        cache: "no-store",
      });
      const data = await parseResponseJson<Category[] | { error?: string }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || "Could not save order");
      const next = (data as Category[]).map((cat) => {
        const existing = reordered.find((s) => s.id === cat.id);
        return existing ? { ...existing, ...cat } : { ...cat, designCount: 0, previewUrls: [] };
      });
      setSections(next);
      setMessage("Section order saved.");
      router.refresh();
    } catch (err) {
      setSections(initial);
      setMessage(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setBusyId(null);
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-zinc-400">No gallery sections yet.</p>
        <Link href="/admin/categories" className="admin-btn-primary inline-flex mt-4">
          Open Design Gallery Editor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-zinc-400">{message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((section, index) => (
          <article
            key={section.id}
            draggable={busyId === null && editingId !== section.id}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(index)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-purple-500/30 transition-colors group"
          >
            <div className="p-3 pb-0">
              <SectionPreview section={section} />
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {editingId === section.id ? (
                    <input
                      type="text"
                      value={label(section)}
                      onChange={(e) =>
                        setDraftNames((prev) => ({ ...prev, [section.id]: e.target.value }))
                      }
                      onBlur={() => void saveName(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          setDraftNames((prev) => {
                            const next = { ...prev };
                            delete next[section.id];
                            return next;
                          });
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                      disabled={busyId === section.id}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-500"
                      aria-label="Section title"
                    />
                  ) : (
                    <p className="text-white font-medium truncate">{section.name}</p>
                  )}
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {section.designCount} design{section.designCount === 1 ? "" : "s"} · position{" "}
                    {index + 1}
                  </p>
                </div>
                <span className="text-zinc-600 cursor-grab shrink-0" title="Drag to reorder">
                  <GripVertical size={16} />
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-zinc-600 text-xs font-mono truncate">{section.slug}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(section.id);
                      setDraftNames((prev) => ({ ...prev, [section.id]: section.name }));
                    }}
                    disabled={busyId !== null}
                    className="p-2 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    title="Edit section title"
                  >
                    <Pencil size={15} />
                  </button>
                  <Link
                    href={`/admin/categories?category=${section.id}`}
                    className="p-2 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
                    title="Edit designs in this section"
                  >
                    <ExternalLink size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
