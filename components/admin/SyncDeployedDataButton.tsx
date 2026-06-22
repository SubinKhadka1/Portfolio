"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { parseResponseJson } from "@/lib/parse-response";

export default function SyncDeployedDataButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    if (
      !confirm(
        "Import portfolio data from the latest GitHub deploy into live storage? This overwrites live editor data with what's in your last deployment."
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/sync-bundle", { method: "POST" });
      const data = await parseResponseJson<{ message?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setMessage(data.message || "Synced successfully. Refresh the homepage.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={sync}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Import latest GitHub deploy to live storage
      </button>
      {message && <p className="text-xs mt-2 text-zinc-400">{message}</p>}
    </div>
  );
}
