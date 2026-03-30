#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { previewCommand } from './commands/preview.js';

const program = new Command();

program
  .name('rulesgen')
  .description('Generate AI coding assistant rules files from your codebase')
  .version('0.1.0');

program
  .command('generate [path]', { isDefault: true })
  .description('Analyze a codebase and generate rules files')
  .option('--tools <tools>', 'Comma-separated list: claude, cursor, copilot, windsurf, all', 'all')
  .option('--output <dir>', 'Directory to write generated files', '.')
  .option('--api-key <key>', 'Anthropic API key')
  .option('--model <model>', 'Claude model to use', 'claude-sonnet-4-5')
  .option('--preview', 'Print to stdout instead of writing to disk', false)
  .option('--force', 'Overwrite existing files without prompting', false)
  .option('--merge', 'Merge with existing rules files', false)
  .option('--no-color', 'Disable color output')
  .option('--quiet', 'Suppress all output except errors', false)
  .option('--config <path>', 'Path to config file')
  .option('--focus <text>', 'Extra context to focus generation')
  .option('--depth <level>', 'Analysis depth: quick, standard, deep', 'standard')
  .option('--upload', 'Save generated files to rulesgen.dev', false)
  .option('--user-token <token>', 'RulesGen dashboard API token')
  .action(generateCommand);

program
  .command('update [path]')
  .description('Re-analyze and update existing rules files')
  .option('--tools <tools>', 'Comma-separated list: claude, cursor, copilot, windsurf, all', 'all')
  .option('--output <dir>', 'Directory to write generated files', '.')
  .option('--api-key <key>', 'Anthropic API key')
  .option('--model <model>', 'Claude model to use', 'claude-sonnet-4-5')
  .option('--force', 'Overwrite existing files without prompting', false)
  .option('--no-color', 'Disable color output')
  .option('--quiet', 'Suppress all output except errors', false)
  .option('--config <path>', 'Path to config file')
  .option('--focus <text>', 'Extra context to focus generation')
  .option('--depth <level>', 'Analysis depth: quick, standard, deep', 'standard')
  .action(updateCommand);

program
  .command('preview [path]')
  .description('Preview generated rules files without writing to disk')
  .option('--tools <tools>', 'Comma-separated list: claude, cursor, copilot, windsurf, all', 'all')
  .option('--api-key <key>', 'Anthropic API key')
  .option('--model <model>', 'Claude model to use', 'claude-sonnet-4-5')
  .option('--no-color', 'Disable color output')
  .option('--quiet', 'Suppress all output except errors', false)
  .option('--config <path>', 'Path to config file')
  .option('--focus <text>', 'Extra context to focus generation')
  .option('--depth <level>', 'Analysis depth: quick, standard, deep', 'standard')
  .action(previewCommand);

program
  .command('init')
  .description('Create a .rulesgenrc.json config file')
  .action(initCommand);

program.parse();
