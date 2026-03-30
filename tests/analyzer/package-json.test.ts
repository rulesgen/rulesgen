import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { analyzePackageJson } from '../../src/analyzer/package-json.js';

const TEST_DIR = join(import.meta.dirname, '__fixtures__', 'pkg-json');

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('analyzePackageJson', () => {
  it('returns null if no package.json exists', async () => {
    const result = await analyzePackageJson(TEST_DIR);
    expect(result).toBeNull();
  });

  it('detects NestJS framework from dependencies', async () => {
    await writeFile(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'my-nestjs-app',
      dependencies: {
        '@nestjs/core': '^10.0.0',
        '@nestjs/common': '^10.0.0',
        typeorm: '^0.3.0',
        pg: '^8.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        jest: '^29.0.0',
        eslint: '^8.0.0',
      },
    }));

    const result = await analyzePackageJson(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('my-nestjs-app');
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'NestJS', role: 'backend' }));
    expect(result!.databases).toContain('TypeORM');
    expect(result!.databases).toContain('PostgreSQL');
    expect(result!.testFrameworks).toContain('Jest');
    expect(result!.linters).toContain('ESLint');
    expect(result!.languages).toContainEqual(expect.objectContaining({ name: 'TypeScript' }));
  });

  it('detects React + Vite frontend', async () => {
    await writeFile(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'my-react-app',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
      devDependencies: {
        vite: '^5.0.0',
        vitest: '^1.0.0',
        prettier: '^3.0.0',
      },
    }));

    const result = await analyzePackageJson(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'React', role: 'frontend' }));
    expect(result!.buildTools).toContain('Vite');
    expect(result!.testFrameworks).toContain('Vitest');
    expect(result!.linters).toContain('Prettier');
  });

  it('detects Next.js (skips plain React)', async () => {
    await writeFile(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'my-next-app',
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
      },
    }));

    const result = await analyzePackageJson(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'Next.js', role: 'fullstack' }));
    // React should not be separately listed since Next.js includes it
    const reactFramework = result!.frameworks.find(f => f.name === 'React');
    expect(reactFramework).toBeUndefined();
  });

  it('detects pnpm package manager from packageManager field', async () => {
    await writeFile(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test',
      packageManager: 'pnpm@8.0.0',
      dependencies: {},
    }));

    const result = await analyzePackageJson(TEST_DIR);
    expect(result!.packageManager).toBe('pnpm');
  });

  it('detects workspaces (monorepo)', async () => {
    await writeFile(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'my-monorepo',
      workspaces: ['packages/*', 'apps/*'],
      dependencies: {},
    }));

    const result = await analyzePackageJson(TEST_DIR);
    expect(result!.hasWorkspaces).toBe(true);
    expect(result!.workspacePackages).toEqual(['packages/*', 'apps/*']);
  });

  it('detects notable other dependencies', async () => {
    await writeFile(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        zod: '^3.0.0',
        stripe: '^14.0.0',
        '@anthropic-ai/sdk': '^0.30.0',
      },
    }));

    const result = await analyzePackageJson(TEST_DIR);
    expect(result!.otherDeps).toContain('Zod');
    expect(result!.otherDeps).toContain('Stripe');
    expect(result!.otherDeps).toContain('Anthropic SDK');
  });
});
