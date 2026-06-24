import CategoryManager from "@/components/admin/CategoryManager";
import { getCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getCategories("design");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Design Gallery Categories</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Manage section headings on the full designs page. Assign designs to categories in each project form.
        </p>
      </div>
      <CategoryManager initial={categories} />
    </div>
  );
}
