import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '../utils/logger.js';

const DEFAULT_CONFIG = {
  version: '1',
  tools: ['claude', 'cursor', 'copilot'],
  depth: 'standard',
  focus: '',
  ignore: [
    '**/*.test.ts',
    '**/fixtures/**',
    '**/node_modules/**',
  ],
  output: '.',
  merge: false,
  dashboard: {
    token: '',
    projectId: '',
  },
  customSections: {
    claude: [],
    cursor: [],
    copilot: [],
    windsurf: [],
  },
};

export async function initCommand(): Promise<void> {
  const logger = createLogger({});
  const configPath = join(process.cwd(), '.rulesgenrc.json');

  try {
    await access(configPath);
    logger.warn('.rulesgenrc.json already exists. Use --force to overwrite.');
    return;
  } catch {
    // File doesn't exist, proceed
  }

  await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf-8');
  logger.success('Created .rulesgenrc.json with default configuration.');
  logger.info('Edit the file to customize your rules generation settings.');
}
