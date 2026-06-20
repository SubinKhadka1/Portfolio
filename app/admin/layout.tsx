import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Subin Portfolio",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">
      {children}
    </div>
  );
}
