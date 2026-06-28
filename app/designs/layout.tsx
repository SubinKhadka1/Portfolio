import DesignsPageShell from "@/components/DesignsPageShell";

export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignsPageShell>
      <div className="designs-page-root min-h-screen bg-white text-[#191919]">{children}</div>
    </DesignsPageShell>
  );
}
