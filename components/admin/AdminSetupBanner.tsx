"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SyncDeployedDataButton from "@/components/admin/SyncDeployedDataButton";

type StorageStatus = {
  mode?: string;
  canSaveOnLive?: boolean;
  blobSuspended?: boolean;
  blobError?: string;
  activeBackend?: string;
  supabaseJson?: boolean;
  githubJson?: boolean;
  message?: string;
};

export default function AdminSetupBanner() {
  const [status, setStatus] = useState<StorageStatus | null>(null);

  useEffect(() => {
    fetch("/api/admin/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  if (status.blobSuspended && !status.canSaveOnLive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
        <p className="text-red-200 text-sm font-semibold">Vercel Blob is suspended — admin cannot save</p>
        <p className="text-red-200/80 text-xs mt-2 leading-relaxed">
          Your Hobby plan hit its limit, so uploads and design edits are blocked until storage works
          again.
        </p>
        <ol className="text-red-200/80 text-xs mt-3 space-y-1.5 list-decimal list-inside">
          <li>
            <strong>Fastest fix:</strong> Vercel Dashboard → Billing → upgrade to Pro, then unsuspend Blob
          </li>
          <li>
            <strong>Free fix:</strong> Add Supabase (see{" "}
            <Link href="https://supabase.com" className="underline" target="_blank">
              supabase.com
            </Link>
            ) — set <code className="text-red-100">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code className="text-red-100">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
            <code className="text-red-100">SUPABASE_SERVICE_ROLE_KEY</code> on Vercel, create buckets{" "}
            <code className="text-red-100">site-data</code> and <code className="text-red-100">portfolio-media</code>{" "}
            (public), redeploy
          </li>
          <li>
            Or set <code className="text-red-100">GITHUB_TOKEN</code> on Vercel (repo write access) as backup
          </li>
        </ol>
      </div>
    );
  }

  if (status.blobSuspended && status.canSaveOnLive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
        <p className="text-amber-200 text-sm font-semibold">Vercel Blob suspended — using backup storage</p>
        <p className="text-amber-200/80 text-xs mt-2 leading-relaxed">
          Admin edits are saving via <strong>{status.activeBackend}</strong>. Your site will keep working.
          Upgrade Vercel or keep Supabase/GitHub configured.
        </p>
      </div>
    );
  }

  if (status.mode === "live-blocked") {
    return (
      <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
        <p className="text-red-200 text-sm font-semibold">Live admin cannot save changes</p>
        <p className="text-red-200/80 text-xs mt-2 leading-relaxed">
          Connect Vercel Blob, Supabase, or GitHub token on Vercel so edits go live.
        </p>
      </div>
    );
  }

  if (status.mode === "live-fallback" && status.canSaveOnLive && !status.blobSuspended) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <p className="text-emerald-200 text-sm font-medium">Live editing enabled</p>
        <p className="text-emerald-200/70 text-xs mt-1 leading-relaxed">
          Saving via <strong>{status.activeBackend}</strong>. Changes appear on your homepage within seconds.
        </p>
        <SyncDeployedDataButton />
      </div>
    );
  }

  if (status.mode === "live-blob" && status.canSaveOnLive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <p className="text-emerald-200 text-sm font-medium">Live editing enabled</p>
        <p className="text-emerald-200/70 text-xs mt-1 leading-relaxed">
          Changes save to cloud storage and appear on your homepage within seconds.
        </p>
        <SyncDeployedDataButton />
      </div>
    );
  }

  if (status.mode === "local") {
    return (
      <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
        <p className="text-amber-200 text-sm font-medium">Localhost mode</p>
        <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
          Changes save to <code className="text-amber-100">data/portfolio.json</code> on this computer. Run{" "}
          <code className="text-amber-100">npm run ship</code> to push code; use live admin for instant site
          updates.
        </p>
      </div>
    );
  }

  return null;
}
