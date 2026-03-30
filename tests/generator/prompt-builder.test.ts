import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../src/generator/prompt-builder.js';
import type { ProjectAnalysis } from '../../src/types/analysis.js';

function createMockAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    path: '/test/project',
    analyzedAt: new Date(),
    depth: 'standard',
    name: 'test-project',
    language: [{ name: 'TypeScript' }],
    packageManager: 'pnpm',
    frameworks: [{ name: 'NestJS', version: '10.0.0', confidence: 'high', role: 'backend' }],
    databases: ['TypeORM', 'PostgreSQL'],
    testFrameworks: ['Jest'],
    buildTools: [],
    linters: ['ESLint'],
    ciTools: ['GitHub Actions'],
    otherDeps: ['Zod'],
    projectStructure: {
      totalFiles: 150,
      totalDirectories: 30,
      topLevelDirs: ['src', 'test', 'docs'],
      sourceRoots: ['src'],
      hasMonorepo: false,
      entryPoints: ['src/main.ts'],
      configFiles: ['tsconfig.json', '.eslintrc.js'],
      hasDocker: true,
      hasInfraAsCode: false,
      approximateLineCount: 5000,
    },
    conventions: {
      namingConventions: { files: 'kebab-case', classes: 'PascalCase', functions: 'camelCase', variables: 'camelCase' },
      importStyle: 'esm',
      typeAnnotations: 'strict',
      testFilePattern: '*.spec.ts',
      testDirectory: 'test/',
      hasBarrelFiles: true,
      asyncPattern: 'async/await',
      errorHandling: 'custom error classes',
      sampledFiles: [],
    },
    existingRules: {},
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('includes project name and framework in user prompt', () => {
    const analysis = createMockAnalysis();
    const { userPrompt } = buildPrompt(analysis, ['claude']);

    expect(userPrompt).toContain('test-project');
    expect(userPrompt).toContain('NestJS');
    expect(userPrompt).toContain('TypeScript');
    expect(userPrompt).toContain('pnpm');
  });

  it('includes CLAUDE.md requirements when claude tool requested', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis(), ['claude']);
    expect(userPrompt).toContain('CLAUDE.md requirements');
    expect(userPrompt).toContain('=== CLAUDE.md ===');
  });

  it('includes .cursorrules requirements when cursor tool requested', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis(), ['cursor']);
    expect(userPrompt).toContain('.cursorrules requirements');
    expect(userPrompt).toContain('=== .cursorrules ===');
  });

  it('includes multiple tool requirements', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis(), ['claude', 'cursor', 'copilot']);
    expect(userPrompt).toContain('CLAUDE.md requirements');
    expect(userPrompt).toContain('.cursorrules requirements');
    expect(userPrompt).toContain('copilot-instructions.md requirements');
  });

  it('includes focus section when provided', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis(), ['claude'], 'focus on security');
    expect(userPrompt).toContain('focus on security');
  });

  it('includes code conventions at standard depth', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis({ depth: 'standard' }), ['claude']);
    expect(userPrompt).toContain('File naming: kebab-case');
    expect(userPrompt).toContain('Import style: esm');
  });

  it('skips code conventions at quick depth', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis({ depth: 'quick' }), ['claude']);
    expect(userPrompt).not.toContain('File naming:');
  });

  it('includes existing rules when present', () => {
    const analysis = createMockAnalysis({
      existingRules: {
        claudeMd: { exists: true, content: '## Existing Rules\n\nSome manual content' },
      },
    });
    const { userPrompt } = buildPrompt(analysis, ['claude']);
    expect(userPrompt).toContain('Existing rules files found');
    expect(userPrompt).toContain('Some manual content');
  });

  it('includes git context when present', () => {
    const analysis = createMockAnalysis({
      gitContext: {
        activeBranch: 'main',
        contributorCount: 5,
        recentCommitMessages: ['feat: add auth', 'fix: login bug'],
        recentlyModifiedFiles: ['src/auth/auth.service.ts'],
      },
    });
    const { userPrompt } = buildPrompt(analysis, ['claude']);
    expect(userPrompt).toContain('Active branch: main');
    expect(userPrompt).toContain('feat: add auth');
  });

  it('system prompt contains key instructions', () => {
    const { systemPrompt } = buildPrompt(createMockAnalysis(), ['claude']);
    expect(systemPrompt).toContain('expert AI coding assistant');
    expect(systemPrompt).toContain('Be specific to the detected stack');
  });

  it('includes database and test info', () => {
    const { userPrompt } = buildPrompt(createMockAnalysis(), ['claude']);
    expect(userPrompt).toContain('TypeORM');
    expect(userPrompt).toContain('PostgreSQL');
    expect(userPrompt).toContain('Jest');
    expect(userPrompt).toContain('ESLint');
  });
});
