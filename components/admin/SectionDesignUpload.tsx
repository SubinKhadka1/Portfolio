"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { uploadDesignsToSection } from "@/lib/gallery-design-create";
import type { GalleryDesign } from "@/lib/types/database";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/jpg,.jpg,.jpeg,.png,.webp,.gif";

function isImageFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
}

export default function SectionDesignUpload({
  categoryId,
  categoryName,
  startSortOrder,
  disabled,
  onComplete,
}: {
  categoryId: string;
  categoryName: string;
  startSortOrder: number;
  disabled?: boolean;
  onComplete: (result: { created: GalleryDesign[]; failed: { name: string; error: string }[] }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastResult, setLastResult] = useState<{
    created: number;
    failed: { name: string; error: string }[];
  } | null>(null);

  const runUpload = useCallback(
    async (files: File[]) => {
      const allowed = files.filter(isImageFile);
      if (!allowed.length) {
        onComplete({ created: [], failed: [{ name: "files", error: "Please choose JPG, PNG, or WebP images." }] });
        return;
      }

      setUploading(true);
      setLastResult(null);
      setProgress(`Starting upload of ${allowed.length} image${allowed.length === 1 ? "" : "s"}…`);

      try {
        const result = await uploadDesignsToSection({
          files: allowed,
          categoryId,
          startSortOrder,
          onProgress: setProgress,
        });

        setLastResult({ created: result.created.length, failed: result.failed });
        onComplete(result);
      } finally {
        setUploading(false);
        setProgress("");
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [categoryId, startSortOrder, onComplete]
  );

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) void runUpload(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    void runUpload(Array.from(e.dataTransfer.files || []));
  }

  return (
    <div className="admin-gallery-upload">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={onInputChange}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`admin-gallery-upload__zone ${dragging ? "admin-gallery-upload__zone--active" : ""}`}
      >
        {uploading ? (
          <>
            <Loader2 size={22} className="animate-spin text-purple-400" />
            <span className="admin-gallery-upload__text">{progress || "Working…"}</span>
          </>
        ) : (
          <>
            <Upload size={22} className="text-purple-400" />
            <span className="admin-gallery-upload__text">
              Upload to <strong>{categoryName}</strong> only
            </span>
            <span className="admin-gallery-upload__hint">
              Select multiple images — they are added only to this section. Reorder them after upload.
            </span>
          </>
        )}
      </button>

      {lastResult && !uploading ? (
        <div className="admin-gallery-upload__result">
          {lastResult.created > 0 ? (
            <p className="admin-gallery-upload__result-ok">
              <CheckCircle2 size={14} />
              {lastResult.created} design{lastResult.created === 1 ? "" : "s"} added to {categoryName}.
            </p>
          ) : null}
          {lastResult.failed.length > 0 ? (
            <div className="admin-gallery-upload__result-fail">
              <p className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                <XCircle size={14} />
                {lastResult.failed.length} could not be added:
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-red-300/90">
                {lastResult.failed.map((item) => (
                  <li key={`${item.name}-${item.error}`}>
                    {item.name}: {item.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
