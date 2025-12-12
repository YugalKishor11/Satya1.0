export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface VerificationResult {
  rawText: string;
  sources: GroundingSource[];
}

export interface SatyaReport {
  claim: string;
  verification: VerificationResult;
  explanation: string;
  counterMessage: string;
  timestamp?: number;
}

export enum AgentState {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface PipelineStatus {
  scout: AgentState;
  verifier: AgentState;
  explainer: AgentState;
  counter: AgentState;
}

export type AgentName = 'scout' | 'verifier' | 'explainer' | 'counter';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface HistoryItem {
  id: string;
  claim: string;
  verdict: 'TRUE' | 'FALSE' | 'MIXED';
  timestamp: number;
  snippet: string;
  report?: SatyaReport;
}