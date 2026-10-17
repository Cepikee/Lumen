"use strict";

class ImageProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "ImageProviderError";
    this.code = code;
    this.status = options.status || 0;
    this.retryable = Boolean(options.retryable);
    this.retryAfterMs = options.retryAfterMs || 0;
    this.providerErrorCode = options.providerErrorCode || null;
    this.providerErrorMessage = options.providerErrorMessage || null;
    this.requestId = options.requestId || null;
  }
}

async function boundedErrorPayload(response, prompt, token, limit = 64 * 1024) {
  let text = "";
  try {
    text = (await limitedBytes(response, limit)).toString("utf8");
  } catch {
    return {};
  }
  let payload;
  try { payload = JSON.parse(text); } catch { payload = null; }
  const detail = payload?.errors?.[0] || payload?.error || payload;
  const rawCode = detail && typeof detail === "object" ? detail.code : null;
  const rawMessage = detail && typeof detail === "object" ? detail.message : null;
  let message = typeof rawMessage === "string" ? rawMessage : "";
  for (const secret of [token, prompt]) {
    if (secret) message = message.split(secret).join("[redacted]");
  }
  message = message.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500);
  return {
    providerErrorCode: typeof rawCode === "string" || typeof rawCode === "number" ? String(rawCode).slice(0, 100) : null,
    providerErrorMessage: message || null,
  };
}

async function limitedBytes(response, limit) {
  const advertised = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertised) && advertised > limit) throw new ImageProviderError("image_too_large", "Provider image exceeds the byte limit");
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new ImageProviderError("image_too_large", "Provider image exceeds the byte limit");
    return bytes;
  }
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new ImageProviderError("image_too_large", "Provider image exceeds the byte limit"); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function strictBase64(value) {
  if (typeof value !== "string" || value.length < 16 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new ImageProviderError("malformed_response", "Provider did not return valid base64 image data");
  }
  return Buffer.from(value, "base64");
}

function createCloudflareImageProvider(config, dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
  return {
    name: "cloudflare",
    async generate(prompt) {
      const controller = new AbortController();
      // Keep the timeout referenced: aborting a hung provider request is part of
      // the request contract and must not depend on unrelated event-loop handles.
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      let response;
      try {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("width", String(config.width));
        form.append("height", String(config.height));
        if (config.seed != null) form.append("seed", String(config.seed));
        response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai/run/${config.model.split("/").map(encodeURIComponent).join("/")}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiToken}` },
          body: form,
          signal: controller.signal,
        });
      } catch (error) {
        if (error?.name === "AbortError") throw new ImageProviderError("timeout", "Image provider timed out", { retryable: true });
        throw new ImageProviderError("network_error", "Image provider request failed", { retryable: true });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfter = Number(response.headers.get("retry-after"));
        const diagnostic = await boundedErrorPayload(response, prompt, config.apiToken);
        throw new ImageProviderError(`http_${response.status}`, `Image provider returned HTTP ${response.status}`, {
          status: response.status, retryable, retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : 0,
          ...diagnostic,
          requestId: String(response.headers.get("cf-ray") || response.headers.get("cf-request-id") || "").slice(0, 200) || null,
        });
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const responseBytes = await limitedBytes(response, 15 * 1024 * 1024);
      let bytes;
      let mimeType = null;
      if (contentType.startsWith("image/")) {
        bytes = responseBytes;
        mimeType = contentType.split(";", 1)[0].trim();
      } else {
        let payload;
        try { payload = JSON.parse(responseBytes.toString("utf8")); } catch { throw new ImageProviderError("malformed_response", "Provider response is not valid JSON"); }
        const encoded = String(payload?.result?.image || payload?.image || "");
        const dataUrl = encoded.match(/^data:(image\/[^;]+);base64,(.*)$/s);
        mimeType = dataUrl?.[1]?.toLowerCase() || null;
        bytes = strictBase64(dataUrl ? dataUrl[2] : encoded);
      }
      if (bytes.length < 512) throw new ImageProviderError("invalid_image", "Provider returned an empty or invalid image");
      return { bytes, mimeType, reportedNeurons: null };
    },
  };
}

module.exports = { ImageProviderError, createCloudflareImageProvider };
