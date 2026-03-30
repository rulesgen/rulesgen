import { resolve, basename } from 'node:path';
import { access } from 'node:fs/promises';
import type { ProjectAnalysis, Language, Framework } from '../types/analysis.js';
import { analyzeProjectStructure } from './project-structure.js';
import { analyzePackageJson } from './package-json.js';
import { analyzeGoMod } from './go-mod.js';
import { analyzePython } from './python.js';
import { detectFromFileStructure, deduplicateFrameworks } from './framework-detector.js';
import { analyzeCodePatterns } from './code-patterns.js';
import { analyzeGitHistory } from './git-history.js';
import { analyzeExistingRules } from './existing-rules.js';
import { walkDirectory } from '../utils/file-walker.js';

export async function analyzeProject(
  projectPath: string,
  depth: 'quick' | 'standard' | 'deep',
  ignorePatterns?: string[],
): Promise<ProjectAnalysis> {
  const resolvedPath = resolve(projectPath);

  // Verify path exists
  await access(resolvedPath);

  // Run all analyzers in parallel
  const [structure, pkgJson, goMod, python, existingRules, gitContext] = await Promise.all([
    analyzeProjectStructure(resolvedPath, ignorePatterns),
    analyzePackageJson(resolvedPath),
    analyzeGoMod(resolvedPath),
    analyzePython(resolvedPath),
    analyzeExistingRules(resolvedPath),
    depth === 'deep' ? analyzeGitHistory(resolvedPath) : Promise.resolve(undefined),
  ]);

  // File-structure based detection
  const fileStructure = await detectFromFileStructure(
    resolvedPath,
    structure.topLevelDirs,
    structure.configFiles,
  );

  // Get file list for code pattern analysis
  const { files } = await walkDirectory(resolvedPath, ignorePatterns);

  // Code patterns (only at standard/deep)
  const conventions = await analyzeCodePatterns(resolvedPath, files, depth);

  // Merge results from all language analyzers
  const languages: Language[] = [];
  const allFrameworks: Framework[] = [];
  const databases: string[] = [];
  const testFrameworks: string[] = [];
  const buildTools: string[] = [];
  const linters: string[] = [];
  const otherDeps: string[] = [];
  let projectName = basename(resolvedPath);
  let packageManager = 'none';

  // Detect lockfile-based package manager
  if (files.includes('pnpm-lock.yaml')) packageManager = 'pnpm';
  else if (files.includes('yarn.lock')) packageManager = 'yarn';
  else if (files.includes('bun.lockb') || files.includes('bun.lock')) packageManager = 'bun';
  else if (files.includes('package-lock.json')) packageManager = 'npm';

  if (pkgJson) {
    if (pkgJson.name) projectName = pkgJson.name;
    languages.push(...pkgJson.languages);
    allFrameworks.push(...pkgJson.frameworks);
    databases.push(...pkgJson.databases);
    testFrameworks.push(...pkgJson.testFrameworks);
    buildTools.push(...pkgJson.buildTools);
    linters.push(...pkgJson.linters);
    otherDeps.push(...pkgJson.otherDeps);
    if (packageManager === 'none') packageManager = pkgJson.packageManager;
    if (pkgJson.hasWorkspaces) {
      structure.hasMonorepo = true;
      structure.monorepoPackages = pkgJson.workspacePackages;
    }
  }

  if (goMod) {
    if (!projectName || projectName === basename(resolvedPath)) {
      projectName = goMod.moduleName;
    }
    languages.push(...goMod.languages);
    allFrameworks.push(...goMod.frameworks);
    databases.push(...goMod.databases);
    testFrameworks.push(...goMod.testFrameworks);
    otherDeps.push(...goMod.otherDeps);
    if (packageManager === 'none') packageManager = 'go modules';
  }

  if (python) {
    if (python.name && (!projectName || projectName === basename(resolvedPath))) {
      projectName = python.name;
    }
    languages.push(...python.languages);
    allFrameworks.push(...python.frameworks);
    databases.push(...python.databases);
    testFrameworks.push(...python.testFrameworks);
    linters.push(...python.linters);
    otherDeps.push(...python.otherDeps);
    if (packageManager === 'none') packageManager = python.packageManager;
  }

  // Add file-structure detections
  allFrameworks.push(...fileStructure.frameworks);
  const ciTools = [...fileStructure.ciTools];

  // Deduplicate
  const frameworks = deduplicateFrameworks(allFrameworks);
  const uniqueDatabases = [...new Set(databases)];
  const uniqueTestFrameworks = [...new Set(testFrameworks)];
  const uniqueBuildTools = [...new Set(buildTools)];
  const uniqueLinters = [...new Set(linters)];
  const uniqueOtherDeps = [...new Set(otherDeps)];
  const uniqueLanguages = languages.filter((l, i, arr) => arr.findIndex(x => x.name === l.name) === i);

  return {
    path: resolvedPath,
    analyzedAt: new Date(),
    depth,
    name: projectName,
    language: uniqueLanguages,
    packageManager,
    frameworks,
    databases: uniqueDatabases,
    testFrameworks: uniqueTestFrameworks,
    buildTools: uniqueBuildTools,
    linters: uniqueLinters,
    ciTools,
    otherDeps: uniqueOtherDeps,
    projectStructure: structure,
    conventions,
    existingRules,
    gitContext,
  };
}
