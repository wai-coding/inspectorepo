import type { Rule } from '../rule.js';

export const placeholderRule: Rule = {
  id: 'placeholder',
  title: 'Placeholder Rule',
  severity: 'info',
  run() {
    return [];
  },
};
