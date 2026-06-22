import { isLocalAuthConfigured } from "@/lib/local-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPersistenceStatus } from "@/lib/persistence-status";
import SyncDeployedDataButton from "@/components/admin/SyncDeployedDataButton";

export default function AdminSetupBanner() {
  const supabaseReady = isSupabaseConfigured();
  const localAuthReady = isLocalAuthConfigured();
  const status = getPersistenceStatus();

  if (supabaseReady) return null;

  if (status.mode === "live-blocked") {
    return (
      <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
        <p className="text-red-200 text-sm font-semibold">Live admin cannot save changes</p>
        <p className="text-red-200/80 text-xs mt-2 leading-relaxed">
          Your website at <strong>subinkhadka1.com.np</strong> runs on Vercel, which cannot write
          files like your laptop can. Edits from VS Code localhost will{" "}
          <strong>never</strong> appear on the live site automatically.
        </p>
        <ol className="text-red-200/80 text-xs mt-3 space-y-1.5 list-decimal list-inside">
          <li>
            Open <strong>Vercel → your project → Storage → Create Blob store</strong>
          </li>
          <li>Connect it to this project</li>
          <li>
            Set <code className="text-red-100">ADMIN_EMAIL</code> and{" "}
            <code className="text-red-100">ADMIN_PASSWORD</code> in Vercel Environment Variables
          </li>
          <li>Redeploy, then edit from the live admin URL</li>
        </ol>
      </div>
    );
  }

  if (status.mode === "live-blob") {
    return (
      <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <p className="text-emerald-200 text-sm font-medium">Live editing enabled</p>
        <p className="text-emerald-200/70 text-xs mt-1 leading-relaxed">
          Changes you make here save to cloud storage and appear on your homepage within seconds.
          VS Code localhost is separate — use the button below after pushing code to GitHub if you
          edited locally first.
        </p>
        <SyncDeployedDataButton />
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
      <p className="text-amber-200 text-sm font-medium">Localhost only — not connected to live site</p>
      <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
        {localAuthReady ? (
          <>
            Changes save to <code className="text-amber-100">data/portfolio.json</code> on your Mac.
            They do <strong>not</strong> update subinkhadka1.com.np until you either:
          </>
        ) : (
          "Add ADMIN_EMAIL and ADMIN_PASSWORD to .env.local to sign in."
        )}
      </p>
      {localAuthReady && (
        <ul className="text-amber-200/70 text-xs mt-2 space-y-1 list-disc list-inside">
          <li>
            Push to GitHub: <code className="text-amber-100">npm run ship</code>, then on live admin
            click &quot;Import latest GitHub deploy&quot; (if Blob is enabled), or
          </li>
          <li>Edit directly at your live admin URL (after Vercel Blob is set up)</li>
        </ul>
      )}
    </div>
  );
}
