"use strict";

const { lookup: dnsLookup } = require("node:dns/promises");
const { BlockList, isIP } = require("node:net");
const { Agent, fetch } = require("undici");

function normalizeHost(value) { return String(value).trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, ""); }
const blockedV4 = new BlockList(), blockedV6 = new BlockList();
for (const [network, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]]) blockedV4.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [["::",128],["::1",128],["::ffff:0:0",96],["64:ff9b:1::",48],["100::",64],["2001::",23],["2001:db8::",32],["fc00::",7],["fe80::",10],["fec0::",10],["ff00::",8]]) blockedV6.addSubnet(network, prefix, "ipv6");
function isBlockedAddress(address) { const family = isIP(address); return family === 4 ? blockedV4.check(address, "ipv4") : family === 6 ? blockedV6.check(address, "ipv6") : true; }

async function resolvePinnedTarget(rawUrl, options = {}) {
  if (typeof rawUrl !== "string" || !rawUrl || rawUrl.length > 2048) throw new Error("invalid_remote_url");
  let url; try { url = new URL(rawUrl); } catch { throw new Error("invalid_remote_url"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (!options.allowTestPort && url.port && url.port !== (url.protocol === "https:" ? "443" : "80"))) throw new Error("remote_url_not_allowed");
  const hostname = normalizeHost(url.hostname);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("remote_destination_blocked");
  const records = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await (options.resolver || dnsLookup)(hostname, { all: true, verbatim: true });
  if (!Array.isArray(records) || !records.length) throw new Error("remote_dns_unavailable");
  if (!options.allowPrivateForTest && records.some((record) => isBlockedAddress(record.address))) throw new Error("remote_destination_blocked");
  return { url, hostname, records, selected: records[0] };
}

async function fetchPinnedText(rawUrl, options = {}) {
  const maxRedirects = options.maxRedirects ?? 5, maxBytes = options.maxBytes ?? 2 * 1024 * 1024, timeoutMs = options.timeoutMs ?? 20_000;
  let current = rawUrl;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const target = await resolvePinnedTarget(current, options);
    const agent = new Agent({ connect: { lookup(_hostname, lookupOptions, callback) {
      if (lookupOptions?.all) callback(null, [{ address: target.selected.address, family: target.selected.family }]);
      else callback(null, target.selected.address, target.selected.family);
    } } });
    try {
      const response = await (options.fetchImpl || fetch)(target.url, { dispatcher: agent, redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: options.headers });
      if (response.status >= 300 && response.status < 400) {
        if (redirects >= maxRedirects) throw new Error("remote_redirect_limit");
        const location = response.headers.get("location"); if (!location) throw new Error("remote_redirect_invalid");
        current = new URL(location, target.url).toString(); continue;
      }
      if (!response.ok) throw new Error(`remote_http_${response.status}`);
      const type = String(response.headers.get("content-type") || "").toLowerCase();
      if (type && !/(text\/(?:html|plain|xml)|application\/(?:xhtml\+xml|xml|rss\+xml|atom\+xml))/.test(type)) throw new Error("remote_content_type_blocked");
      const reader = response.body?.getReader(); if (!reader) return { url: target.url, text: "", pinnedAddress: target.selected.address };
      const decoder = new TextDecoder(); let bytes = 0, text = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw new Error("remote_body_too_large"); } text += decoder.decode(value, { stream: true }); }
      text += decoder.decode(); return { url: target.url, text, pinnedAddress: target.selected.address };
    } finally { await agent.close(); }
  }
  throw new Error("remote_redirect_limit");
}

module.exports = { isBlockedAddress, resolvePinnedTarget, fetchPinnedText };
