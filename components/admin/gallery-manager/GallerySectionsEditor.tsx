"use client";

import { useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { reorderList } from "@/components/admin/gallery-manager/types";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category } from "@/lib/types/database";

function sortCategories(list: Category[]) {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export default function GallerySectionsEditor({
  categories,
  onChange,
  onSaved,
}: {
  categories: Category[];
  onChange: (categories: Category[]) => void;
  onSaved: (message: string, isError?: boolean) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const sorted = useMemo(() => sortCategories(categories), [categories]);

  const label = (cat: Category) => names[cat.id] ?? cat.name;

  const saveName = async (id: string) => {
    const name = (names[id] ?? "").trim();
    const current = categories.find((c) => c.id === id);
    if (!current || !name || name === current.name) {
      setNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
      onChange(categories.map((c) => (c.id === id ? data : c)));
      setNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      onSaved("Section name saved.");
    } catch (err) {
      onSaved(err instanceof Error ? err.message : "Could not save name", true);
    } finally {
      setBusyId(null);
    }
  };

  const saveOrder = async (ordered: Category[]) => {
    setBusyId("order");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((c) => c.id) }),
        cache: "no-store",
      });
      const data = await parseResponseJson<Category[] | { error?: string }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || "Could not save order");
      onChange(sortCategories(data as Category[]));
      onSaved("Section order saved.");
    } catch (err) {
      onSaved(err instanceof Error ? err.message : "Could not save order", true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="be-sections-editor">
      <p className="be-sections-editor__hint">
        Edit heading names and drag to change order on your designs page. Your designs are not moved or deleted.
      </p>
      <ul className="be-sections-editor__list">
        {sorted.map((cat, index) => (
          <li
            key={cat.id}
            className={`be-sections-editor__row${dragId === cat.id ? " be-sections-editor__row--dragging" : ""}`}
            draggable={busyId === null}
            onDragStart={(e) => {
              if ((e.target as HTMLElement).closest("input")) {
                e.preventDefault();
                return;
              }
              setDragId(cat.id);
            }}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!dragId || dragId === cat.id) return;
              const from = sorted.findIndex((c) => c.id === dragId);
              const to = sorted.findIndex((c) => c.id === cat.id);
              if (from < 0 || to < 0) return;
              void saveOrder(reorderList(sorted, from, to));
              setDragId(null);
            }}
          >
            <span className="be-sections-editor__num">{index + 1}</span>
            <GripVertical size={15} className="be-sections-editor__grip" aria-hidden />
            <input
              type="text"
              value={label(cat)}
              onChange={(e) => setNames((prev) => ({ ...prev, [cat.id]: e.target.value }))}
              onBlur={() => void saveName(cat.id)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="be-sections-editor__input"
              disabled={busyId !== null}
              aria-label={`Name for section ${index + 1}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
