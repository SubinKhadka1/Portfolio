import { promises as fs } from "fs";
import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isNextBuildPhase } from "@/lib/is-build-time";
import { blobJsonExists, readJsonFile, writeJsonFile } from "@/lib/json-store";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";
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
const PORTFOLIO_JSON = "data/portfolio.json";
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

function migrateDesignPlacement(designs: Project[]): { designs: Project[]; changed: boolean } {
  let changed = false;
  const migrated = designs.map((p) => {
    const meta = { ...p.metadata };
    let touched = false;

    if (meta.homepageSortOrder == null) {
      meta.homepageSortOrder = p.sort_order;
      touched = true;
    }
    if (meta.gallerySortOrder == null) {
      meta.gallerySortOrder = p.sort_order;
      touched = true;
    }
    if (meta.showOnHomepage == null) {
      meta.showOnHomepage = true;
      touched = true;
    }
    if (meta.showInGallery == null) {
      meta.showInGallery = true;
      touched = true;
    }

    if (!touched) return p;
    changed = true;
    return { ...p, metadata: meta };
  });

  return { designs: migrated, changed };
}

type PortfolioStore = Record<ProjectType, Project[]>;

function typeKey(type: ProjectType): ProjectType {
  return type;
}

function migrateStore(store: PortfolioStore): PortfolioStore {
  let changed = false;

  store.design = store.design.map((p) => {
    let mediaUrl = p.media_url;
    if (mediaUrl === "/designs/CONSTITUTIONDAY.jpg") {
      mediaUrl = "/designs/ConstitutionDay.jpg";
      changed = true;
    }

    const staticMatch = STATIC_DESIGNS.find((d) => d.image === mediaUrl);
    const title = p.title || staticMatch?.title || "";

    // Keep admin-set format; only infer for legacy rows missing metadata.
    const aspectRatio: "square" | "portrait" =
      p.metadata?.aspectRatio ||
      (PORTRAIT_DESIGN_IMAGES.has(mediaUrl) ? "portrait" : "square");
    const nextMeta = { ...p.metadata, aspectRatio };

    if (
      mediaUrl !== p.media_url ||
      p.metadata?.aspectRatio !== aspectRatio ||
      !p.title ||
      (title && p.title !== title)
    ) {
      changed = true;
      return {
        ...p,
        media_url: mediaUrl,
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

  const placementMigration = migrateDesignPlacement(store.design);
  if (placementMigration.changed) {
    store.design = placementMigration.designs;
    changed = true;
  }

  const clientRowMigration = migrateClientRows(store.client);
  if (clientRowMigration.changed) {
    store.client = clientRowMigration.clients;
    changed = true;
  }

  return store;
}

function cloneStore(store: PortfolioStore): PortfolioStore {
  return JSON.parse(JSON.stringify(store)) as PortfolioStore;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storeHasId(store: PortfolioStore, id: string) {
  return (["design", "video", "client"] as ProjectType[]).some((type) =>
    store[type].some((p) => p.id === id)
  );
}

async function loadPortfolioStore(): Promise<PortfolioStore> {
  const fromBlob = await readJsonFile<PortfolioStore>(PORTFOLIO_JSON);
  if (fromBlob) return migrateStore(fromBlob);

  if (isBlobStorageEnabled() && (await blobJsonExists(PORTFOLIO_JSON))) {
    throw new Error("Could not read live portfolio data. Please try again.");
  }

  if (isNextBuildPhase()) {
    return {
      design: staticProjectsForAdmin("design"),
      video: staticProjectsForAdmin("video"),
      client: staticProjectsForAdmin("client"),
    };
  }

  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as PortfolioStore;
    return migrateStore(parsed);
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
    if (!isNextBuildPhase()) {
      await writeJsonFile(PORTFOLIO_JSON, store);
    }
    return store;
  }
}

async function savePortfolioStore(store: PortfolioStore) {
  if (isNextBuildPhase()) return;
  await writeJsonFile(PORTFOLIO_JSON, store);
}

async function updatePortfolioStore(
  mutate: (store: PortfolioStore) => void | Promise<void>,
  options?: { verifyId?: string; verifyIds?: string[] }
): Promise<PortfolioStore> {
  let lastError: Error | null = null;
  const idsToVerify =
    options?.verifyIds?.length
      ? options.verifyIds
      : options?.verifyId
        ? [options.verifyId]
        : [];
  const maxAttempts = idsToVerify.length > 0 && isBlobStorageEnabled() ? 8 : 4;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const store = cloneStore(await loadPortfolioStore());
    await mutate(store);
    await savePortfolioStore(store);

    if (idsToVerify.length === 0) return store;

    const delayMs = isBlobStorageEnabled() ? 250 * (attempt + 1) : 120 * (attempt + 1);
    await sleep(delayMs);
    try {
      const check = await loadPortfolioStore();
      if (idsToVerify.every((id) => storeHasId(check, id))) return store;
      lastError = new Error("New item did not persist. Retrying save...");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Save verification failed");
    }
  }

  throw lastError ?? new Error("Failed to save portfolio after multiple attempts");
}

async function ensureStore(): Promise<PortfolioStore> {
  const store = await loadPortfolioStore();
  const raw = await readJsonFile<PortfolioStore>(PORTFOLIO_JSON);

  if (raw) {
    const before = JSON.stringify(migrateStore(raw));
    const after = JSON.stringify(store);
    if (before !== after) {
      await savePortfolioStore(store);
    }
  } else if (isBlobStorageEnabled() && !isVercelProduction()) {
    const exists = await blobJsonExists(PORTFOLIO_JSON);
    if (!exists) {
      await savePortfolioStore(store);
    }
  }

  return store;
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

function appendProjectToStore(
  store: PortfolioStore,
  input: ProjectInput,
  projectId: string,
  now: string
): Project {
  const type = input.type;
  const maxOrder = store[type].reduce((max, p) => Math.max(max, p.sort_order), -1);

  let sortOrder = input.sort_order ?? maxOrder + 1;
  if (type === "design" || type === "client") {
    const row = clampMarqueeRow(input.metadata?.marqueeRow ?? 1);
    const inRow = store[type].filter(
      (p) => clampMarqueeRow(p.metadata?.marqueeRow ?? 1) === row
    );
    sortOrder = marqueeSortOrder(row, inRow.length);
  }

  const designMetadata =
    type === "design"
      ? {
          ...input.metadata,
          marqueeRow: clampMarqueeRow(input.metadata?.marqueeRow ?? 1),
          showOnHomepage: input.metadata?.showOnHomepage ?? true,
          showInGallery: input.metadata?.showInGallery ?? true,
          homepageSortOrder:
            input.metadata?.homepageSortOrder ??
            marqueeSortOrder(
              clampMarqueeRow(input.metadata?.marqueeRow ?? 1),
              store.design.filter(
                (p) =>
                  p.metadata?.showOnHomepage !== false &&
                  clampMarqueeRow(p.metadata?.marqueeRow ?? 1) ===
                    clampMarqueeRow(input.metadata?.marqueeRow ?? 1)
              ).length
            ),
          gallerySortOrder: input.metadata?.gallerySortOrder ?? sortOrder,
        }
      : type === "client"
        ? {
            ...input.metadata,
            marqueeRow: clampMarqueeRow(input.metadata?.marqueeRow ?? 1),
          }
        : input.metadata || {};

  const project: Project = {
    id: projectId,
    type: input.type,
    title: input.title || "",
    description: input.description || "",
    media_url: input.media_url,
    thumbnail_url: input.thumbnail_url || null,
    category_id: input.category_id || null,
    featured: input.featured ?? false,
    published: input.published ?? true,
    sort_order: sortOrder,
    metadata: designMetadata,
    created_at: now,
    updated_at: now,
    categories: null,
  };

  store[type].push(project);
  return project;
}

export async function createLocalProject(input: ProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const projectId = randomUUID();

  let project!: Project;

  await updatePortfolioStore((store) => {
    project = appendProjectToStore(store, input, projectId, now);
  }, { verifyId: projectId });

  return project;
}

/** Save many projects in one write — avoids blob store races during bulk gallery upload. */
export async function createLocalProjectsBatch(inputs: ProjectInput[]): Promise<Project[]> {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) return [await createLocalProject(inputs[0])];

  const now = new Date().toISOString();
  const projects: Project[] = [];
  const ids: string[] = [];

  await updatePortfolioStore((store) => {
    for (const input of inputs) {
      const projectId = randomUUID();
      ids.push(projectId);
      projects.push(appendProjectToStore(store, input, projectId, now));
    }
  }, { verifyIds: ids });

  return projects;
}

export async function updateLocalProject(
  id: string,
  input: Partial<ProjectInput>
): Promise<Project | null> {
  const current = await getLocalProject(id);
  if (!current) return null;

  let updated: Project | null = null;

  await updatePortfolioStore((store) => {
    for (const type of ["design", "video", "client"] as ProjectType[]) {
      const index = store[type].findIndex((p) => p.id === id);
      if (index === -1) continue;

      const existing = store[type][index];
      updated = {
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
      return;
    }
  });

  return updated;
}

export async function deleteLocalProject(id: string): Promise<boolean> {
  if (!(await getLocalProject(id))) return false;

  let deleted = false;

  await updatePortfolioStore((store) => {
    for (const type of ["design", "video", "client"] as ProjectType[]) {
      const before = store[type].length;
      store[type] = store[type].filter((p) => p.id !== id);
      if (store[type].length < before) {
        deleted = true;
        return;
      }
    }
  });

  return deleted;
}

export async function reorderLocalProjects(
  items: { id: string; sort_order?: number; metadata?: Project["metadata"] }[],
  scope: "homepage" | "gallery" | "default" = "default"
): Promise<void> {
  const itemMap = new Map(items.map((i) => [i.id, i]));

  await updatePortfolioStore((store) => {
    for (const type of ["design", "video", "client"] as ProjectType[]) {
      store[type] = store[type].map((p) => {
        const item = itemMap.get(p.id);
        if (!item) return p;
        return {
          ...p,
          ...(scope === "default" && item.sort_order !== undefined
            ? { sort_order: item.sort_order }
            : {}),
          metadata: item.metadata ? { ...p.metadata, ...item.metadata } : p.metadata,
          updated_at: new Date().toISOString(),
        };
      });

      if (scope === "default") {
        store[type].sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  });
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
