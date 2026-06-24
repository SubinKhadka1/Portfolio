"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, Trash2 } from "lucide-react";
import UploadZone from "@/components/admin/UploadZone";
import { detectDesignDimensionsFromUrl, formatLabel } from "@/lib/design-image";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category, GalleryDesign, GalleryDesignInput } from "@/lib/types/database";

const gradientPresets = [
  "from-violet-700 to-indigo-900",
  "from-purple-700 to-fuchsia-900",
  "from-blue-700 to-indigo-900",
];

type Props = {
  initial: GalleryDesign;
};

export default function GalleryDesignForm({ initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState(initial.title);
  const [mediaUrl, setMediaUrl] = useState(initial.media_url);
  const [categoryId, setCategoryId] = useState(initial.category_id || "");
  const [published, setPublished] = useState(initial.published);
  const [color, setColor] = useState(initial.metadata?.color || gradientPresets[0]);
  const [aspectRatio, setAspectRatio] = useState<"square" | "portrait">(
    initial.metadata?.aspectRatio || "square"
  );

  useEffect(() => {
    fetch("/api/categories?type=design")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaUrl) {
      setError("Please upload an image");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let imageWidth = initial.metadata?.imageWidth;
      let imageHeight = initial.metadata?.imageHeight;
      if (mediaUrl !== initial.media_url || !imageWidth || !imageHeight) {
        const detected = await detectDesignDimensionsFromUrl(mediaUrl);
        imageWidth = detected.width;
        imageHeight = detected.height;
        setAspectRatio(detected.aspectRatio);
      }

      const payload: Partial<GalleryDesignInput> = {
        title: title.trim() || "Untitled",
        media_url: mediaUrl,
        category_id: categoryId || null,
        published,
        metadata: { color, aspectRatio, imageWidth, imageHeight },
      };

      const res = await fetch(`/api/gallery-designs/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to save");

      router.push("/admin/categories");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "This will remove the design from the Gallery only.\nHomepage portfolio sections will remain unchanged."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/gallery-designs/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/admin/categories");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-zinc-500 text-sm">
        Gallery-only edit. Changes here do not affect homepage Featured Flyers unless you use{" "}
        <strong className="text-zinc-300">Feature on Homepage</strong> from the gallery editor.
      </p>

      <div>
        <label className="block text-zinc-400 text-xs font-medium mb-2">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" />
      </div>

      <div>
        <label className="block text-zinc-400 text-xs font-medium mb-2">Image</label>
        <UploadZone
          type="design"
          onUploaded={setMediaUrl}
          currentUrl={mediaUrl}
          onDesignFormatDetected={setAspectRatio}
        />
        {mediaUrl && (
          <p className="text-zinc-500 text-xs mt-1">Format: {formatLabel(aspectRatio)}</p>
        )}
      </div>

      <div>
        <label className="block text-zinc-400 text-xs font-medium mb-2">Gallery section</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="admin-input"
        >
          <option value="">Unassigned</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published on /designs
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" disabled={saving || deleting} className="admin-btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
        <Link href="/admin/categories" className="admin-btn-secondary">
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving || deleting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 ml-auto"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Delete from gallery
        </button>
      </div>
    </form>
  );
}
