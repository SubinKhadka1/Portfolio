import { randomUUID } from "crypto";
import { ensurePortfolioStore, updatePortfolioStore } from "@/lib/local-portfolio";
import type { Testimonial, TestimonialInput } from "@/lib/types/database";

export async function getLocalTestimonials(options?: { admin?: boolean }): Promise<Testimonial[]> {
  const store = await ensurePortfolioStore();
  const list = [...(store.testimonials || [])].sort((a, b) => a.sort_order - b.sort_order);
  if (options?.admin) return list;
  return list.filter((t) => t.published);
}

export async function getLocalTestimonial(id: string): Promise<Testimonial | null> {
  const store = await ensurePortfolioStore();
  return store.testimonials?.find((t) => t.id === id) ?? null;
}

function nextTestimonialSortOrder(store: any) {
  const testimonials = store.testimonials || [];
  const max = testimonials.reduce((highest: number, t: any) => Math.max(highest, t.sort_order || 0), 0);
  return max + 1000;
}

export async function createLocalTestimonial(input: TestimonialInput): Promise<Testimonial> {
  const now = new Date().toISOString();
  const id = randomUUID();
  let created!: Testimonial;

  await updatePortfolioStore((store) => {
    if (!store.testimonials) {
      store.testimonials = [];
    }
    const sort_order = input.sort_order ?? nextTestimonialSortOrder(store);
    const author = input.author || "";
    const initials = input.initials || author.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "C";
    created = {
      id,
      quote: input.quote || "",
      author,
      role: input.role || "",
      initials,
      rating: input.rating ?? 5,
      gradient: input.gradient || "from-purple-500 to-indigo-500",
      published: input.published ?? true,
      sort_order,
      created_at: now,
      updated_at: now,
    };
    store.testimonials.push(created);
  });

  return created;
}

export async function updateLocalTestimonial(
  id: string,
  patch: Partial<TestimonialInput>
): Promise<Testimonial | null> {
  let updated: Testimonial | null = null;

  await updatePortfolioStore((store) => {
    if (!store.testimonials) return;
    const index = store.testimonials.findIndex((t) => t.id === id);
    if (index === -1) return;

    const existing = store.testimonials[index];
    const author = patch.author !== undefined ? patch.author : existing.author;
    const initials = patch.initials !== undefined
      ? patch.initials
      : (patch.author !== undefined ? author.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : existing.initials);

    updated = {
      ...existing,
      ...(patch.quote !== undefined && { quote: patch.quote }),
      ...(patch.author !== undefined && { author }),
      ...(patch.role !== undefined && { role: patch.role }),
      initials,
      ...(patch.rating !== undefined && { rating: patch.rating }),
      ...(patch.gradient !== undefined && { gradient: patch.gradient }),
      ...(patch.published !== undefined && { published: patch.published }),
      ...(patch.sort_order !== undefined && { sort_order: patch.sort_order }),
      updated_at: new Date().toISOString(),
    };
    store.testimonials[index] = updated;
  });

  return updated;
}

export async function deleteLocalTestimonial(id: string): Promise<boolean> {
  let deleted = false;

  await updatePortfolioStore((store) => {
    if (!store.testimonials) return;
    const before = store.testimonials.length;
    store.testimonials = store.testimonials.filter((t) => t.id !== id);
    deleted = store.testimonials.length < before;
  });

  return deleted;
}

export async function reorderLocalTestimonials(
  items: { id: string; sort_order: number }[]
): Promise<void> {
  const itemMap = new Map(items.map((i) => [i.id, i]));

  await updatePortfolioStore((store) => {
    if (!store.testimonials) return;
    store.testimonials = store.testimonials.map((t) => {
      const item = itemMap.get(t.id);
      if (!item) return t;
      return {
        ...t,
        sort_order: item.sort_order,
        updated_at: new Date().toISOString(),
      };
    });
  });
}
