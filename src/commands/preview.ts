import type { Command } from 'commander';
import { generateCommand } from './generate.js';

interface PreviewOptions {
  tools: string;
  apiKey?: string;
  model: string;
  color?: boolean;
  quiet: boolean;
  config?: string;
  focus?: string;
  depth: string;
}

export async function previewCommand(path: string | undefined, options: PreviewOptions, cmd: Command): Promise<void> {
  await generateCommand(path, {
    ...options,
    output: '.',
    preview: true,
    force: false,
    merge: false,
    upload: false,
  }, cmd);
}
