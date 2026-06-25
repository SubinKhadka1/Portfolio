import { randomUUID } from "crypto";
import { clampMarqueeRow, marqueeSortOrder } from "@/lib/marquee";
import {
  galleryDesignToHomepageCopy,
  showsGalleryDesign,
} from "@/lib/design-module-mappers";
import {
  ensurePortfolioStore,
  updatePortfolioStore,
} from "@/lib/local-portfolio";
import type { PortfolioStore } from "@/lib/portfolio-store-types";
import type {
  GalleryDesign,
  GalleryDesignInput,
  HomepageDesign,
  HomepageDesignInput,
} from "@/lib/types/database";

function filterPublished<T extends { published: boolean }>(
  items: T[],
  options?: { admin?: boolean }
) {
  if (options?.admin) return items;
  return items.filter((item) => item.published);
}

export async function getLocalGalleryDesigns(options?: {
  admin?: boolean;
}): Promise<GalleryDesign[]> {
  const store = await ensurePortfolioStore();
  const designs = [...store.gallery_designs].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  );
  return filterPublished(designs, options);
}

export async function getLocalGalleryDesign(id: string): Promise<GalleryDesign | null> {
  const store = await ensurePortfolioStore();
  return store.gallery_designs.find((d) => d.id === id) ?? null;
}

export async function getLocalHomepageDesigns(options?: {
  admin?: boolean;
}): Promise<HomepageDesign[]> {
  const store = await ensurePortfolioStore();
  const designs = [...store.homepage_designs].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  );
  return filterPublished(designs, options);
}

export async function getLocalHomepageDesign(id: string): Promise<HomepageDesign | null> {
  const store = await ensurePortfolioStore();
  return store.homepage_designs.find((d) => d.id === id) ?? null;
}

function nextGallerySortOrder(store: PortfolioStore) {
  const max = store.gallery_designs.reduce((highest, d) => Math.max(highest, d.sort_order), 0);
  return max + 1_000;
}

function nextHomepageSortOrder(store: PortfolioStore, row = 1) {
  const rowNum = clampMarqueeRow(row);
  const inRow = store.homepage_designs.filter(
    (d) => clampMarqueeRow(d.metadata?.marqueeRow ?? 1) === rowNum
  );
  return marqueeSortOrder(rowNum, inRow.length);
}

function appendGalleryDesign(
  store: PortfolioStore,
  input: GalleryDesignInput,
  id: string,
  now: string
): GalleryDesign {
  const design: GalleryDesign = {
    id,
    title: input.title || "",
    description: input.description || "",
    media_url: input.media_url,
    category_id: input.category_id ?? null,
    sort_order: input.sort_order ?? nextGallerySortOrder(store),
    published: input.published ?? true,
    metadata: input.metadata || {},
    created_at: now,
    updated_at: now,
  };
  store.gallery_designs.push(design);
  return design;
}

function appendHomepageDesign(
  store: PortfolioStore,
  input: HomepageDesignInput,
  id: string,
  now: string
): HomepageDesign {
  const row = clampMarqueeRow(input.metadata?.marqueeRow ?? 1);
  const design: HomepageDesign = {
    id,
    title: input.title || "",
    description: input.description || "",
    media_url: input.media_url,
    sort_order: input.sort_order ?? nextHomepageSortOrder(store, row),
    published: input.published ?? true,
    metadata: { ...input.metadata, marqueeRow: row },
    source_gallery_design_id: input.source_gallery_design_id ?? null,
    created_at: now,
    updated_at: now,
  };
  store.homepage_designs.push(design);
  return design;
}

export async function createLocalGalleryDesign(
  input: GalleryDesignInput
): Promise<GalleryDesign> {
  const now = new Date().toISOString();
  const id = randomUUID();
  let created!: GalleryDesign;

  await updatePortfolioStore((store) => {
    const existing = store.gallery_designs.find((d) => d.id === id);
    if (existing) {
      created = existing;
      return;
    }
    const existingByUrl = store.gallery_designs.find(
      (d) =>
        d.media_url === input.media_url &&
        (d.category_id ?? null) === (input.category_id ?? null)
    );
    if (existingByUrl) {
      created = existingByUrl;
      return;
    }
    created = appendGalleryDesign(store, input, id, now);
  });

  return created;
}

export async function createLocalGalleryDesignsBatch(
  inputs: GalleryDesignInput[]
): Promise<GalleryDesign[]> {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) return [await createLocalGalleryDesign(inputs[0])];

  const now = new Date().toISOString();
  const planned = inputs.map((input) => ({ id: randomUUID(), input }));
  const created: GalleryDesign[] = [];

  await updatePortfolioStore((store) => {
    created.length = 0;
    for (const { id, input } of planned) {
      const existing = store.gallery_designs.find((d) => d.id === id);
      if (existing) {
        created.push(existing);
        continue;
      }
      const existingByUrl = store.gallery_designs.find(
        (d) =>
          d.media_url === input.media_url &&
          (d.category_id ?? null) === (input.category_id ?? null)
      );
      if (existingByUrl) {
        created.push(existingByUrl);
        continue;
      }
      created.push(appendGalleryDesign(store, input, id, now));
    }
  });

  return created;
}

export async function updateLocalGalleryDesign(
  id: string,
  patch: Partial<GalleryDesignInput>
): Promise<GalleryDesign | null> {
  let updated: GalleryDesign | null = null;

  await updatePortfolioStore((store) => {
    const index = store.gallery_designs.findIndex((d) => d.id === id);
    if (index === -1) return;

    const existing = store.gallery_designs[index];
    updated = {
      ...existing,
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.media_url !== undefined && { media_url: patch.media_url }),
      ...(patch.category_id !== undefined && { category_id: patch.category_id }),
      ...(patch.published !== undefined && { published: patch.published }),
      ...(patch.sort_order !== undefined && { sort_order: patch.sort_order }),
      ...(patch.metadata !== undefined && {
        metadata: { ...existing.metadata, ...patch.metadata },
      }),
      updated_at: new Date().toISOString(),
    };
    store.gallery_designs[index] = updated;
  });

  return updated;
}

export async function deleteLocalGalleryDesign(id: string): Promise<boolean> {
  let deleted = false;

  await updatePortfolioStore((store) => {
    const before = store.gallery_designs.length;
    store.gallery_designs = store.gallery_designs.filter((d) => d.id !== id);
    deleted = store.gallery_designs.length < before;
  });

  return deleted;
}

export async function reorderLocalGalleryDesigns(
  items: { id: string; sort_order: number }[]
): Promise<void> {
  const itemMap = new Map(items.map((i) => [i.id, i]));

  await updatePortfolioStore((store) => {
    store.gallery_designs = store.gallery_designs.map((d) => {
      const item = itemMap.get(d.id);
      if (!item) return d;
      return {
        ...d,
        sort_order: item.sort_order,
        updated_at: new Date().toISOString(),
      };
    });
  });
}

export async function createLocalHomepageDesign(
  input: HomepageDesignInput
): Promise<HomepageDesign> {
  const now = new Date().toISOString();
  const id = randomUUID();
  let created!: HomepageDesign;

  await updatePortfolioStore((store) => {
    const existingByUrl = store.homepage_designs.find(
      (d) =>
        d.media_url === input.media_url &&
        clampMarqueeRow(d.metadata?.marqueeRow ?? 1) ===
          clampMarqueeRow(input.metadata?.marqueeRow ?? 1)
    );
    if (existingByUrl) {
      created = existingByUrl;
      return;
    }
    created = appendHomepageDesign(store, input, id, now);
  });

  return created;
}

export async function createLocalHomepageDesignsBatch(
  inputs: HomepageDesignInput[]
): Promise<HomepageDesign[]> {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) return [await createLocalHomepageDesign(inputs[0])];

  const now = new Date().toISOString();
  const planned = inputs.map((input) => ({ id: randomUUID(), input }));
  const created: HomepageDesign[] = [];

  await updatePortfolioStore((store) => {
    created.length = 0;
    for (const { id, input } of planned) {
      const existing = store.homepage_designs.find((d) => d.id === id);
      if (existing) {
        created.push(existing);
        continue;
      }
      const existingByUrl = store.homepage_designs.find(
        (d) =>
          d.media_url === input.media_url &&
          clampMarqueeRow(d.metadata?.marqueeRow ?? 1) ===
            clampMarqueeRow(input.metadata?.marqueeRow ?? 1)
      );
      if (existingByUrl) {
        created.push(existingByUrl);
        continue;
      }
      created.push(appendHomepageDesign(store, input, id, now));
    }
  });

  return created;
}

export async function createLocalHomepageDesignFromGallery(
  galleryId: string
): Promise<HomepageDesign | null> {
  const gallery = await getLocalGalleryDesign(galleryId);
  if (!gallery) return null;

  const now = new Date().toISOString();
  const id = randomUUID();
  let created!: HomepageDesign;

  await updatePortfolioStore((store) => {
    const sortOrder = nextHomepageSortOrder(store, 1);
    created = galleryDesignToHomepageCopy(gallery, sortOrder);
    created.id = id;
    created.created_at = now;
    created.updated_at = now;
    store.homepage_designs.push(created);
  });

  return created;
}

export async function updateLocalHomepageDesign(
  id: string,
  patch: Partial<HomepageDesignInput>
): Promise<HomepageDesign | null> {
  let updated: HomepageDesign | null = null;

  await updatePortfolioStore((store) => {
    const index = store.homepage_designs.findIndex((d) => d.id === id);
    if (index === -1) return;

    const existing = store.homepage_designs[index];
    const nextMeta =
      patch.metadata !== undefined
        ? { ...existing.metadata, ...patch.metadata }
        : existing.metadata;

    let sortOrder = existing.sort_order;
    if (patch.sort_order !== undefined) {
      sortOrder = patch.sort_order;
    } else if (patch.metadata?.marqueeRow !== undefined) {
      sortOrder = nextHomepageSortOrder(store, patch.metadata.marqueeRow);
    }

    updated = {
      ...existing,
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.media_url !== undefined && { media_url: patch.media_url }),
      ...(patch.published !== undefined && { published: patch.published }),
      sort_order: sortOrder,
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    };
    store.homepage_designs[index] = updated;
  });

  return updated;
}

export async function deleteLocalHomepageDesign(id: string): Promise<boolean> {
  let deleted = false;

  await updatePortfolioStore((store) => {
    const before = store.homepage_designs.length;
    store.homepage_designs = store.homepage_designs.filter((d) => d.id !== id);
    deleted = store.homepage_designs.length < before;
  });

  return deleted;
}

export async function reorderLocalHomepageDesigns(
  items: { id: string; sort_order: number; metadata?: HomepageDesign["metadata"] }[]
): Promise<void> {
  const itemMap = new Map(items.map((i) => [i.id, i]));

  await updatePortfolioStore((store) => {
    store.homepage_designs = store.homepage_designs.map((d) => {
      const item = itemMap.get(d.id);
      if (!item) return d;
      return {
        ...d,
        sort_order: item.sort_order,
        metadata: item.metadata ? { ...d.metadata, ...item.metadata } : d.metadata,
        updated_at: new Date().toISOString(),
      };
    });
  });
}

export function filterVisibleGalleryDesigns(designs: GalleryDesign[]) {
  return designs.filter(showsGalleryDesign);
}

export function filterHiddenGalleryDesigns(designs: GalleryDesign[]) {
  return designs.filter((d) => !showsGalleryDesign(d));
}
