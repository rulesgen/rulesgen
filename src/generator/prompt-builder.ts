import type { ProjectAnalysis, ToolName } from '../types/analysis.js';
import { TOOL_DISPLAY_MAP } from '../utils/tools.js';

export interface PromptResult {
  systemPrompt: string;
  userPrompt: string;
}

const SYSTEM_PROMPT = `You are an expert AI coding assistant configuration specialist. Your job is to generate high-quality rules files that help AI coding assistants understand a codebase deeply.

These rules files serve as persistent context. They should:
1. Give the AI assistant an accurate mental model of the project architecture
2. Specify the exact conventions and patterns used so the AI produces consistent code
3. Identify common pitfalls and anti-patterns to avoid
4. Provide project-specific commands for common tasks
5. Be concise — every line must earn its place. AI assistants read these files on every request.

Rules files that are too long or too generic are useless. Be specific to the detected stack.`;

export function buildPrompt(
  analysis: ProjectAnalysis,
  tools: ToolName[],
  focus?: string,
): PromptResult {
  const toolNames = tools.map(t => TOOL_DISPLAY_MAP[t]).join(', ');

  const frameworksList = analysis.frameworks.length > 0
    ? analysis.frameworks.map(f => `- ${f.name} ${f.version} (${f.role}, confidence: ${f.confidence})`).join('\n')
    : '- No frameworks detected';

  const languagesList = analysis.language.map(l => l.name).join(', ') || 'Unknown';

  const configFilesList = analysis.projectStructure.configFiles.length > 0
    ? analysis.projectStructure.configFiles.map(f => `- ${f}`).join('\n')
    : '- None detected';

  // Build conditional sections
  let codeConventionsSection = '';
  if (analysis.depth !== 'quick') {
    codeConventionsSection = `### Code conventions:
- File naming: ${analysis.conventions.namingConventions.files}
- Import style: ${analysis.conventions.importStyle}
- TypeScript strictness: ${analysis.conventions.typeAnnotations}
- Test file pattern: ${analysis.conventions.testFilePattern || 'not detected'}
- Test directory: ${analysis.conventions.testDirectory || 'not detected'}
- Async pattern: ${analysis.conventions.asyncPattern}
- Error handling pattern: ${analysis.conventions.errorHandling}
- Barrel files (index.ts re-exports): ${analysis.conventions.hasBarrelFiles}`;

    if (analysis.conventions.sampledFiles.length > 0) {
      codeConventionsSection += `\n\n### Sampled code patterns:\n`;
      for (const sample of analysis.conventions.sampledFiles) {
        codeConventionsSection += `\n#### ${sample.path} (${sample.type}):\n\`\`\`\n${sample.content}\n\`\`\`\n`;
      }
    }
  }

  let existingRulesSection = '';
  const existingFiles = [];
  if (analysis.existingRules.claudeMd?.exists) existingFiles.push({ name: 'CLAUDE.md', content: analysis.existingRules.claudeMd.content });
  if (analysis.existingRules.cursorRules?.exists) existingFiles.push({ name: '.cursorrules', content: analysis.existingRules.cursorRules.content });
  if (analysis.existingRules.copilotInstructions?.exists) existingFiles.push({ name: 'copilot-instructions.md', content: analysis.existingRules.copilotInstructions.content });
  if (analysis.existingRules.windsurfRules?.exists) existingFiles.push({ name: '.windsurfrules', content: analysis.existingRules.windsurfRules.content });

  if (existingFiles.length > 0) {
    existingRulesSection = `### Existing rules files found:\nThe project already has rules files. Preserve any project-specific manual additions and improve the auto-generated sections.\n`;
    for (const file of existingFiles) {
      if (file.content) {
        existingRulesSection += `\nExisting ${file.name}:\n---\n${file.content}\n---\n`;
      }
    }
  }

  let gitContextSection = '';
  if (analysis.gitContext) {
    gitContextSection = `### Git context:
- Active branch: ${analysis.gitContext.activeBranch}
- Contributors: ${analysis.gitContext.contributorCount}
- Recent commit messages:\n${analysis.gitContext.recentCommitMessages.map(m => `  - ${m}`).join('\n')}`;
    if (analysis.gitContext.recentlyModifiedFiles.length > 0) {
      gitContextSection += `\n- Recently modified files:\n${analysis.gitContext.recentlyModifiedFiles.slice(0, 20).map(f => `  - ${f}`).join('\n')}`;
    }
  }

  const focusSection = focus ? `### Focus:\n${focus}` : '';

  // Build the file format instructions
  const fileInstructions = tools.map(tool => {
    const filename = toolToFilename(tool);
    return `=== ${filename} ===\n[file content here]`;
  }).join('\n\n');

  const toolRequirements = tools.map(tool => getToolRequirements(tool)).join('\n\n');

  const userPrompt = `Analyze this project and generate rules files for the following AI coding tools: ${toolNames}.

## Project Analysis

**Project name:** ${analysis.name}
**Primary language(s):** ${languagesList}
**Package manager:** ${analysis.packageManager}

### Frameworks and libraries detected:
${frameworksList}

### Database/ORM:
${analysis.databases.length > 0 ? analysis.databases.map(d => `- ${d}`).join('\n') : '- None detected'}

### Test frameworks:
${analysis.testFrameworks.length > 0 ? analysis.testFrameworks.map(t => `- ${t}`).join('\n') : '- None detected'}

### Build tools:
${analysis.buildTools.length > 0 ? analysis.buildTools.map(b => `- ${b}`).join('\n') : '- None detected'}

### Linters:
${analysis.linters.length > 0 ? analysis.linters.map(l => `- ${l}`).join('\n') : '- None detected'}

### CI/CD:
${analysis.ciTools.length > 0 ? analysis.ciTools.map(c => `- ${c}`).join('\n') : '- None detected'}

### Other notable dependencies:
${analysis.otherDeps.length > 0 ? analysis.otherDeps.map(d => `- ${d}`).join('\n') : '- None'}

### Project structure:
- Total files: ${analysis.projectStructure.totalFiles}
- Top-level directories: ${analysis.projectStructure.topLevelDirs.join(', ')}
- Source root(s): ${analysis.projectStructure.sourceRoots.join(', ') || 'root'}
- Entry points: ${analysis.projectStructure.entryPoints.join(', ') || 'not detected'}
- Is monorepo: ${analysis.projectStructure.hasMonorepo}${analysis.projectStructure.monorepoPackages ? `\n- Monorepo packages: ${analysis.projectStructure.monorepoPackages.join(', ')}` : ''}
- Has Docker: ${analysis.projectStructure.hasDocker}
- Has IaC: ${analysis.projectStructure.hasInfraAsCode}
- Approximate line count: ${analysis.projectStructure.approximateLineCount}

${codeConventionsSection}

### Config files present:
${configFilesList}

${existingRulesSection}
${gitContextSection}
${focusSection}

---

Generate the following files. For each file, output exactly this format with no extra text between files:

${fileInstructions}

---

## Requirements for each file:

${toolRequirements}

Important: Only generate the files requested above. Skip the others entirely.
Be highly specific to the detected stack. Generic advice is worse than no advice.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

function toolToFilename(tool: ToolName): string {
  const map: Record<ToolName, string> = {
    claude: 'CLAUDE.md',
    cursor: '.cursorrules',
    copilot: '.github/copilot-instructions.md',
    windsurf: '.windsurfrules',
  };
  return map[tool];
}

function getToolRequirements(tool: ToolName): string {
  switch (tool) {
    case 'claude':
      return `### CLAUDE.md requirements:
- Start with a "## Project Overview" section (2-3 sentences max)
- Include a "## Architecture" section explaining the high-level structure
- Include a "## Key Conventions" section with the specific naming/pattern rules detected
- Include a "## Common Commands" section with actual commands (use detected package manager)
- Include a "## Important Files" section listing 5-10 key files and what they do
- Include a "## Anti-patterns to Avoid" section with project-specific mistakes
- If the project uses TypeORM: include TypeORM-specific patterns and warnings
- If the project uses NestJS: include NestJS module structure expectations
- If the project has tests: include testing conventions
- Target length: 400-600 words. Every section must be specific to THIS project, not generic.`;

    case 'cursor':
      return `### .cursorrules requirements:
- Plain text format (no Markdown headers — Cursor reads this differently)
- Start with "You are an expert {primary framework} developer."
- List the tech stack concisely on one line
- Specify file naming and structure conventions
- Specify import ordering conventions if detectable
- List anti-patterns relevant to the detected stack
- Target length: 200-350 words. Tighter than CLAUDE.md.`;

    case 'copilot':
      return `### .github/copilot-instructions.md requirements:
- Markdown format
- GitHub Copilot reads this as general coding guidance
- Focus on: language/framework versions, testing requirements, code style
- Include: "Always use {test framework} for tests" with the detected framework
- Include naming conventions
- Include any detected linting rules (eslint, prettier configs)
- Target length: 150-250 words.`;

    case 'windsurf':
      return `### .windsurfrules requirements:
- Plain text format, similar to .cursorrules but Windsurf-optimized
- More verbose on architecture patterns than .cursorrules
- Include cascade/flow-specific hints if monorepo detected
- Target length: 250-400 words.`;
  }
}
