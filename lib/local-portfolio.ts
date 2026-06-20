import { promises as fs } from "fs";
import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { staticProjectsForAdmin } from "@/lib/seed";
import { marqueeSortOrder, clampMarqueeRow } from "@/lib/marquee";
import {
  PORTRAIT_DESIGN_IMAGES,
  STATIC_DESIGNS,
  STATIC_VIDEOS,
} from "@/lib/static-data";
import type { Project, ProjectInput, ProjectType } from "@/lib/types/database";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "portfolio.json");
const SETTINGS_FILE = path.join(DATA_DIR, "site-settings.json");

function getPortfolioRowCount(): number {
  try {
    const raw = readFileSync(SETTINGS_FILE, "utf8");
    const settings = JSON.parse(raw) as { portfolioRows?: number };
    return clampMarqueeRow(settings.portfolioRows ?? 3, 3);
  } catch {
    return 3;
  }
}

function getClientRowCount(): number {
  try {
    const raw = readFileSync(SETTINGS_FILE, "utf8");
    const settings = JSON.parse(raw) as { clientRows?: number };
    return clampMarqueeRow(settings.clientRows ?? 2, 3);
  } catch {
    return 2;
  }
}

function migrateClientRows(clients: Project[]): { clients: Project[]; changed: boolean } {
  const needsMigration = clients.some((p) => p.metadata?.marqueeRow == null);
  if (!needsMigration) return { clients, changed: false };

  const rowCount = getClientRowCount();
  const sorted = [...clients].sort((a, b) => a.sort_order - b.sort_order);
  const buckets: Project[][] = Array.from({ length: rowCount }, () => []);
  sorted.forEach((p, i) => buckets[i % rowCount].push(p));

  const migrated = buckets.flatMap((bucket, rowIndex) =>
    bucket.map((p, indexInRow) => ({
      ...p,
      sort_order: marqueeSortOrder(rowIndex + 1, indexInRow),
      metadata: { ...p.metadata, marqueeRow: (rowIndex + 1) as 1 | 2 | 3 },
    }))
  );

  return { clients: migrated, changed: true };
}

function migrateDesignRows(designs: Project[]): { designs: Project[]; changed: boolean } {
  const needsMigration = designs.some((p) => p.metadata?.marqueeRow == null);
  if (!needsMigration) return { designs, changed: false };

  const rowCount = getPortfolioRowCount();
  const sorted = [...designs].sort((a, b) => a.sort_order - b.sort_order);
  const chunkSize = Math.ceil(sorted.length / rowCount) || 1;

  const migrated = sorted.map((p, index) => {
    const row = clampMarqueeRow(Math.floor(index / chunkSize) + 1, rowCount);
    const indexInRow = index - (row - 1) * chunkSize;
    return {
      ...p,
      sort_order: marqueeSortOrder(row, indexInRow),
      metadata: { ...p.metadata, marqueeRow: row },
    };
  });

  return { designs: migrated, changed: true };
}

type PortfolioStore = Record<ProjectType, Project[]>;

function typeKey(type: ProjectType): ProjectType {
  return type;
}

function migrateStore(store: PortfolioStore): PortfolioStore {
  let changed = false;

  store.design = store.design.map((p) => {
    const staticMatch = STATIC_DESIGNS.find((d) => d.image === p.media_url);
    const title = p.title || staticMatch?.title || "";

    // Keep admin-set format; only infer for legacy rows missing metadata.
    const aspectRatio: "square" | "portrait" =
      p.metadata?.aspectRatio ||
      (PORTRAIT_DESIGN_IMAGES.has(p.media_url) ? "portrait" : "square");
    const nextMeta = { ...p.metadata, aspectRatio };

    if (
      p.metadata?.aspectRatio !== aspectRatio ||
      !p.title ||
      (title && p.title !== title)
    ) {
      changed = true;
      return {
        ...p,
        title: title || p.title,
        metadata: nextMeta,
        published: p.published ?? true,
      };
    }
    return p;
  });

  store.video = store.video.map((p) => {
    const staticMatch = STATIC_VIDEOS.find((v) => v.src === p.media_url);
    if (!staticMatch) return p;

    const needsUpdate =
      p.title === p.description ||
      p.title === staticMatch.description ||
      !p.title;

    if (needsUpdate) {
      changed = true;
      return {
        ...p,
        title: staticMatch.title,
        description: staticMatch.description,
      };
    }
    return p;
  });

  store.client = store.client.map((p) => {
    if (p.title === "SS Logo") {
      changed = true;
      return { ...p, title: "SS Academy" };
    }
    return p;
  });

  const rowMigration = migrateDesignRows(store.design);
  if (rowMigration.changed) {
    store.design = rowMigration.designs;
    changed = true;
  }

  const clientRowMigration = migrateClientRows(store.client);
  if (clientRowMigration.changed) {
    store.client = clientRowMigration.clients;
    changed = true;
  }

  return store;
}

async function ensureStore(): Promise<PortfolioStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as PortfolioStore;
    const migrated = migrateStore(parsed);
    const before = JSON.stringify(parsed);
    const after = JSON.stringify(migrated);
    if (before !== after) {
      await writeStore(migrated);
    }
    return migrated;
  } catch {
    const store: PortfolioStore = {
      design: staticProjectsForAdmin("design").map((p) => ({
        ...p,
        id: randomUUID(),
      })),
      video: staticProjectsForAdmin("video").map((p) => ({
        ...p,
        id: randomUUID(),
      })),
      client: [],
    };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
    return store;
  }
}

async function writeStore(store: PortfolioStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function getLocalProjects(type: ProjectType): Promise<Project[]> {
  const store = await ensureStore();
  return store[typeKey(type)] || [];
}

export async function getLocalProject(id: string): Promise<Project | null> {
  const store = await ensureStore();
  for (const type of ["design", "video", "client"] as ProjectType[]) {
    const found = store[type].find((p) => p.id === id);
    if (found) return found;
  }
  return null;
}

export async function createLocalProject(input: ProjectInput): Promise<Project> {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const type = input.type;
  const maxOrder = store[type].reduce((max, p) => Math.max(max, p.sort_order), -1);

  let sortOrder = input.sort_order ?? maxOrder + 1;
  if (type === "design" || type === "client") {
    const row = clampMarqueeRow(input.metadata?.marqueeRow ?? 1);
    const inRow = store[type].filter(
      (p) => clampMarqueeRow(p.metadata?.marqueeRow ?? 1) === row
    );
    const maxInRow = inRow.reduce((max, p) => Math.max(max, p.sort_order), row * 1000 - 1);
    sortOrder = maxInRow + 1;
  }

  const project: Project = {
    id: randomUUID(),
    type: input.type,
    title: input.title || "",
    description: input.description || "",
    media_url: input.media_url,
    thumbnail_url: input.thumbnail_url || null,
    category_id: input.category_id || null,
    featured: input.featured ?? false,
    published: input.published ?? true,
    sort_order: sortOrder,
    metadata:
      type === "design" || type === "client"
        ? {
            ...input.metadata,
            marqueeRow: clampMarqueeRow(input.metadata?.marqueeRow ?? 1),
          }
        : input.metadata || {},
    created_at: now,
    updated_at: now,
    categories: null,
  };

  store[type].push(project);
  await writeStore(store);
  return project;
}

export async function updateLocalProject(
  id: string,
  input: Partial<ProjectInput>
): Promise<Project | null> {
  const store = await ensureStore();

  for (const type of ["design", "video", "client"] as ProjectType[]) {
    const index = store[type].findIndex((p) => p.id === id);
    if (index === -1) continue;

    const existing = store[type][index];
    const updated: Project = {
      ...existing,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.media_url !== undefined && { media_url: input.media_url }),
      ...(input.thumbnail_url !== undefined && { thumbnail_url: input.thumbnail_url }),
      ...(input.category_id !== undefined && { category_id: input.category_id }),
      ...(input.featured !== undefined && { featured: input.featured }),
      ...(input.published !== undefined && { published: input.published }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      ...(input.metadata !== undefined && {
        metadata: { ...existing.metadata, ...input.metadata },
      }),
      updated_at: new Date().toISOString(),
    };

    store[type][index] = updated;
    await writeStore(store);
    return updated;
  }

  return null;
}

export async function deleteLocalProject(id: string): Promise<boolean> {
  const store = await ensureStore();

  for (const type of ["design", "video", "client"] as ProjectType[]) {
    const before = store[type].length;
    store[type] = store[type].filter((p) => p.id !== id);
    if (store[type].length < before) {
      await writeStore(store);
      return true;
    }
  }

  return false;
}

export async function reorderLocalProjects(
  items: { id: string; sort_order: number }[]
): Promise<void> {
  const store = await ensureStore();
  const orderMap = new Map(items.map((i) => [i.id, i.sort_order]));

  for (const type of ["design", "video", "client"] as ProjectType[]) {
    store[type] = store[type].map((p) =>
      orderMap.has(p.id) ? { ...p, sort_order: orderMap.get(p.id)! } : p
    );
    store[type].sort((a, b) => a.sort_order - b.sort_order);
  }

  await writeStore(store);
}

export async function getLocalDashboardStats() {
  const store = await ensureStore();
  const all = [...store.design, ...store.video, ...store.client];

  return {
    total: all.length,
    designs: store.design.length,
    videos: store.video.length,
    clients: store.client.length,
    featured: all.filter((p) => p.featured).length,
    published: all.filter((p) => p.published).length,
    unpublished: all.filter((p) => !p.published).length,
  };
}
