"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { createGalleryDesign, uploadDesignFile } from "@/lib/gallery-design-create";
import type { Project } from "@/lib/types/database";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/jpg,.jpg,.jpeg,.png,.webp,.gif";

function isImageFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
}

export default function SectionDesignUpload({
  categoryId,
  categoryName,
  nextSortOrder,
  disabled,
  onCreated,
  onError,
}: {
  categoryId: string;
  categoryName: string;
  nextSortOrder: number;
  disabled?: boolean;
  onCreated: (projects: Project[]) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const allowed = files.filter(isImageFile);
      if (!allowed.length) {
        onError("Please choose JPG, PNG, or WebP images.");
        return;
      }

      setUploading(true);
      const created: Project[] = [];
      const failures: string[] = [];

      try {
        for (let i = 0; i < allowed.length; i++) {
          const file = allowed[i];
          setProgress(`Uploading ${i + 1} of ${allowed.length}…`);
          try {
            const url = await uploadDesignFile(file);
            const project = await createGalleryDesign({
              mediaUrl: url,
              categoryId,
              gallerySortOrder: nextSortOrder + i * 1_000,
              showOnHomepage: false,
            });
            created.push(project);
          } catch (err) {
            failures.push(err instanceof Error ? err.message : `Failed: ${file.name}`);
          }
        }

        if (created.length) onCreated(created);
        if (failures.length) {
          onError(failures.join(" "));
        }
      } finally {
        setUploading(false);
        setProgress("");
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [categoryId, nextSortOrder, onCreated, onError]
  );

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) void uploadFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    void uploadFiles(Array.from(e.dataTransfer.files || []));
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
            <span className="admin-gallery-upload__text">{progress || "Uploading…"}</span>
          </>
        ) : (
          <>
            <Upload size={22} className="text-purple-400" />
            <span className="admin-gallery-upload__text">
              Upload to <strong>{categoryName}</strong>
            </span>
            <span className="admin-gallery-upload__hint">
              Drag images here or click to choose from your device
            </span>
          </>
        )}
      </button>
    </div>
  );
}
