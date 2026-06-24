"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import UploadZone from "@/components/admin/UploadZone";
import type { Category, Project, ProjectInput, ProjectType } from "@/lib/types/database";
import { clampMarqueeRow } from "@/lib/marquee";
import { detectDesignAspectRatioFromUrl, detectDesignDimensionsFromUrl, formatLabel } from "@/lib/design-image";
import { parseResponseJson } from "@/lib/parse-response";

type ProjectFormProps = {
  initial?: Project;
  defaultType?: ProjectType;
  portfolioRows?: number;
  defaultMarqueeRow?: number;
};

const gradientPresets = [
  "from-violet-700 to-indigo-900",
  "from-yellow-700 to-orange-900",
  "from-green-700 to-emerald-900",
  "from-purple-700 to-fuchsia-900",
  "from-blue-700 to-indigo-900",
  "from-pink-700 to-rose-900",
  "from-red-700 to-yellow-900",
  "from-blue-700 to-cyan-900",
  "from-emerald-700 to-teal-900",
  "from-slate-700 to-gray-900",
  "from-sky-700 to-blue-900",
];

function titleFromMediaUrl(url: string) {
  const raw = url.split("/").pop()?.replace(/\.[^.]+$/, "") || "Untitled";
  const decoded = decodeURIComponent(raw);
  const withoutTimestamp = decoded.replace(/^\d+-/, "");
  return withoutTimestamp.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export default function ProjectForm({
  initial,
  defaultType = "design",
  portfolioRows = 3,
  defaultMarqueeRow,
}: ProjectFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<ProjectType>(initial?.type || defaultType);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [mediaUrl, setMediaUrl] = useState(initial?.media_url || "");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const allowMultiple = !isEdit && (type === "design" || type === "video");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [published, setPublished] = useState(initial?.published ?? true);
  const [color, setColor] = useState(initial?.metadata?.color || gradientPresets[0]);
  const [aspectRatio, setAspectRatio] = useState<"square" | "portrait">(
    initial?.metadata?.aspectRatio || "square"
  );
  const [urlAspectRatios, setUrlAspectRatios] = useState<Record<string, "square" | "portrait">>({});
  const [marqueeRow, setMarqueeRow] = useState<1 | 2 | 3>(
    clampMarqueeRow(
      initial?.metadata?.marqueeRow ?? defaultMarqueeRow ?? 1,
      portfolioRows
    )
  );
  const [duration, setDuration] = useState(initial?.metadata?.duration || "0:30");
  const [clipStart, setClipStart] = useState(initial?.metadata?.clipStart ?? 0);
  const [clipEnd, setClipEnd] = useState(initial?.metadata?.clipEnd ?? 8);
  const [showOnHomepage, setShowOnHomepage] = useState(initial?.metadata?.showOnHomepage ?? true);
  const [showInGallery, setShowInGallery] = useState(initial?.metadata?.showInGallery ?? true);
  const [className, setClassName] = useState(initial?.metadata?.className || "");
  const [containerClass, setContainerClass] = useState(initial?.metadata?.containerClass || "");

  useEffect(() => {
    fetch(`/api/categories?type=${type}`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, [type]);

  useEffect(() => {
    if (!isEdit) {
      setMediaUrls([]);
      setMediaUrl("");
    }
  }, [type, isEdit]);

  function buildPayload(media_url: string, itemTitle?: string): ProjectInput {
    const metadata: ProjectInput["metadata"] = {};
    if (type === "design") {
      metadata.color = color;
      metadata.aspectRatio = aspectRatio;
      metadata.marqueeRow = clampMarqueeRow(marqueeRow, portfolioRows);
      metadata.showOnHomepage = showOnHomepage;
      metadata.showInGallery = showInGallery;
    }
    if (type === "video") {
      metadata.duration = duration;
      metadata.clipStart = clipStart;
      metadata.clipEnd = clipEnd;
    }
    if (type === "client") {
      metadata.className = className;
      metadata.containerClass = containerClass;
      metadata.marqueeRow = clampMarqueeRow(marqueeRow, portfolioRows);
    }

    const resolvedTitle =
      allowMultiple && mediaUrls.length > 1
        ? itemTitle || titleFromMediaUrl(media_url)
        : title || itemTitle || titleFromMediaUrl(media_url);

    return {
      type,
      title: resolvedTitle,
      description,
      media_url,
      category_id: categoryId || null,
      featured,
      published,
      metadata,
    };
  }

  async function buildDesignPayload(media_url: string) {
    let resolvedAspect = aspectRatio;
    let imageWidth = initial?.metadata?.imageWidth;
    let imageHeight = initial?.metadata?.imageHeight;

    if (allowMultiple || !imageWidth || !imageHeight) {
      const detected = await detectDesignDimensionsFromUrl(media_url);
      resolvedAspect = detected.aspectRatio;
      imageWidth = detected.width;
      imageHeight = detected.height;
    }

    const metadata: ProjectInput["metadata"] = {
      color,
      aspectRatio: resolvedAspect,
      imageWidth,
      imageHeight,
      marqueeRow: clampMarqueeRow(marqueeRow, portfolioRows),
      showOnHomepage,
      showInGallery,
    };
    return {
      type,
      title:
        mediaUrls.length > 1
          ? titleFromMediaUrl(media_url)
          : title.trim() || titleFromMediaUrl(media_url),
      description,
      media_url,
      category_id: categoryId || null,
      featured,
      published,
      metadata,
    } satisfies ProjectInput;
  }

  async function saveProject(payload: ProjectInput) {
    const url = isEdit ? `/api/projects/${initial!.id}` : "/api/projects";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseResponseJson<Project & { error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to save");
    if (!data.id) {
      throw new Error("Save did not complete. Please try again — your live data may still be syncing.");
    }
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (allowMultiple) {
      if (mediaUrls.length === 0) {
        setError(`Please upload at least one ${type}`);
        return;
      }
    } else if (!mediaUrl) {
      setError("Please upload a file first");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isEdit) {
        const payload =
          type === "design" ? await buildDesignPayload(mediaUrl) : buildPayload(mediaUrl);
        await saveProject(payload);
      } else if (allowMultiple) {
        for (const url of mediaUrls) {
          const payload = type === "design" ? await buildDesignPayload(url) : buildPayload(url);
          await saveProject(payload);
        }
      } else {
        const payload =
          type === "design" ? await buildDesignPayload(mediaUrl) : buildPayload(mediaUrl);
        await saveProject(payload);
      }

      router.push(`/admin/projects?type=${type}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial || !confirm("Delete this project permanently?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push(`/admin/projects?type=${type}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {!isEdit && (
        <div>
          <label className="block text-zinc-400 text-xs font-medium mb-2">Project Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["design", "video", "client"] as ProjectType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  type === t
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-zinc-400 text-xs font-medium mb-2">
          {type === "client" ? "Client Name" : allowMultiple ? "Title (optional)" : "Title"}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="admin-input"
          placeholder={
            allowMultiple
              ? "Leave blank to use each file name"
              : type === "client"
                ? "Company name"
                : "Project title"
          }
        />
        {allowMultiple && (
          <p className="text-zinc-500 text-xs mt-1">
            When adding multiple files, each item uses its file name as the title.
          </p>
        )}
      </div>

      {type !== "client" && (
        <div>
          <label className="block text-zinc-400 text-xs font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="admin-input resize-none"
            placeholder="Brief description..."
          />
        </div>
      )}

      <div>
        <label className="block text-zinc-400 text-xs font-medium mb-2">
          {type === "video" ? "Video Files" : type === "client" ? "Logo" : "Design Images"}
        </label>
        {allowMultiple ? (
          <UploadZone
            type={type}
            multiple
            onMultipleChange={setMediaUrls}
            currentUrls={mediaUrls}
            onDesignFormatForUrl={(url, ratio) =>
              setUrlAspectRatios((prev) => ({ ...prev, [url]: ratio }))
            }
          />
        ) : (
          <UploadZone
            type={type}
            onUploaded={setMediaUrl}
            currentUrl={mediaUrl}
            onDesignFormatDetected={type === "design" ? setAspectRatio : undefined}
          />
        )}
        {type === "design" && mediaUrl && !allowMultiple && (
          <p className="text-zinc-500 text-xs mt-1">
            Detected: {formatLabel(aspectRatio)} — change below if needed
          </p>
        )}
      </div>

      <div>
        <label className="block text-zinc-400 text-xs font-medium mb-2">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="admin-input"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-zinc-600 text-xs mt-1">Used on the /designs gallery page only.</p>
      </div>

      {type === "design" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnHomepage}
              onChange={(e) => setShowOnHomepage(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm text-white font-medium">Homepage marquee</span>
              <span className="block text-xs text-zinc-500 mt-0.5">Show in the scrolling showcase on the main site.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 cursor-pointer">
            <input
              type="checkbox"
              checked={showInGallery}
              onChange={(e) => setShowInGallery(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm text-white font-medium">Design gallery page</span>
              <span className="block text-xs text-zinc-500 mt-0.5">Show on /designs under the selected category.</span>
            </span>
          </label>
        </div>
      )}

      {type === "design" && (
        <>
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-2">Showcase Row</label>
            <div className={`grid gap-2 ${portfolioRows >= 3 ? "grid-cols-3" : portfolioRows === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {Array.from({ length: clampMarqueeRow(portfolioRows, 3) }, (_, i) => {
                const row = (i + 1) as 1 | 2 | 3;
                return (
                  <button
                    key={row}
                    type="button"
                    onClick={() => setMarqueeRow(row)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      marqueeRow === row
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    Row {row}
                  </button>
                );
              })}
            </div>
            <p className="text-zinc-500 text-xs mt-1">
              Which scrolling row this flyer appears in on the homepage.
            </p>
          </div>
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-2">Flyer Format</label>
            {allowMultiple && mediaUrls.length > 1 ? (
              <p className="text-zinc-500 text-xs rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
                Square vs portrait is detected automatically from each image when you upload multiple designs.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(["square", "portrait"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      aspectRatio === ratio
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {ratio === "square" ? "1080 × 1080" : "1080 × 1350"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-2">Fallback Gradient</label>
            <select value={color} onChange={(e) => setColor(e.target.value)} className="admin-input">
              {gradientPresets.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === "video" && (
        <>
          {!allowMultiple && mediaUrl && (
            <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black">
              <video src={mediaUrl} className="w-full max-h-64" controls playsInline />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">Duration</label>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} className="admin-input" placeholder="0:30" />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">Clip Start (s)</label>
              <input type="number" value={clipStart} onChange={(e) => setClipStart(Number(e.target.value))} className="admin-input" min={0} />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">Clip End (s)</label>
              <input type="number" value={clipEnd} onChange={(e) => setClipEnd(Number(e.target.value))} className="admin-input" min={0} />
            </div>
          </div>
          <p className="text-zinc-500 text-xs">
            Clip start/end control which seconds play in the homepage video showcase loop.
          </p>
        </>
      )}

      {type === "client" && (
        <>
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-2">Client Row</label>
            <div className={`grid gap-2 ${portfolioRows >= 3 ? "grid-cols-3" : portfolioRows === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {Array.from({ length: clampMarqueeRow(portfolioRows, 3) }, (_, i) => {
                const row = (i + 1) as 1 | 2 | 3;
                return (
                  <button
                    key={row}
                    type="button"
                    onClick={() => setMarqueeRow(row)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      marqueeRow === row
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    Row {row}
                  </button>
                );
              })}
            </div>
            <p className="text-zinc-500 text-xs mt-1">
              Which scrolling row this logo appears in on the homepage.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">CSS Class (optional)</label>
              <input value={className} onChange={(e) => setClassName(e.target.value)} className="admin-input" placeholder="scale-[1.2]" />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">Container Class (optional)</label>
              <input value={containerClass} onChange={(e) => setContainerClass(e.target.value)} className="admin-input" />
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-purple-500" />
          <span className="text-sm text-zinc-300">Featured</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-purple-500" />
          <span className="text-sm text-zinc-300">Published (visible on site)</span>
        </label>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={saving} className="admin-btn-primary">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isEdit
            ? "Save Changes"
            : allowMultiple && mediaUrls.length > 1
              ? `Create ${mediaUrls.length} ${type === "design" ? "designs" : "videos"}`
              : allowMultiple && mediaUrls.length === 1
                ? `Create ${type}`
                : "Create Project"}
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} disabled={deleting} className="admin-btn-danger">
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
