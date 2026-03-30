import { access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { Framework } from '../types/analysis.js';

interface FileStructureDetection {
  frameworks: Framework[];
  ciTools: string[];
}

export async function detectFromFileStructure(
  projectPath: string,
  topLevelDirs: string[],
  configFiles: string[],
): Promise<FileStructureDetection> {
  const frameworks: Framework[] = [];
  const ciTools: string[] = [];

  // AWS CDK detection
  const hasCdkJson = configFiles.some(f => basename(f) === 'cdk.json');
  const hasInfraBin = topLevelDirs.includes('infra');
  if (hasCdkJson || hasInfraBin) {
    frameworks.push({ name: 'AWS CDK', version: 'unknown', confidence: 'medium', role: 'library' });
  }

  // Terraform detection
  const hasTerraform = topLevelDirs.includes('terraform')
    || configFiles.some(f => f.endsWith('.tf'));
  if (hasTerraform) {
    frameworks.push({ name: 'Terraform', version: 'unknown', confidence: 'medium', role: 'library' });
  }

  // GitHub Actions detection
  try {
    await access(join(projectPath, '.github', 'workflows'));
    ciTools.push('GitHub Actions');
  } catch {
    // no GH actions
  }

  // CircleCI detection
  try {
    await access(join(projectPath, '.circleci'));
    ciTools.push('CircleCI');
  } catch {
    // no circleci
  }

  // Turbo
  if (configFiles.some(f => basename(f) === 'turbo.json')) {
    frameworks.push({ name: 'Turborepo', version: 'unknown', confidence: 'high', role: 'library' });
  }

  // Nx
  if (configFiles.some(f => basename(f) === 'nx.json')) {
    frameworks.push({ name: 'Nx', version: 'unknown', confidence: 'high', role: 'library' });
  }

  return { frameworks, ciTools };
}

export function deduplicateFrameworks(frameworks: Framework[]): Framework[] {
  const seen = new Map<string, Framework>();

  for (const fw of frameworks) {
    const existing = seen.get(fw.name);
    if (!existing) {
      seen.set(fw.name, fw);
    } else {
      // Keep the one with higher confidence
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      if (confidenceOrder[fw.confidence] > confidenceOrder[existing.confidence]) {
        seen.set(fw.name, fw);
      }
    }
  }

  // Sort by confidence (high first), then alphabetically
  return Array.from(seen.values()).sort((a, b) => {
    const confOrder = { high: 3, medium: 2, low: 1 };
    const confDiff = confOrder[b.confidence] - confOrder[a.confidence];
    if (confDiff !== 0) return confDiff;
    return a.name.localeCompare(b.name);
  });
}
