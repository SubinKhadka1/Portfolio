import { getGithubRepoConfig, isGithubJsonEnabled } from "@/lib/storage-backends";

type GithubFileResponse = {
  content?: string;
  encoding?: string;
  sha?: string;
};

function decodeGithubContent(payload: GithubFileResponse) {
  if (!payload.content) return null;
  if (payload.encoding === "base64") {
    return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
  }
  return payload.content;
}

export async function readGithubJson<T>(relativePath: string): Promise<T | null> {
  if (!isGithubJsonEnabled()) return null;

  const config = getGithubRepoConfig();
  if (!config?.token) return null;

  const path = relativePath.replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${encodeURIComponent(config.branch)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const payload = (await res.json()) as GithubFileResponse;
    const text = decodeGithubContent(payload);
    if (!text?.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeGithubJson<T>(relativePath: string, value: T): Promise<void> {
  if (!isGithubJsonEnabled()) {
    throw new Error("GitHub storage is not configured (set GITHUB_TOKEN on Vercel).");
  }

  const config = getGithubRepoConfig();
  if (!config?.token) {
    throw new Error("GitHub storage is not configured (set GITHUB_TOKEN on Vercel).");
  }

  const path = relativePath.replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const body = JSON.stringify(value, null, 2);

  let sha: string | undefined;
  const existingRes = await fetch(`${url}?ref=${encodeURIComponent(config.branch)}`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (existingRes.ok) {
    const existing = (await existingRes.json()) as GithubFileResponse;
    sha = existing.sha;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `chore: update ${path} from admin`,
      content: Buffer.from(body, "utf8").toString("base64"),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `GitHub save failed (${res.status})`);
  }
}

export async function githubJsonExists(relativePath: string): Promise<boolean> {
  const data = await readGithubJson(relativePath);
  return data !== null;
}
