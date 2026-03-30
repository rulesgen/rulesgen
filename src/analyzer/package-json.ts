import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Framework, Language } from '../types/analysis.js';

interface PackageJsonAnalysis {
  name: string;
  languages: Language[];
  frameworks: Framework[];
  databases: string[];
  testFrameworks: string[];
  buildTools: string[];
  linters: string[];
  otherDeps: string[];
  packageManager: string;
  hasWorkspaces: boolean;
  workspacePackages?: string[];
}

interface DepMapping {
  dep: string;
  name: string;
  role: Framework['role'];
  category?: 'database' | 'test' | 'build' | 'linter' | 'other';
}

const FRAMEWORK_MAPPINGS: DepMapping[] = [
  { dep: '@nestjs/core', name: 'NestJS', role: 'backend' },
  { dep: 'next', name: 'Next.js', role: 'fullstack' },
  { dep: 'react', name: 'React', role: 'frontend' },
  { dep: 'vue', name: 'Vue.js', role: 'frontend' },
  { dep: 'angular', name: 'Angular', role: 'frontend' },
  { dep: '@angular/core', name: 'Angular', role: 'frontend' },
  { dep: 'express', name: 'Express.js', role: 'backend' },
  { dep: 'fastify', name: 'Fastify', role: 'backend' },
  { dep: 'hono', name: 'Hono', role: 'backend' },
  { dep: '@trpc/server', name: 'tRPC', role: 'backend' },
  { dep: 'svelte', name: 'Svelte', role: 'frontend' },
  { dep: '@sveltejs/kit', name: 'SvelteKit', role: 'fullstack' },
  { dep: 'remix', name: 'Remix', role: 'fullstack' },
  { dep: '@remix-run/node', name: 'Remix', role: 'fullstack' },
  { dep: 'astro', name: 'Astro', role: 'fullstack' },
  { dep: 'gatsby', name: 'Gatsby', role: 'fullstack' },
  { dep: 'nuxt', name: 'Nuxt', role: 'fullstack' },
  { dep: 'koa', name: 'Koa', role: 'backend' },
  { dep: 'electron', name: 'Electron', role: 'frontend' },
  { dep: 'react-native', name: 'React Native', role: 'mobile' },
  { dep: 'expo', name: 'Expo', role: 'mobile' },
];

const DATABASE_DEPS: Record<string, string> = {
  typeorm: 'TypeORM',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  'drizzle-orm': 'Drizzle',
  sequelize: 'Sequelize',
  mongoose: 'MongoDB (Mongoose)',
  mongodb: 'MongoDB',
  pg: 'PostgreSQL',
  mysql2: 'MySQL',
  'better-sqlite3': 'SQLite',
  redis: 'Redis',
  ioredis: 'Redis',
  '@aws-sdk/client-dynamodb': 'DynamoDB',
  knex: 'Knex',
};

const TEST_DEPS: Record<string, string> = {
  jest: 'Jest',
  vitest: 'Vitest',
  mocha: 'Mocha',
  ava: 'AVA',
  supertest: 'Supertest',
  '@testing-library/react': 'React Testing Library',
  '@testing-library/jest-dom': 'Testing Library',
  cypress: 'Cypress',
  playwright: 'Playwright',
  '@playwright/test': 'Playwright',
};

const BUILD_DEPS: Record<string, string> = {
  webpack: 'Webpack',
  vite: 'Vite',
  esbuild: 'esbuild',
  rollup: 'Rollup',
  turbo: 'Turborepo',
  tsup: 'tsup',
  swc: 'SWC',
  '@swc/core': 'SWC',
  parcel: 'Parcel',
};

const LINTER_DEPS: Record<string, string> = {
  eslint: 'ESLint',
  prettier: 'Prettier',
  biome: 'Biome',
  '@biomejs/biome': 'Biome',
  oxlint: 'oxlint',
  stylelint: 'Stylelint',
};

const OTHER_NOTABLE_DEPS: Record<string, string> = {
  zod: 'Zod',
  joi: 'Joi',
  stripe: 'Stripe',
  '@anthropic-ai/sdk': 'Anthropic SDK',
  openai: 'OpenAI SDK',
  langchain: 'LangChain',
  '@langchain/core': 'LangChain',
  'class-validator': 'class-validator',
  'class-transformer': 'class-transformer',
  pydantic: 'Pydantic',
  axios: 'Axios',
  'socket.io': 'Socket.IO',
  graphql: 'GraphQL',
  '@apollo/server': 'Apollo GraphQL',
  tailwindcss: 'Tailwind CSS',
  'styled-components': 'styled-components',
  '@emotion/react': 'Emotion',
  storybook: 'Storybook',
  '@storybook/react': 'Storybook',
};

export async function analyzePackageJson(projectPath: string): Promise<PackageJsonAnalysis | null> {
  let content: string;
  try {
    content = await readFile(join(projectPath, 'package.json'), 'utf-8');
  } catch {
    return null;
  }

  let pkg: Record<string, any>;
  try {
    pkg = JSON.parse(content);
  } catch {
    return null;
  }

  const deps = { ...pkg.dependencies };
  const devDeps = { ...pkg.devDependencies };
  const allDeps = { ...deps, ...devDeps };

  const name = pkg.name || '';
  const languages: Language[] = [];

  // Detect TypeScript
  if (allDeps.typescript || devDeps.typescript) {
    languages.push({ name: 'TypeScript' });
  } else {
    languages.push({ name: 'JavaScript' });
  }

  // Detect frameworks
  const frameworks: Framework[] = [];
  const seenFrameworks = new Set<string>();

  for (const mapping of FRAMEWORK_MAPPINGS) {
    if (allDeps[mapping.dep] && !seenFrameworks.has(mapping.name)) {
      seenFrameworks.add(mapping.name);
      // Skip plain React if Next.js is detected
      if (mapping.name === 'React' && seenFrameworks.has('Next.js')) continue;
      // Skip plain Vue if Nuxt is detected
      if (mapping.name === 'Vue.js' && seenFrameworks.has('Nuxt')) continue;

      frameworks.push({
        name: mapping.name,
        version: extractVersion(deps[mapping.dep] || devDeps[mapping.dep]),
        confidence: 'high',
        role: mapping.role,
      });
    }
  }

  // Detect databases
  const databases: string[] = [];
  for (const [dep, name] of Object.entries(DATABASE_DEPS)) {
    if (allDeps[dep] && !databases.includes(name)) {
      databases.push(name);
    }
  }

  // Detect test frameworks
  const testFrameworks: string[] = [];
  for (const [dep, name] of Object.entries(TEST_DEPS)) {
    if (allDeps[dep] && !testFrameworks.includes(name)) {
      testFrameworks.push(name);
    }
  }

  // Detect build tools
  const buildTools: string[] = [];
  for (const [dep, name] of Object.entries(BUILD_DEPS)) {
    if (allDeps[dep] && !buildTools.includes(name)) {
      buildTools.push(name);
    }
  }

  // Detect linters
  const linters: string[] = [];
  for (const [dep, name] of Object.entries(LINTER_DEPS)) {
    if (allDeps[dep] && !linters.includes(name)) {
      linters.push(name);
    }
  }

  // Other notable deps
  const otherDeps: string[] = [];
  for (const [dep, name] of Object.entries(OTHER_NOTABLE_DEPS)) {
    if (allDeps[dep] && !otherDeps.includes(name)) {
      otherDeps.push(name);
    }
  }

  // Package manager detection
  let packageManager = 'npm';
  if (pkg.packageManager) {
    if (pkg.packageManager.startsWith('pnpm')) packageManager = 'pnpm';
    else if (pkg.packageManager.startsWith('yarn')) packageManager = 'yarn';
    else if (pkg.packageManager.startsWith('bun')) packageManager = 'bun';
  }

  // Workspaces
  const hasWorkspaces = !!(pkg.workspaces);
  const workspacePackages = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : pkg.workspaces?.packages;

  return {
    name,
    languages,
    frameworks,
    databases,
    testFrameworks,
    buildTools,
    linters,
    otherDeps,
    packageManager,
    hasWorkspaces,
    workspacePackages,
  };
}

function extractVersion(semver: string | undefined): string {
  if (!semver) return 'unknown';
  // Strip ^ ~ >= etc.
  return semver.replace(/^[\^~>=<]+/, '');
}
