import { EventEmitter } from 'events';

// Simulates a monorepo sub-package entry point
// Triggers: unused-imports (EventEmitter)
// Triggers: early-return (block-style return)
// Triggers: boolean-simplification (double negation)

interface PackageConfig {
  name: string;
  version: string;
  private: boolean;
}

export function validatePackage(config: PackageConfig | null): string {
  if (!config) {
    return 'missing';
  }

  const isPrivate = !!config.private;

  if (config.name.length === 0) {
    return '';
  }

  if (config.version === '') {
    return '';
  }

  return `${config.name}@${config.version}${isPrivate ? ' (private)' : ''}`;
}

export function getPackageDeps(config: PackageConfig): string[] {
  if (config.name !== '' && config.version !== '') {
    return [`${config.name}@${config.version}`];
  }
  return [];
}
