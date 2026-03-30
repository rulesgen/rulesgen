import { cosmiconfig } from 'cosmiconfig';
import type { RulesGenConfig } from './types/config.js';

const explorer = cosmiconfig('rulesgen');

export async function loadConfig(configPath?: string): Promise<RulesGenConfig | null> {
  try {
    const result = configPath
      ? await explorer.load(configPath)
      : await explorer.search();

    if (result && !result.isEmpty) {
      return result.config as RulesGenConfig;
    }
  } catch {
    // Config file not found or invalid, proceed with defaults
  }
  return null;
}
