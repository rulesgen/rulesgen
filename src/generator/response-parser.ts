import type { GeneratedFiles, ToolName } from '../types/analysis.js';
import { TOOL_FILE_MAP } from '../utils/tools.js';

const FILE_DELIMITER_REGEX = /===\s*(.+?)\s*===/g;

export function parseResponse(response: string, requestedTools: ToolName[]): GeneratedFiles {
  const files: GeneratedFiles = {};

  // Split on === FILENAME === delimiters
  const sections = response.split(FILE_DELIMITER_REGEX);

  // sections[0] is text before first delimiter (usually empty)
  // sections[1] is filename, sections[2] is content, etc.
  for (let i = 1; i < sections.length; i += 2) {
    const filename = sections[i].trim();
    const content = (sections[i + 1] || '').trim();

    if (isValidFilename(filename) && content) {
      (files as Record<string, string>)[filename] = content;
    }
  }

  return files;
}

function isValidFilename(filename: string): boolean {
  const validNames = [
    'CLAUDE.md',
    '.cursorrules',
    '.github/copilot-instructions.md',
    '.windsurfrules',
  ];
  return validNames.includes(filename);
}

export function validateGeneratedFiles(files: GeneratedFiles): string[] {
  const warnings: string[] = [];

  // CLAUDE.md validation
  if (files['CLAUDE.md']) {
    const content = files['CLAUDE.md'];
    const requiredSections = ['Project Overview', 'Architecture', 'Conventions', 'Commands', 'Anti-patterns'];
    const foundSections = requiredSections.filter(s => content.includes(s));
    if (foundSections.length < 3) {
      warnings.push(`CLAUDE.md only has ${foundSections.length}/5 recommended sections (${requiredSections.join(', ')})`);
    }

    const wordCount = content.split(/\s+/).length;
    if (wordCount < 200) {
      warnings.push(`CLAUDE.md is too short (${wordCount} words, minimum 200)`);
    }
    if (wordCount > 800) {
      warnings.push(`CLAUDE.md is long (${wordCount} words, target 400-600)`);
    }

    // Check for generic filler
    const genericPhrases = ['this is a great project', 'best practices', 'maintainable code', 'clean code'];
    for (const phrase of genericPhrases) {
      if (content.toLowerCase().includes(phrase)) {
        warnings.push(`CLAUDE.md contains generic filler phrase: "${phrase}"`);
      }
    }
  }

  // .cursorrules validation
  if (files['.cursorrules']) {
    const content = files['.cursorrules'];
    if (!content.startsWith('You are an expert')) {
      warnings.push('.cursorrules should start with "You are an expert..."');
    }

    const wordCount = content.split(/\s+/).length;
    if (wordCount < 100) {
      warnings.push(`.cursorrules is too short (${wordCount} words, minimum 100)`);
    }

    if (content.includes('## ')) {
      warnings.push('.cursorrules should not contain Markdown headers (##)');
    }
  }

  // copilot-instructions.md validation
  if (files['.github/copilot-instructions.md']) {
    const content = files['.github/copilot-instructions.md'];
    const hasFrameworkMention = /\b(React|NestJS|Next\.js|FastAPI|Django|Flask|Express|Gin|Vue|Angular|Svelte)\b/.test(content);
    if (!hasFrameworkMention) {
      warnings.push('copilot-instructions.md should mention specific frameworks');
    }

    const hasInstruction = /\b(always|never|use|must)\b/i.test(content);
    if (!hasInstruction) {
      warnings.push('copilot-instructions.md should contain clear instructions (always/never/use)');
    }
  }

  // General size validation
  for (const [filename, content] of Object.entries(files)) {
    if (content.length < 50) {
      warnings.push(`${filename} is suspiciously short (${content.length} chars)`);
    }
    if (content.length > 5000) {
      warnings.push(`${filename} is very long (${content.length} chars, max recommended 5000)`);
    }
  }

  return warnings;
}

export function getMissingFiles(files: GeneratedFiles, requestedTools: ToolName[]): string[] {
  const missing: string[] = [];
  for (const tool of requestedTools) {
    const filename = TOOL_FILE_MAP[tool];
    if (!(files as Record<string, string>)[filename]) {
      missing.push(filename);
    }
  }
  return missing;
}

export function buildRetryPrompt(missingFilename: string): string {
  return `Your previous response was missing the ${missingFilename} section. Please generate only that section now, using the exact format:\n\n=== ${missingFilename} ===\n[content here]`;
}
