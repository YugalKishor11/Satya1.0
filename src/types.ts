export enum AgentState {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface PipelineStatus {
  scout: AgentState;
  verifier: AgentState;
  explainer: AgentState;
  counter: AgentState;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface VerificationResult {
  rawText: string;
  sources: GroundingSource[];
  verdict?: 'TRUE' | 'FALSE' | 'MISLEADING' | 'COMPLEX' | 'UNCERTAIN';
  confidence?: number;
  fallacies?: string[];
  keyContradictions?: string[];
}

export interface DeepfakeAnalysis {
  isLikelySynthetic: boolean;
  confidenceScore: number;
  indicators: string[];
  audioVisualSyncStatus?: string;
  metadataFlags?: string[];
}

export interface CounterVariations {
  casual: string;
  direct: string;
  empathetic: string;
  punchy: string;
}

export interface SatyaReport {
  id?: string;
  claim: string;
  verification: VerificationResult;
  explanation: string;
  counterMessage: string;
  counterVariations?: CounterVariations;
  timestamp: number;
  mediaType?: 'text' | 'image' | 'video' | 'pdf' | 'audio';
  mediaName?: string;
  deepfakeAnalysis?: DeepfakeAnalysis;
}

export interface HistoryItem {
  id: string;
  claim: string;
  verdict: 'TRUE' | 'FALSE' | 'MISLEADING' | 'COMPLEX' | 'UNCERTAIN' | string;
  confidence?: number;
  snippet: string;
  timestamp: number;
  mediaType?: string;
  report?: SatyaReport;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  createdAt?: number;
}

export interface ResearchItem {
  headline: string;
  correction: string;
  source?: string;
  viralityIndex?: 'HIGH' | 'MEDIUM' | 'EMERGING';
  tags?: string[];
}

export interface ResearchCategory {
  name: string;
  description?: string;
  items: ResearchItem[];
}

export interface ResearchData {
  week_of: string;
  intro: string;
  categories: ResearchCategory[];
  totalAnalyzed?: number;
  debunkedRate?: string;
  trends?: Array<{ topic: string; change: string; threat: 'HIGH' | 'MEDIUM' | 'LOW' }>;
}

export interface VideoKeyframe {
  timestamp: string;
  second: number;
  label: string;
  ocrText?: string;
  anomalyFlag?: boolean;
  anomalyDescription?: string;
}

export interface VideoClaimAnalysis {
  timestamp: string;
  statement: string;
  verdict: 'TRUE' | 'FALSE' | 'MISLEADING' | 'COMPLEX';
  confidence: number;
  evidence: string;
}

export interface VideoForensicResult {
  videoName: string;
  duration: string;
  isSynthetic: boolean;
  syntheticConfidence: number;
  audioVisualSyncStatus: 'Normal' | 'Suspicious Desync' | 'AI Voice Clone Detected' | 'Lip-Sync Artifacts';
  audioArtifacts: string[];
  visualArtifacts: string[];
  lightingConsistencyScore: number;
  facialWarpingDetected: boolean;
  keyframes: VideoKeyframe[];
  transcribedClaims: VideoClaimAnalysis[];
  overallVerdict: 'TRUE' | 'FALSE' | 'MISLEADING' | 'COMPLEX' | 'SYNTHETIC_DEEPFAKE';
  executiveSummary: string;
  suggestedCounterMessage: string;
  sources?: GroundingSource[];
}
