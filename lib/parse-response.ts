export async function parseResponseJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(
        res.status === 401
          ? "Please log in to the admin panel again."
          : res.status === 500
            ? `Server error (${res.status}). If uploading, try a smaller JPG/PNG or check Vercel Blob storage limits.`
            : `Request failed (${res.status}). Please refresh and try again.`
      );
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Server returned an invalid response (${res.status}). Please refresh and try again.`
    );
  }
}

export async function parseRequestJson<T = Record<string, unknown>>(
  request: Request
): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Request body is empty");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON in request body");
  }
}
