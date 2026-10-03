export interface EntityNameNormalization {
  readonly status: "valid";
  readonly normalizationVersion: string;
  readonly language: string;
  readonly displayName: string;
  readonly normalizedName: string;
}
export interface AliasNormalization extends EntityNameNormalization {
  readonly alias: string;
  readonly normalizedAlias: string;
  readonly aliasType: string;
}
export declare function normalizeEntityName(value: unknown, options?: { language?: string }): EntityNameNormalization | { readonly status: "invalid"; readonly reason: string };
export declare function normalizeAlias(value: unknown, options?: { language?: string; aliasType?: string }): AliasNormalization | { readonly status: "invalid"; readonly reason: string };
