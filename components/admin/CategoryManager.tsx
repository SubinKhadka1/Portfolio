"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Category } from "@/lib/types/database";

export default function CategoryManager({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const res = await fetch("/api/categories?type=design");
    const data = await res.json();
    if (Array.isArray(data)) setCategories(data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          project_type: "design",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add category");
      setNewName("");
      setNewDescription("");
      await refresh();
      setMessage("Category added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setBusy(false);
    }
  }

  async function saveCategory(category: Category) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setCategories((prev) => prev.map((c) => (c.id === category.id ? data : c)));
      setMessage("Category saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Designs in it will move to More Designs.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await refresh();
      setMessage("Category deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  async function moveCategory(id: string, direction: -1 | 1) {
    const index = categories.findIndex((c) => c.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;

    const next = [...categories];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);

    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder");
      setCategories(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-white font-semibold">Gallery Categories</h2>
          <p className="text-zinc-500 text-sm mt-1">
          Headings on the <span className="text-zinc-300">/designs</span> page only — independent from the homepage marquee.
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <div key={category.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => moveCategory(category.id, -1)}
                  className="p-1.5 rounded-md border border-zinc-700 text-zinc-400 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={busy || index === categories.length - 1}
                  onClick={() => moveCategory(category.id, 1)}
                  className="p-1.5 rounded-md border border-zinc-700 text-zinc-400 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-3">
                <input
                  value={category.name}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((c) => (c.id === category.id ? { ...c, name: e.target.value } : c))
                    )
                  }
                  className="admin-input"
                  placeholder="Category title"
                />
                <textarea
                  value={category.description || ""}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((c) =>
                        c.id === category.id ? { ...c, description: e.target.value } : c
                      )
                    )
                  }
                  className="admin-input min-h-[80px]"
                  placeholder="Short description under the heading"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => saveCategory(category)}
                    className="admin-btn-secondary text-sm"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deleteCategory(category.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-medium">Add category</h3>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="admin-input"
          placeholder="e.g. Pull Up Banner"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="admin-input min-h-[80px]"
          placeholder="Optional description"
        />
        <button type="submit" disabled={busy || !newName.trim()} className="admin-btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add category
        </button>
      </form>

      {message ? (
        <p className={`text-sm ${message.toLowerCase().includes("fail") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
