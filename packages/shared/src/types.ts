export type Severity = 'info' | 'warn' | 'error';

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Suggestion {
  summary: string;
  details: string;
  proposedPatch?: string;
  proposedDiff?: string;
}

export interface Issue {
  id: string;
  ruleId: string;
  severity: Severity;
  message: string;
  filePath: string;
  range: Range;
  suggestion: Suggestion;
}

export interface VirtualFile {
  path: string;
  content: string;
}

export interface AnalysisSummary {
  totalIssues: number;
  bySeverity: Record<Severity, number>;
  score: number;
}

export interface AnalysisMeta {
  analyzedFilesCount: number;
  analyzedDirectories: string[];
}

export interface AnalysisReport {
  summary: AnalysisSummary;
  issues: Issue[];
  meta: AnalysisMeta;
}
