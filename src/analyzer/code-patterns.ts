import { readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type { CodeConventions, SampledFile } from '../types/analysis.js';

export async function analyzeCodePatterns(
  projectPath: string,
  files: string[],
  depth: 'quick' | 'standard' | 'deep',
): Promise<CodeConventions> {
  const defaults: CodeConventions = {
    namingConventions: {
      files: 'unknown',
      classes: 'PascalCase',
      functions: 'camelCase',
      variables: 'camelCase',
    },
    importStyle: 'esm',
    typeAnnotations: 'none',
    testFilePattern: '',
    testDirectory: '',
    hasBarrelFiles: false,
    asyncPattern: 'async/await',
    errorHandling: 'try/catch',
    sampledFiles: [],
  };

  if (depth === 'quick') return defaults;

  const sourceFiles = files.filter(f => {
    const ext = extname(f);
    return ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs'].includes(ext);
  });

  if (sourceFiles.length === 0) return defaults;

  // File naming convention detection
  const fileNames = sourceFiles.map(f => basename(f, extname(f)));
  defaults.namingConventions.files = detectNamingConvention(fileNames);

  // Test file patterns
  const testFiles = files.filter(f =>
    f.includes('.test.') || f.includes('.spec.') || f.includes('_test.') || f.startsWith('test/')
  );
  if (testFiles.length > 0) {
    if (testFiles.some(f => f.includes('.test.'))) defaults.testFilePattern = '*.test.*';
    else if (testFiles.some(f => f.includes('.spec.'))) defaults.testFilePattern = '*.spec.*';
    else if (testFiles.some(f => f.includes('_test.'))) defaults.testFilePattern = '*_test.*';

    // Test directory
    if (files.some(f => f.startsWith('__tests__/'))) defaults.testDirectory = '__tests__/';
    else if (files.some(f => f.startsWith('tests/'))) defaults.testDirectory = 'tests/';
    else if (files.some(f => f.startsWith('test/'))) defaults.testDirectory = 'test/';
    else defaults.testDirectory = 'inline';
  }

  // Barrel files detection
  defaults.hasBarrelFiles = sourceFiles.some(f => basename(f) === 'index.ts' || basename(f) === 'index.js');

  // Sample some files for deeper analysis
  const sampleSize = Math.min(depth === 'deep' ? 10 : 5, sourceFiles.length);
  const sampled = sourceFiles.slice(0, sampleSize);

  let esmCount = 0;
  let cjsCount = 0;
  let asyncAwaitCount = 0;
  let promiseCount = 0;
  let typeAnnotationCount = 0;
  let totalLines = 0;

  for (const filePath of sampled) {
    try {
      const content = await readFile(join(projectPath, filePath), 'utf-8');
      const lines = content.split('\n');
      totalLines += lines.length;

      // Import style
      if (content.includes('import ') || content.includes('export ')) esmCount++;
      if (content.includes('require(') || content.includes('module.exports')) cjsCount++;

      // Async patterns
      if (content.includes('async ') || content.includes('await ')) asyncAwaitCount++;
      if (content.includes('.then(') || content.includes('new Promise')) promiseCount++;

      // Type annotations
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        const typeLines = lines.filter(l => l.includes(': ') && (l.includes('function') || l.includes('const ') || l.includes('let ')));
        typeAnnotationCount += typeLines.length;
      }

      // Sample files for deep depth
      if (depth === 'deep') {
        const fileType = categorizeFile(filePath);
        defaults.sampledFiles.push({
          path: filePath,
          content: lines.slice(0, 100).join('\n'),
          type: fileType,
        });
      }
    } catch {
      // skip unreadable files
    }
  }

  // Determine import style
  if (esmCount > 0 && cjsCount > 0) defaults.importStyle = 'mixed';
  else if (cjsCount > esmCount) defaults.importStyle = 'commonjs';
  else defaults.importStyle = 'esm';

  // Determine async pattern
  if (asyncAwaitCount > 0 && promiseCount > 0) defaults.asyncPattern = 'mixed';
  else if (promiseCount > asyncAwaitCount) defaults.asyncPattern = 'promises';
  else defaults.asyncPattern = 'async/await';

  // TypeScript strictness
  if (sourceFiles.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
    if (typeAnnotationCount > totalLines * 0.1) defaults.typeAnnotations = 'strict';
    else if (typeAnnotationCount > 0) defaults.typeAnnotations = 'partial';
  }

  // Error handling detection
  const errorPatterns: string[] = [];
  for (const filePath of sampled) {
    try {
      const content = await readFile(join(projectPath, filePath), 'utf-8');
      if (content.includes('try {') || content.includes('try{')) errorPatterns.push('try/catch');
      if (content.includes('Result<') || content.includes('Result.ok') || content.includes('Result.err')) errorPatterns.push('Result type');
      if (content.match(/class \w+Error extends/)) errorPatterns.push('custom error classes');
    } catch {
      // skip
    }
  }
  if (errorPatterns.length > 0) {
    defaults.errorHandling = [...new Set(errorPatterns)].join(', ');
  }

  return defaults;
}

function detectNamingConvention(names: string[]): string {
  let kebab = 0, camel = 0, pascal = 0, snake = 0;

  for (const name of names) {
    if (name.includes('-')) kebab++;
    else if (name.includes('_')) snake++;
    else if (name[0] === name[0].toUpperCase() && name !== name.toUpperCase()) pascal++;
    else camel++;
  }

  const max = Math.max(kebab, camel, pascal, snake);
  if (max === kebab) return 'kebab-case';
  if (max === snake) return 'snake_case';
  if (max === pascal) return 'PascalCase';
  return 'camelCase';
}

function categorizeFile(filePath: string): SampledFile['type'] {
  const lower = filePath.toLowerCase();
  if (lower.includes('test') || lower.includes('spec')) return 'test';
  if (lower.includes('service')) return 'service';
  if (lower.includes('controller') || lower.includes('handler') || lower.includes('route')) return 'controller';
  if (lower.includes('model') || lower.includes('entity') || lower.includes('schema')) return 'model';
  if (lower.includes('config') || lower.includes('setting')) return 'config';
  return 'util';
}
