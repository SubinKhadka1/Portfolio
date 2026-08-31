"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import type { Testimonial, TestimonialInput } from "@/lib/types/database";

type TestimonialFormProps = {
  initial?: Testimonial;
};

const gradientPresets = [
  { value: "from-purple-500 to-indigo-500", label: "Purple to Indigo" },
  { value: "from-blue-500 to-teal-500", label: "Blue to Teal" },
  { value: "from-pink-500 to-purple-500", label: "Pink to Purple" },
  { value: "from-violet-700 to-indigo-900", label: "Violet to Indigo" },
  { value: "from-yellow-700 to-orange-900", label: "Yellow to Orange" },
  { value: "from-green-700 to-emerald-900", label: "Green to Emerald" },
];

export default function TestimonialForm({ initial }: TestimonialFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [author, setAuthor] = useState(initial?.author || "");
  const [quote, setQuote] = useState(initial?.quote || "");
  const [role, setRole] = useState(initial?.role || "");
  const [initials, setInitials] = useState(initial?.initials || "");
  const [rating, setRating] = useState<number>(initial?.rating ?? 5);
  const [gradient, setGradient] = useState(initial?.gradient || gradientPresets[0].value);
  const [published, setPublished] = useState(initial?.published ?? true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !quote.trim()) {
      setError("Author name and quote are required.");
      return;
    }

    setSaving(true);
    setError("");

    const payload: TestimonialInput = {
      author,
      quote,
      role,
      initials: initials.trim() || undefined,
      rating,
      gradient,
      published,
    };

    try {
      const url = isEdit ? `/api/testimonials/${initial!.id}` : "/api/testimonials";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save testimonial");
      }

      router.push("/admin/testimonials");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial || !confirm("Are you sure you want to delete this testimonial?")) return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/testimonials/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete testimonial");
      }
      router.push("/admin/testimonials");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-zinc-300 text-sm font-medium">Author Name</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="e.g. Prabin Sharma"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-zinc-300 text-sm font-medium">Initials (Optional)</label>
          <input
            type="text"
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="e.g. PS (Auto-computed if empty)"
            maxLength={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-zinc-300 text-sm font-medium">Role (Optional)</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="e.g. CEO, BEANS n BUN"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-zinc-300 text-sm font-medium">Rating (Stars)</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} Star{r > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-zinc-300 text-sm font-medium">Avatar Gradient</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={gradient}
            onChange={(e) => setGradient(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            {gradientPresets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs">Preview:</span>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
              {initials.trim() || author.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "C"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-zinc-300 text-sm font-medium">Quote / Feedback</label>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={4}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 leading-relaxed"
          placeholder="Enter client's testimonial content..."
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="published"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-850 text-purple-600 bg-zinc-950 focus:ring-purple-500 focus:ring-offset-zinc-900 focus:ring-2"
        />
        <label htmlFor="published" className="text-zinc-300 text-sm cursor-pointer select-none">
          Publish testimonial (make visible on homepage)
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting || saving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm font-medium text-red-400 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete Testimonial
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/testimonials")}
            disabled={saving || deleting}
            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="admin-btn-primary"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEdit ? "Save Changes" : "Create Testimonial"}
          </button>
        </div>
      </div>
    </form>
  );
}
