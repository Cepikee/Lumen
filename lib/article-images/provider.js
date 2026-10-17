"use strict";

class ImageProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "ImageProviderError";
    this.code = code;
    this.status = options.status || 0;
    this.retryable = Boolean(options.retryable);
    this.retryAfterMs = options.retryAfterMs || 0;
  }
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
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      timer.unref?.();
      let response;
      try {
        response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai/run/${config.model.split("/").map(encodeURIComponent).join("/")}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, width: config.width, height: config.height }),
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
        throw new ImageProviderError(`http_${response.status}`, `Image provider returned HTTP ${response.status}`, {
          status: response.status, retryable, retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : 0,
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
