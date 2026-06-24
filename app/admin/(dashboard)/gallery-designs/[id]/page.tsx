import { notFound } from "next/navigation";
import GalleryDesignForm from "@/components/admin/GalleryDesignForm";
import { fetchGalleryDesignById } from "@/lib/fetch-project-by-id";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditGalleryDesignPage({ params }: PageProps) {
  const { id } = await params;
  const design = await fetchGalleryDesignById(id);
  if (!design) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edit Gallery Design</h1>
        <p className="text-zinc-500 text-sm mt-1">{design.title || "Untitled"} · /designs only</p>
      </div>
      <GalleryDesignForm initial={design} />
    </div>
  );
}
