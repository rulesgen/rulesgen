export interface Language {
  name: string;
  percentage?: number;
}

export interface Framework {
  name: string;
  version: string;
  confidence: 'high' | 'medium' | 'low';
  role: 'backend' | 'frontend' | 'fullstack' | 'mobile' | 'cli' | 'library';
}

export interface ProjectStructure {
  totalFiles: number;
  totalDirectories: number;
  topLevelDirs: string[];
  sourceRoots: string[];
  hasMonorepo: boolean;
  monorepoPackages?: string[];
  entryPoints: string[];
  configFiles: string[];
  hasDocker: boolean;
  hasInfraAsCode: boolean;
  approximateLineCount: number;
}

export interface CodeConventions {
  namingConventions: {
    files: string;
    classes: string;
    functions: string;
    variables: string;
  };
  importStyle: 'esm' | 'commonjs' | 'mixed';
  typeAnnotations: 'strict' | 'partial' | 'none';
  testFilePattern: string;
  testDirectory: string;
  hasBarrelFiles: boolean;
  asyncPattern: 'async/await' | 'promises' | 'callbacks' | 'mixed';
  errorHandling: string;
  sampledFiles: SampledFile[];
}

export interface SampledFile {
  path: string;
  content: string;
  type: 'service' | 'controller' | 'model' | 'test' | 'config' | 'util';
}

export interface ExistingRules {
  claudeMd?: { exists: boolean; content?: string; lastModified?: Date };
  cursorRules?: { exists: boolean; content?: string; lastModified?: Date };
  copilotInstructions?: { exists: boolean; content?: string; lastModified?: Date };
  windsurfRules?: { exists: boolean; content?: string; lastModified?: Date };
}

export interface GitContext {
  recentCommitMessages: string[];
  activeBranch: string;
  contributorCount: number;
  recentlyModifiedFiles: string[];
}

export interface ProjectAnalysis {
  path: string;
  analyzedAt: Date;
  depth: 'quick' | 'standard' | 'deep';

  name: string;
  language: Language[];
  packageManager: string;

  frameworks: Framework[];
  databases: string[];
  testFrameworks: string[];
  buildTools: string[];
  linters: string[];
  ciTools: string[];
  otherDeps: string[];

  projectStructure: ProjectStructure;
  conventions: CodeConventions;
  existingRules: ExistingRules;
  gitContext?: GitContext;
}

export type ToolName = 'claude' | 'cursor' | 'copilot' | 'windsurf';

export interface GeneratedFile {
  filename: string;
  content: string;
  tokens: number;
}

export interface GeneratedFiles {
  'CLAUDE.md'?: string;
  '.cursorrules'?: string;
  '.github/copilot-instructions.md'?: string;
  '.windsurfrules'?: string;
}

export interface WrittenFile {
  filename: string;
  tokens: number;
  action: 'created' | 'overwritten' | 'merged' | 'skipped';
}
