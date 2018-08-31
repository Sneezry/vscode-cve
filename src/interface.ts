export interface AuditResult {
  low: number;
  moderate: number;
  high: number;
  critical: number;
  noPatch: number;
}

export interface AuditFixResult {
  code: number;
  message: string;
}