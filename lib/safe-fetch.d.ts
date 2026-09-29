export type DnsRecord = { address: string; family: number };
export function isBlockedAddress(address: string): boolean;
export type PinnedResolver = (hostname: string, options: { all: true; verbatim: true }) => Promise<DnsRecord[]>;
export type PinnedFetch = (input: URL, init: Record<string, unknown>) => Promise<Response>;
export function resolvePinnedTarget(rawUrl: string, options?: { resolver?: PinnedResolver; allowPrivateForTest?: boolean; allowTestPort?: boolean }): Promise<{ url: URL; hostname: string; records: DnsRecord[]; selected: DnsRecord }>;
export function fetchPinnedText(rawUrl: string, options?: { resolver?: PinnedResolver; allowPrivateForTest?: boolean; allowTestPort?: boolean; maxRedirects?: number; maxBytes?: number; timeoutMs?: number; headers?: Record<string,string>; fetchImpl?: PinnedFetch }): Promise<{ url: URL; text: string; pinnedAddress: string }>;
