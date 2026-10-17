export type BoundedBodyResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413; reason: "invalid_body" | "payload_too_large" };

async function readBytesWithLimit(req: Request, maxBytes: number): Promise<BoundedBodyResult<Uint8Array>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("invalid_body_limit");
  }

  const declaredHeader = req.headers.get("content-length");
  if (declaredHeader !== null) {
    const declared = Number(declaredHeader);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      return { ok: false, status: 400, reason: "invalid_body" };
    }
    if (declared > maxBytes) {
      return { ok: false, status: 413, reason: "payload_too_large" };
    }
  }

  if (!req.body) return { ok: true, value: new Uint8Array(0) };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel("payload_too_large"); } catch {}
        return { ok: false, status: 413, reason: "payload_too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, reason: "invalid_body" };
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, value: merged };
}

export async function readTextBodyWithLimit(req: Request, maxBytes: number): Promise<BoundedBodyResult<string>> {
  const bytes = await readBytesWithLimit(req, maxBytes);
  if (!bytes.ok) return bytes;
  try {
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes.value) };
  } catch {
    return { ok: false, status: 400, reason: "invalid_body" };
  }
}

export async function readJsonBodyWithLimit(req: Request, maxBytes: number): Promise<BoundedBodyResult<unknown>> {
  const text = await readTextBodyWithLimit(req, maxBytes);
  if (!text.ok) return text;
  try {
    return { ok: true, value: JSON.parse(text.value) };
  } catch {
    return { ok: false, status: 400, reason: "invalid_body" };
  }
}
