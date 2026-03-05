export type Severity = 'info' | 'warning' | 'error';

export interface Issue {
  ruleId: string;
  message: string;
  severity: Severity;
  filePath: string;
  line: number;
  column: number;
  suggestion?: string;
  diff?: string;
}

export interface AnalysisResult {
  filePath: string;
  issues: Issue[];
  scannedAt: string;
}

export interface AnalysisReport {
  results: AnalysisResult[];
  totalIssues: number;
  scannedFiles: number;
  createdAt: string;
}
