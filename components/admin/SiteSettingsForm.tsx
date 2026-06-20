"use client";

import { useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import type { SiteSettings } from "@/lib/site-settings-read";

function SettingSelect({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <div>
      <label className="block text-zinc-400 text-xs font-medium mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="admin-input"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="text-zinc-600 text-xs mt-1">{hint}</p>
    </div>
  );
}

const repeatOptions = [
  { value: 2, label: "2× — smooth infinite scroll (recommended)" },
  { value: 3, label: "3× — extra loop padding" },
  { value: 4, label: "4× — maximum loop padding" },
];

const scrollSpeedOptions = [
  { value: 35, label: "Fast" },
  { value: 45, label: "Medium" },
  { value: 60, label: "Normal (recommended)" },
  { value: 75, label: "Slow" },
  { value: 90, label: "Very slow" },
];

export default function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [settings, setSettings] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("heroAlt", settings.heroAlt);

    try {
      const res = await fetch("/api/settings", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSettings((prev) => ({ ...prev, heroImage: data.heroImage }));
      setMessage("Hero photo updated!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data);
      setMessage("Settings saved!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold">Hero Profile Photo</h2>
          <p className="text-zinc-500 text-sm mt-1">Main photo at the top of your portfolio.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative w-[180px] h-[240px] sm:w-[200px] sm:h-[270px] rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.heroImage}
              alt={settings.heroAlt}
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload New Photo"}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>

            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">Alt text</label>
              <input
                value={settings.heroAlt}
                onChange={(e) => update("heroAlt", e.target.value)}
                className="admin-input"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-2">Image path</label>
              <input
                value={settings.heroImage}
                onChange={(e) => update("heroImage", e.target.value)}
                className="admin-input font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold">Flyer Showcase</h2>
          <p className="text-zinc-500 text-sm mt-1">Control how designs scroll and repeat on the homepage.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SettingSelect
            label="Number of rows"
            hint="3 rows spreads designs across rows — each flyer appears once before repeating."
            value={settings.portfolioRows}
            onChange={(v) => update("portfolioRows", v)}
            options={[
              { value: 1, label: "1 row" },
              { value: 2, label: "2 rows" },
              { value: 3, label: "3 rows (recommended)" },
            ]}
          />
          <SettingSelect
            label="Loop copies"
            value={settings.portfolioRepeat}
            onChange={(v) => update("portfolioRepeat", v)}
            hint="2× duplicates the row once for seamless scroll — not the same flyer back-to-back."
            options={repeatOptions}
          />
          <SettingSelect
            label="Scroll speed"
            value={settings.portfolioScrollDuration}
            onChange={(v) => update("portfolioScrollDuration", v)}
            hint="Slower = more time between seeing the same design again."
            options={scrollSpeedOptions}
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold">Clients & Videos</h2>
          <p className="text-zinc-500 text-sm mt-1">Same repeat controls for client logos and video reels.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SettingSelect
            label="Client rows"
            value={settings.clientRows}
            onChange={(v) => update("clientRows", v)}
            hint="How many scrolling rows for client logos."
            options={[
              { value: 1, label: "1 row" },
              { value: 2, label: "2 rows" },
              { value: 3, label: "3 rows" },
            ]}
          />
          <SettingSelect
            label="Client loop copies"
            value={settings.clientRepeat}
            onChange={(v) => update("clientRepeat", v)}
            hint="2× for seamless infinite scroll."
            options={repeatOptions}
          />
          <SettingSelect
            label="Client scroll speed"
            value={settings.clientScrollDuration}
            onChange={(v) => update("clientScrollDuration", v)}
            hint="Slower scroll = logos repeat less often."
            options={scrollSpeedOptions}
          />
          <SettingSelect
            label="Video loop copies"
            value={settings.videoRepeat}
            onChange={(v) => update("videoRepeat", v)}
            hint="2× for seamless reel loop."
            options={repeatOptions}
          />
          <SettingSelect
            label="Video scroll speed"
            value={settings.videoScrollDuration}
            onChange={(v) => update("videoScrollDuration", v)}
            hint="Slower scroll = reels repeat less often."
            options={scrollSpeedOptions}
          />
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.includes("failed") || message.includes("error") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}

      <button type="submit" disabled={saving} className="admin-btn-primary">
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        Save Settings
      </button>
    </form>
  );
}
