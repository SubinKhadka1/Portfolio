import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import { getSiteSettings } from "@/lib/site-settings-read";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Site Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Hero photo, flyer rows, and scroll repetition</p>
      </div>
      <SiteSettingsForm initial={settings} />
    </div>
  );
}
