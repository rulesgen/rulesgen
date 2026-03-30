import type { Command } from 'commander';
import { loadConfig } from '../config.js';
import { analyzeProject } from '../analyzer/index.js';
import { buildPrompt } from '../generator/prompt-builder.js';
import { createClaudeClient } from '../generator/claude-client.js';
import { parseResponse, validateGeneratedFiles } from '../generator/response-parser.js';
import { writeFiles } from '../generator/output-writer.js';
import { createLogger } from '../utils/logger.js';
import { resolveTools } from '../utils/tools.js';
import ora from 'ora';

interface GenerateOptions {
  tools: string;
  output: string;
  apiKey?: string;
  model: string;
  preview: boolean;
  force: boolean;
  merge: boolean;
  color?: boolean;
  quiet: boolean;
  config?: string;
  focus?: string;
  depth: string;
  upload: boolean;
  userToken?: string;
}

export async function generateCommand(path: string | undefined, options: GenerateOptions, cmd: Command): Promise<void> {
  const projectPath = path || '.';
  const logger = createLogger({ quiet: options.quiet, color: options.color !== false });

  logger.info(`rulesgen v0.1.0\n`);

  // Load config and merge with CLI flags
  const config = await loadConfig(options.config);
  const tools = resolveTools(options.tools, config?.tools);
  const depth = (options.depth || config?.depth || 'standard') as 'quick' | 'standard' | 'deep';
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || config?.apiKey;

  if (!apiKey) {
    logger.error(`No Anthropic API key found.\n\nSet one with:\n  export ANTHROPIC_API_KEY=sk-ant-...\n\nOr pass it directly:\n  rulesgen generate --api-key sk-ant-...\n\nGet your API key at: https://console.anthropic.com/`);
    process.exit(1);
  }

  // Analyze project
  const spinner = ora('Analyzing project...').start();
  let analysis;
  try {
    analysis = await analyzeProject(projectPath, depth, config?.ignore);
    spinner.succeed('Analysis complete');
  } catch (err) {
    spinner.fail('Analysis failed');
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  // Display analysis summary
  logger.info('');
  logger.info('  Detected:');
  if (analysis.frameworks.length > 0) {
    logger.info(`    Framework      ${analysis.frameworks.map(f => `${f.name} ${f.version}`).join(', ')}`);
  }
  if (analysis.language.length > 0) {
    logger.info(`    Language       ${analysis.language.map(l => l.name).join(', ')}`);
  }
  if (analysis.databases.length > 0) {
    logger.info(`    Database       ${analysis.databases.join(', ')}`);
  }
  if (analysis.testFrameworks.length > 0) {
    logger.info(`    Testing        ${analysis.testFrameworks.join(', ')}`);
  }
  logger.info(`    Package mgr    ${analysis.packageManager}`);
  if (analysis.linters.length > 0) {
    logger.info(`    Linters        ${analysis.linters.join(', ')}`);
  }

  const existingFiles = [];
  if (analysis.existingRules.claudeMd?.exists) existingFiles.push('CLAUDE.md');
  if (analysis.existingRules.cursorRules?.exists) existingFiles.push('.cursorrules');
  if (analysis.existingRules.copilotInstructions?.exists) existingFiles.push('copilot-instructions.md');
  if (analysis.existingRules.windsurfRules?.exists) existingFiles.push('.windsurfrules');
  logger.info(`    Existing       ${existingFiles.length > 0 ? existingFiles.join(', ') : 'No AI rules files found'}`);
  logger.info('');

  // Build prompt and generate
  const toolNames = tools.map(t => {
    const map: Record<string, string> = { claude: 'Claude Code', cursor: 'Cursor', copilot: 'GitHub Copilot', windsurf: 'Windsurf' };
    return map[t] || t;
  });
  logger.info(`  Generating rules files for: ${toolNames.join(', ')}\n`);

  const { systemPrompt, userPrompt } = buildPrompt(analysis, tools, options.focus);

  const genSpinner = ora('Generating...').start();
  let responseText: string;
  try {
    const client = createClaudeClient(apiKey, options.model);
    responseText = await client.generate(systemPrompt, userPrompt, (chunk: string) => {
      // Update spinner with streaming progress
      genSpinner.text = `Generating... (streaming)`;
    });
    genSpinner.succeed('Generation complete');
  } catch (err) {
    genSpinner.fail('Generation failed');
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(3);
  }

  // Parse response
  const generatedFiles = parseResponse(responseText, tools);
  const warnings = validateGeneratedFiles(generatedFiles);
  for (const warning of warnings) {
    logger.warn(`  Warning: ${warning}`);
  }

  // Output
  if (options.preview) {
    for (const [filename, content] of Object.entries(generatedFiles)) {
      logger.info(`\n=== ${filename} ===\n`);
      console.log(content);
    }
    return;
  }

  // Write files
  const outputDir = options.output === '.' ? projectPath : options.output;
  const startTime = Date.now();
  try {
    const written = await writeFiles(generatedFiles, outputDir, {
      force: options.force,
      merge: options.merge,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('');
    for (const file of written) {
      logger.success(`  ✓  ${file.filename.padEnd(35)} (${file.tokens} tokens)`);
    }
    logger.info(`\n  Files written in ${elapsed}s. Review them before committing.\n`);
    logger.info('  Tip: Run `rulesgen update` after major refactors to keep your rules current.\n');
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(4);
  }
}
