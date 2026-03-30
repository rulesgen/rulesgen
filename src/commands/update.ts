import type { Command } from 'commander';
import { generateCommand } from './generate.js';

interface UpdateOptions {
  tools: string;
  output: string;
  apiKey?: string;
  model: string;
  force: boolean;
  color?: boolean;
  quiet: boolean;
  config?: string;
  focus?: string;
  depth: string;
}

export async function updateCommand(path: string | undefined, options: UpdateOptions, cmd: Command): Promise<void> {
  // Update is generate with --merge defaulting to true
  await generateCommand(path, {
    ...options,
    preview: false,
    merge: true,
    upload: false,
  }, cmd);
}
