import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isLocalAuthConfigured } from "@/lib/local-auth";

export default function AdminSetupBanner() {
  const supabaseReady = isSupabaseConfigured();
  const localAuthReady = isLocalAuthConfigured();

  if (supabaseReady) return null;

  return (
    <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
      <p className="text-emerald-200 text-sm font-medium">Local admin mode active</p>
      <p className="text-emerald-200/70 text-xs mt-1 leading-relaxed">
        {localAuthReady
          ? "Your portfolio is saved locally in data/portfolio.json. Uploads go to the public folder. Add Supabase keys to .env.local when you want cloud storage and multi-device sync."
          : "Add ADMIN_EMAIL and ADMIN_PASSWORD to .env.local to sign in."}
      </p>
    </div>
  );
}
