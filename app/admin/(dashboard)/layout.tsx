import { Suspense } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminSetupBanner from "@/components/admin/AdminSetupBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="w-64 bg-zinc-950 border-r border-zinc-800" />}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          <AdminSetupBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
