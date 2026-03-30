import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '__pycache__',
  '.next',
  '.nuxt',
  'vendor',
  '.venv',
  'venv',
  '.tox',
  '.mypy_cache',
  '.pytest_cache',
  '.cache',
  '.parcel-cache',
  '.turbo',
  '.vercel',
  '.output',
  'target',
  '.idea',
  '.vscode',
  '.DS_Store',
];

export interface WalkResult {
  files: string[];
  directories: string[];
}

export async function walkDirectory(
  rootPath: string,
  ignorePatterns: string[] = [],
): Promise<WalkResult> {
  const allIgnore = [...DEFAULT_IGNORE, ...ignorePatterns];
  const files: string[] = [];
  const directories: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(rootPath, fullPath);

      // Check if this entry should be ignored
      if (shouldIgnore(entry.name, relativePath, allIgnore)) {
        continue;
      }

      if (entry.isDirectory()) {
        directories.push(relativePath);
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await walk(rootPath);
  return { files, directories };
}

function shouldIgnore(name: string, relativePath: string, ignorePatterns: string[]): boolean {
  for (const pattern of ignorePatterns) {
    // Direct name match
    if (name === pattern) return true;

    // Glob-style matching for **/ patterns
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3);
      if (name === suffix || relativePath.endsWith(suffix)) return true;
    }

    // Simple wildcard matching for *.ext patterns
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (name.endsWith(ext)) return true;
    }

    // Path prefix match
    if (relativePath.startsWith(pattern)) return true;
  }
  return false;
}

export async function countLines(filePath: string): Promise<number> {
  try {
    const { default: fs } = await import('node:fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}
