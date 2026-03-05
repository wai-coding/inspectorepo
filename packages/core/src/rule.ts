import type { Issue } from '@inspectorepo/shared';

export interface Rule {
  id: string;
  name: string;
  description: string;
  run(filePath: string, content: string): Issue[];
}
