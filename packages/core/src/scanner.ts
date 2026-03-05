export function isAnalyzableFile(fileName: string): boolean {
  return fileName.endsWith('.ts') || fileName.endsWith('.tsx');
}

export function filterAnalyzableFiles(fileNames: string[]): string[] {
  return fileNames.filter(isAnalyzableFile);
}
