import { revalidatePath } from "next/cache";

/** Bust cached homepage + admin immediately after portfolio/settings/media changes. */
export function revalidateLiveSite() {
  revalidatePath("/", "layout");
  revalidatePath("/", "page");
  revalidatePath("/designs", "page");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/projects", "page");
  revalidatePath("/admin/categories", "page");
}
