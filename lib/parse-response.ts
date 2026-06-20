export async function parseResponseJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(
        `Request failed (${res.status}). Try again after restarting the dev server, or use a smaller JPG/PNG.`
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
