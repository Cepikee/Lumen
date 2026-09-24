export type Capability =
  | "realAi"
  | "feedFetch"
  | "emailSend"
  | "databaseWrite"
  | "videoGeneration"
  | "payments"
  | "backgroundJobs";

export interface RuntimeConfig {
  readonly offlineMode: boolean;
  readonly aiProvider: string;
  readonly openAiModel: string;
  readonly capabilities: Readonly<Record<Capability, boolean>>;
}

export class OfflineOperationBlockedError extends Error {
  readonly code: "UTOM_OPERATION_BLOCKED";
  readonly capability: Capability;
}

export function getRuntimeConfig(env?: NodeJS.ProcessEnv): RuntimeConfig;
export function assertCapability(capability: Capability, config?: RuntimeConfig): void;
