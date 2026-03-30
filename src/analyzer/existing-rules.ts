import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExistingRules } from '../types/analysis.js';

interface RuleFileCheck {
  exists: boolean;
  content?: string;
  lastModified?: Date;
}

async function checkRuleFile(projectPath: string, relativePath: string): Promise<RuleFileCheck> {
  const fullPath = join(projectPath, relativePath);
  try {
    const [content, fileStat] = await Promise.all([
      readFile(fullPath, 'utf-8'),
      stat(fullPath),
    ]);
    return {
      exists: true,
      content,
      lastModified: fileStat.mtime,
    };
  } catch {
    return { exists: false };
  }
}

export async function analyzeExistingRules(projectPath: string): Promise<ExistingRules> {
  const [claudeMd, cursorRules, copilotInstructions, windsurfRules] = await Promise.all([
    checkRuleFile(projectPath, 'CLAUDE.md'),
    checkRuleFile(projectPath, '.cursorrules'),
    checkRuleFile(projectPath, '.github/copilot-instructions.md'),
    checkRuleFile(projectPath, '.windsurfrules'),
  ]);

  return {
    claudeMd,
    cursorRules,
    copilotInstructions,
    windsurfRules,
  };
}
