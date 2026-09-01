export interface ConsentCategory {
  id: string;
  label: string;
  description: string;
  /** Always granted, locked in the UI (strictly necessary cookies). */
  essential?: boolean;
}

/** Per-category grant map. */
export type ConsentDecision = Record<string, boolean>;

/** What gets persisted. */
export interface ConsentRecord {
  /** The policy version the user agreed to. */
  version: string;
  /** Epoch ms of the decision. */
  decidedAt: number;
  decision: ConsentDecision;
}
