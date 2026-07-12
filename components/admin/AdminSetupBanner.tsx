"use client";

import { useEffect, useState } from "react";
import SyncDeployedDataButton from "@/components/admin/SyncDeployedDataButton";

type StorageStatus = {
  mode?: string;
  canSaveOnLive?: boolean;
  supabaseStorage?: boolean;
  supabaseOk?: boolean;
  supabaseError?: string;
  activeBackend?: string;
  message?: string;
  keyIssues?: { field: string; message: string }[];
  storageDiagnostics?: {
    keysSwapped?: boolean;
    serviceRoleKeyType?: string;
  };
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

  if (status.keyIssues && status.keyIssues.length > 0) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
        <p className="text-red-200 text-sm font-semibold">Supabase API keys need fixing on Vercel</p>
        <ul className="text-red-200/80 text-xs mt-2 leading-relaxed list-disc pl-4 space-y-1">
          {status.keyIssues.map((issue) => (
            <li key={issue.field}>
              <code className="text-red-100">{issue.field}</code>: {issue.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (status.mode === "live-blocked") {
    return (
      <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
        <p className="text-red-200 text-sm font-semibold">Live admin cannot save changes</p>
        <p className="text-red-200/80 text-xs mt-2 leading-relaxed">
          Add <code className="text-red-100">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="text-red-100">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code className="text-red-100">SUPABASE_SERVICE_ROLE_KEY</code> on Vercel. Create public
          buckets <code className="text-red-100">site-data</code> and{" "}
          <code className="text-red-100">portfolio-media</code>, then redeploy.
        </p>
      </div>
    );
  }

  if (status.mode === "supabase" && status.canSaveOnLive && !status.supabaseOk) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
        <p className="text-amber-200 text-sm font-semibold">Supabase connected — site-data is empty</p>
        <p className="text-amber-200/80 text-xs mt-2 leading-relaxed">
          {status.supabaseError || "Upload portfolio.json to the site-data bucket, or import from Git below."}
        </p>
        <SyncDeployedDataButton />
      </div>
    );
  }

  if (status.mode === "supabase" && status.canSaveOnLive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <p className="text-emerald-200 text-sm font-medium">Live editing enabled (Supabase Storage)</p>
        <p className="text-emerald-200/70 text-xs mt-1 leading-relaxed">
          JSON saves to <code className="text-emerald-100">site-data</code>, uploads go to{" "}
          <code className="text-emerald-100">portfolio-media</code>. Changes appear within seconds.
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
          Changes save to <code className="text-amber-100">data/*.json</code> on this computer. With
          Supabase env vars set, saves also go to your cloud buckets.
        </p>
      </div>
    );
  }

  return null;
}
