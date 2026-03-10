/**
 * Simple .inspectorepoignore loader.
 * Supports simple directory/segment matching and basic *.extension patterns.
 * Does not implement full gitignore semantics or advanced globbing (e.g. **).
 */

/**
 * Parse an ignore file into an array of patterns.
 * Strips comments (#) and blank lines.
 */
export function parseIgnoreFile(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Check if a relative file path matches any ignore pattern.
 *
 * Patterns:
 * - "dist" matches any path segment named "dist" (directory or file)
 * - "*.test.ts" matches files ending with .test.ts at any depth
 * - Patterns without wildcards match as directory or filename segments
 */
export function isIgnored(filePath: string, patterns: string[]): boolean {
  const segments = filePath.split('/');

  for (const pattern of patterns) {
    // Wildcard pattern: *.ext matches filename
    if (pattern.startsWith('*.')) {
      const fileName = segments[segments.length - 1];
      if (fileName.endsWith(pattern.slice(1))) return true;
      continue;
    }

    // Simple name: matches any segment in the path
    if (segments.includes(pattern)) return true;
  }

  return false;
}

/**
 * Filter an array of file paths, removing any that match ignore patterns.
 */
export function filterIgnoredPaths(filePaths: string[], patterns: string[]): string[] {
  if (patterns.length === 0) return filePaths;
  return filePaths.filter((p) => !isIgnored(p, patterns));
}
