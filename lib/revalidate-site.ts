import { revalidatePath } from "next/cache";

/** Bust cached homepage + admin after portfolio/settings/media changes. */
export function revalidateLiveSite() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}
