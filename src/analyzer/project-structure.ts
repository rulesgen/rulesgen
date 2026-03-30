import { readdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { walkDirectory } from '../utils/file-walker.js';
import type { ProjectStructure } from '../types/analysis.js';

const SOURCE_ROOT_CANDIDATES = ['src', 'lib', 'app', 'source', 'pkg', 'internal', 'cmd'];
const ENTRY_POINT_NAMES = [
  'index.ts', 'index.js', 'main.ts', 'main.js', 'main.go', 'app.ts', 'app.js',
  'app.py', 'main.py', 'server.ts', 'server.js', 'mod.ts', 'mod.rs', 'lib.rs',
];
const CONFIG_FILE_NAMES = [
  'tsconfig.json', 'jsconfig.json', '.eslintrc', '.eslintrc.js', '.eslintrc.json',
  'eslint.config.js', 'eslint.config.mjs', '.prettierrc', '.prettierrc.json',
  'prettier.config.js', 'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'vitest.config.js', 'webpack.config.js', 'vite.config.ts', 'vite.config.js',
  'rollup.config.js', 'next.config.js', 'next.config.mjs', 'tailwind.config.js',
  'tailwind.config.ts', 'postcss.config.js', '.babelrc', 'babel.config.js',
  'turbo.json', 'nx.json', 'lerna.json', 'pnpm-workspace.yaml',
  'pyproject.toml', 'setup.py', 'setup.cfg', 'Cargo.toml', 'go.mod',
  'Makefile', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  '.dockerignore', '.env.example', '.env.sample',
];
const MONOREPO_SIGNALS = ['turbo.json', 'nx.json', 'lerna.json', 'pnpm-workspace.yaml'];

export async function analyzeProjectStructure(
  projectPath: string,
  ignorePatterns?: string[],
): Promise<ProjectStructure> {
  const { files, directories } = await walkDirectory(projectPath, ignorePatterns);

  // Top-level directories
  let topLevelEntries: import('node:fs').Dirent[] = [];
  try {
    topLevelEntries = await readdir(projectPath, { withFileTypes: true });
  } catch {
    // ignore
  }
  const topLevelDirs = topLevelEntries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map(e => e.name);

  // Source roots
  const sourceRoots = topLevelDirs.filter(d => SOURCE_ROOT_CANDIDATES.includes(d));

  // Entry points
  const entryPoints = files.filter(f => {
    const name = basename(f);
    return ENTRY_POINT_NAMES.includes(name);
  });

  // Config files
  const configFiles = files.filter(f => {
    const name = basename(f);
    return CONFIG_FILE_NAMES.includes(name);
  });

  // Docker detection
  const hasDocker = files.some(f => {
    const name = basename(f);
    return name === 'Dockerfile' || name === 'docker-compose.yml' || name === 'docker-compose.yaml';
  });

  // IaC detection
  const hasInfraAsCode = files.some(f => {
    return f.endsWith('.tf') || basename(f) === 'cdk.json' || f.startsWith('infra/');
  }) || topLevelDirs.includes('terraform') || topLevelDirs.includes('infra');

  // Monorepo detection
  const hasMonorepo = files.some(f => MONOREPO_SIGNALS.includes(basename(f)))
    || (topLevelDirs.includes('apps') && topLevelDirs.includes('packages'));

  // Monorepo packages
  let monorepoPackages: string[] | undefined;
  if (hasMonorepo) {
    monorepoPackages = [];
    for (const dir of ['apps', 'packages']) {
      if (topLevelDirs.includes(dir)) {
        try {
          const pkgEntries = await readdir(join(projectPath, dir), { withFileTypes: true });
          monorepoPackages.push(...pkgEntries.filter(e => e.isDirectory()).map(e => `${dir}/${e.name}`));
        } catch {
          // ignore
        }
      }
    }
  }

  // Approximate line count (sample up to 50 files)
  let approximateLineCount = 0;
  const sourceFiles = files.filter(f => {
    const ext = extname(f);
    return ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.rb'].includes(ext);
  });
  const sampleSize = Math.min(50, sourceFiles.length);
  if (sampleSize > 0) {
    const { readFile } = await import('node:fs/promises');
    const sample = sourceFiles.slice(0, sampleSize);
    let totalSampleLines = 0;
    for (const f of sample) {
      try {
        const content = await readFile(join(projectPath, f), 'utf-8');
        totalSampleLines += content.split('\n').length;
      } catch {
        // skip
      }
    }
    const avgLines = totalSampleLines / sampleSize;
    approximateLineCount = Math.round(avgLines * sourceFiles.length);
  }

  return {
    totalFiles: files.length,
    totalDirectories: directories.length,
    topLevelDirs,
    sourceRoots,
    hasMonorepo,
    monorepoPackages,
    entryPoints,
    configFiles,
    hasDocker,
    hasInfraAsCode,
    approximateLineCount,
  };
}
