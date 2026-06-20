"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Film } from "lucide-react";
import type { ProjectType } from "@/lib/types/database";
import { parseResponseJson } from "@/lib/parse-response";
import { formatBytes, prepareDesignUpload } from "@/lib/compress-design-image";
import { detectDesignAspectRatioFromUrl, formatLabel } from "@/lib/design-image";

type UploadZoneProps = {
  type: ProjectType;
  multiple?: boolean;
  onUploaded?: (url: string) => void;
  onMultipleChange?: (urls: string[]) => void;
  onDesignFormatDetected?: (aspectRatio: "square" | "portrait") => void;
  onDesignFormatForUrl?: (url: string, aspectRatio: "square" | "portrait") => void;
  currentUrl?: string;
  currentUrls?: string[];
  accept?: string;
};

const acceptMap: Record<ProjectType, string> = {
  design: "image/jpeg,image/png,image/webp,image/gif,image/jpg,.jpg,.jpeg,.png,.webp,.gif",
  video: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
  client: "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg",
};

function isAllowedFile(type: ProjectType, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (type === "design") {
    return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  }
  if (type === "video") {
    return file.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext);
  }
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "svg", "gif"].includes(ext);
}

function filterFiles(type: ProjectType, files: File[]) {
  const allowed = files.filter((f) => isAllowedFile(type, f));
  const rejected = files.length - allowed.length;
  return {
    allowed,
    rejectedMessage:
      rejected > 0
        ? `${rejected} file(s) skipped — use JPG, PNG, or WebP for designs.`
        : "",
  };
}

export default function UploadZone({
  type,
  multiple = false,
  onUploaded,
  onMultipleChange,
  onDesignFormatDetected,
  onDesignFormatForUrl,
  currentUrl,
  currentUrls = [],
  accept,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl || "");
  const [previews, setPreviews] = useState<string[]>(currentUrls);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [detectedFormat, setDetectedFormat] = useState("");
  const [optimizeNote, setOptimizeNote] = useState("");

  useEffect(() => {
    if (!multiple) setPreview(currentUrl || "");
  }, [currentUrl, multiple]);

  useEffect(() => {
    if (multiple) setPreviews(currentUrls);
  }, [currentUrls, multiple]);

  useEffect(() => {
    fetch(`/api/media?type=${type}`)
      .then((r) => r.json())
      .then((files) => Array.isArray(files) && setExistingFiles(files))
      .catch(() => {});
  }, [type]);

  const detectFormat = useCallback(
    async (url: string) => {
      if (type !== "design") return;
      const ratio = await detectDesignAspectRatioFromUrl(url);
      setDetectedFormat(formatLabel(ratio));
      onDesignFormatDetected?.(ratio);
    },
    [type, onDesignFormatDetected]
  );

  const uploadOne = useCallback(
    async (file: File) => {
      let uploadFile = file;
      let detectedRatio: "square" | "portrait" | undefined;
      if (type === "design") {
        setUploadProgress(`Preparing ${file.name}...`);
        const prepared = await prepareDesignUpload(file);
        uploadFile = prepared.file;
        detectedRatio = prepared.aspectRatio;
        if (prepared.optimized) {
          setOptimizeNote(
            `Optimized ${file.name} (${formatBytes(file.size)} → ${formatBytes(uploadFile.size)}) for ${formatLabel(prepared.aspectRatio)}`
          );
        }
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("type", type);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await parseResponseJson<{ url?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || `Upload failed for ${file.name}`);
      if (!data.url) throw new Error(`Upload failed for ${file.name} — no file URL returned.`);

      if (type === "design" && detectedRatio) {
        onDesignFormatForUrl?.(data.url, detectedRatio);
        if (!multiple) onDesignFormatDetected?.(detectedRatio);
      }

      return data.url;
    },
    [type, multiple, onDesignFormatDetected, onDesignFormatForUrl]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const { allowed, rejectedMessage } = filterFiles(type, files);
      if (!allowed.length) {
        setError(rejectedMessage || "No supported files selected.");
        return;
      }

      setUploading(true);
      setError("");
      setOptimizeNote("");

      const failures: string[] = [];
      if (rejectedMessage) failures.push(rejectedMessage);

      try {
        if (multiple) {
          const next = [...previews];
          const newUrls: string[] = [];
          for (let i = 0; i < allowed.length; i++) {
            setUploadProgress(`Uploading ${i + 1} of ${allowed.length}...`);
            try {
              const url = await uploadOne(allowed[i]);
              if (!next.includes(url)) {
                next.push(url);
                newUrls.push(url);
              }
            } catch (err) {
              failures.push(err instanceof Error ? err.message : `Failed: ${allowed[i].name}`);
            }
          }
          setPreviews(next);
          onMultipleChange?.(next);
          if (newUrls.length) {
            setExistingFiles((prev) => [...new Set([...prev, ...newUrls])]);
          }
        } else {
          const url = await uploadOne(allowed[0]);
          setPreview(url);
          onUploaded?.(url);
          await detectFormat(url);
          setExistingFiles((prev) => (prev.includes(url) ? prev : [...prev, url]));
        }

        if (failures.length) {
          setError(failures.join(" "));
        }
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
    },
    [multiple, onMultipleChange, onUploaded, previews, type, uploadOne, detectFormat]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
    e.target.value = "";
  }

  async function selectExisting(url: string) {
    if (multiple) {
      if (previews.includes(url)) return;
      const next = [...previews, url];
      setPreviews(next);
      onMultipleChange?.(next);
    } else {
      setPreview(url);
      onUploaded?.(url);
      await detectFormat(url);
    }
  }

  function removeUrl(url: string) {
    if (multiple) {
      const next = previews.filter((u) => u !== url);
      setPreviews(next);
      onMultipleChange?.(next);
    } else {
      setPreview("");
      setDetectedFormat("");
      onUploaded?.("");
    }
  }

  const isVideo = type === "video";
  const fileLabel = type === "video" ? "videos" : type === "design" ? "designs" : "files";

  return (
    <div className="space-y-3">
      {multiple && previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {previews.map((url) => (
            <div key={url} className="relative rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
              {isVideo ? (
                <video src={url} className="w-full h-24 object-cover bg-black" muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-24 object-contain bg-zinc-950 p-1" />
              )}
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
              >
                <X size={10} />
              </button>
              <p className="text-[10px] text-zinc-500 truncate px-1.5 py-1 border-t border-zinc-800">
                {decodeURIComponent(url.split("/").pop() || "")}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors ${
          dragging
            ? "border-purple-500 bg-purple-500/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <Loader2 size={32} className="animate-spin text-purple-400" />
            <p className="text-sm">{uploadProgress || "Uploading..."}</p>
          </div>
        ) : !multiple && preview ? (
          <div className="relative inline-block">
            {isVideo ? (
              <video src={preview} className="max-h-48 rounded-lg mx-auto" controls playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="max-h-40 rounded-lg mx-auto object-contain" />
            )}
            <button
              type="button"
              onClick={() => removeUrl(preview)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
            >
              <X size={12} />
            </button>
            {type === "design" && detectedFormat && (
              <p className="text-xs text-purple-300 mt-2">Detected format: {detectedFormat}</p>
            )}
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-3">
            {isVideo ? (
              <Film size={36} className="text-zinc-500" />
            ) : (
              <ImageIcon size={36} className="text-zinc-500" />
            )}
            <div>
              <p className="text-white font-medium text-sm">
                {multiple ? `Drag & drop or choose multiple ${fileLabel}` : "Drag & drop or click to upload"}
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                {type === "design" && "JPG, PNG, WebP — large files auto-resize to 1080×1080 or 1080×1350"}
                {type === "video" && "MP4, WebM up to 200MB"}
                {type === "client" && "Logo PNG, SVG, WebP up to 30MB"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
              <Upload size={16} />
              {multiple ? "Choose Files" : "Choose File"}
            </span>
            <input
              type="file"
              className="hidden"
              accept={accept || acceptMap[type]}
              multiple={multiple}
              onChange={handleFileInput}
            />
          </label>
        )}
      </div>

      {multiple && previews.length > 0 && !uploading && (
        <p className="text-zinc-500 text-xs">
          {previews.length} {fileLabel} selected · format auto-detected on save
        </p>
      )}

      {existingFiles.length > 0 && (
        <div>
          <p className="text-zinc-400 text-xs font-medium mb-2">
            {multiple
              ? `Or add from existing ${fileLabel}`
              : isVideo
                ? "Or pick an existing video"
                : "Or pick an existing file"}
          </p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {existingFiles.map((url) => {
              const name = decodeURIComponent(url.split("/").pop() || url);
              const selected = multiple ? previews.includes(url) : preview === url;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => selectExisting(url)}
                  disabled={multiple && selected}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selected
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-40"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {optimizeNote && !error && (
        <p className="text-green-400/90 text-xs">{optimizeNote}</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
