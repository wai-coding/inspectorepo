import type { Rule } from '../rule.js';

export const placeholderRule: Rule = {
  id: 'placeholder',
  name: 'Placeholder Rule',
  description: 'A placeholder rule that returns no issues. Will be replaced with real rules.',
  run(_filePath: string, _content: string) {
    return [];
  },
};
