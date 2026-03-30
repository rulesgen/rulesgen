import type { ToolName } from '../types/analysis.js';

const ALL_TOOLS: ToolName[] = ['claude', 'cursor', 'copilot', 'windsurf'];

export function resolveTools(flagValue: string, configTools?: string[]): ToolName[] {
  if (flagValue && flagValue !== 'all') {
    return flagValue.split(',').map(t => t.trim() as ToolName).filter(t => ALL_TOOLS.includes(t));
  }

  if (configTools && configTools.length > 0) {
    return configTools.filter(t => ALL_TOOLS.includes(t as ToolName)) as ToolName[];
  }

  return ALL_TOOLS;
}

export const TOOL_FILE_MAP: Record<ToolName, string> = {
  claude: 'CLAUDE.md',
  cursor: '.cursorrules',
  copilot: '.github/copilot-instructions.md',
  windsurf: '.windsurfrules',
};

export const TOOL_DISPLAY_MAP: Record<ToolName, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
  windsurf: 'Windsurf',
};
