import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Framework, Language } from '../types/analysis.js';

interface PythonAnalysis {
  name: string;
  languages: Language[];
  frameworks: Framework[];
  databases: string[];
  testFrameworks: string[];
  linters: string[];
  otherDeps: string[];
  packageManager: string;
}

const PYTHON_FRAMEWORK_MAPPINGS: Array<{ dep: string; name: string; role: Framework['role'] }> = [
  { dep: 'fastapi', name: 'FastAPI', role: 'backend' },
  { dep: 'django', name: 'Django', role: 'fullstack' },
  { dep: 'flask', name: 'Flask', role: 'backend' },
  { dep: 'starlette', name: 'Starlette', role: 'backend' },
  { dep: 'tornado', name: 'Tornado', role: 'backend' },
  { dep: 'aiohttp', name: 'aiohttp', role: 'backend' },
  { dep: 'sanic', name: 'Sanic', role: 'backend' },
  { dep: 'streamlit', name: 'Streamlit', role: 'frontend' },
  { dep: 'gradio', name: 'Gradio', role: 'frontend' },
];

const PYTHON_DB_MAPPINGS: Record<string, string> = {
  sqlalchemy: 'SQLAlchemy',
  'django-orm': 'Django ORM',
  tortoise: 'Tortoise ORM',
  peewee: 'Peewee',
  psycopg2: 'PostgreSQL',
  'psycopg2-binary': 'PostgreSQL',
  pymongo: 'MongoDB',
  redis: 'Redis',
  celery: 'Celery',
  alembic: 'Alembic (migrations)',
};

const PYTHON_TEST_MAPPINGS: Record<string, string> = {
  pytest: 'Pytest',
  unittest: 'unittest',
  nose2: 'nose2',
  hypothesis: 'Hypothesis',
};

const PYTHON_LINTER_MAPPINGS: Record<string, string> = {
  ruff: 'Ruff',
  flake8: 'Flake8',
  black: 'Black',
  mypy: 'mypy',
  pylint: 'Pylint',
  isort: 'isort',
};

const PYTHON_OTHER_MAPPINGS: Record<string, string> = {
  pydantic: 'Pydantic',
  anthropic: 'Anthropic SDK',
  openai: 'OpenAI SDK',
  langchain: 'LangChain',
  'langchain-core': 'LangChain',
  numpy: 'NumPy',
  pandas: 'Pandas',
  scipy: 'SciPy',
  tensorflow: 'TensorFlow',
  torch: 'PyTorch',
  transformers: 'Hugging Face Transformers',
  boto3: 'AWS SDK (boto3)',
  requests: 'Requests',
  httpx: 'HTTPX',
};

export async function analyzePython(projectPath: string): Promise<PythonAnalysis | null> {
  const deps: string[] = [];
  let name = '';
  let packageManager = 'pip';

  // Try pyproject.toml first
  try {
    const content = await readFile(join(projectPath, 'pyproject.toml'), 'utf-8');
    const nameLine = content.match(/^name\s*=\s*"([^"]+)"/m);
    if (nameLine) name = nameLine[1];

    // Check if using poetry
    if (content.includes('[tool.poetry]')) {
      packageManager = 'poetry';
    }
    // Check if using uv/hatch
    if (content.includes('[tool.uv]')) {
      packageManager = 'uv';
    }

    // Extract dependencies from pyproject.toml
    const depsMatches = content.matchAll(/^\s*"?([a-zA-Z0-9_-]+)/gm);
    for (const match of depsMatches) {
      if (match[1]) deps.push(match[1].toLowerCase());
    }

    // Extract from [project.dependencies] or [tool.poetry.dependencies]
    const depSections = content.match(/\[(?:project\.dependencies|tool\.poetry\.dependencies)\]([\s\S]*?)(?:\n\[|$)/);
    if (depSections) {
      const lines = depSections[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*"?([a-zA-Z0-9_-]+)/);
        if (match) deps.push(match[1].toLowerCase());
      }
    }
  } catch {
    // No pyproject.toml
  }

  // Try requirements.txt
  try {
    const content = await readFile(join(projectPath, 'requirements.txt'), 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
      const dep = trimmed.split(/[>=<\[!~]/)[0].trim().toLowerCase();
      if (dep) deps.push(dep);
    }
  } catch {
    // No requirements.txt
  }

  if (deps.length === 0) return null;

  // Deduplicate
  const uniqueDeps = [...new Set(deps)];

  const frameworks: Framework[] = [];
  for (const mapping of PYTHON_FRAMEWORK_MAPPINGS) {
    if (uniqueDeps.includes(mapping.dep)) {
      frameworks.push({
        name: mapping.name,
        version: 'unknown',
        confidence: 'high',
        role: mapping.role,
      });
    }
  }

  const databases: string[] = [];
  for (const [dep, dbName] of Object.entries(PYTHON_DB_MAPPINGS)) {
    if (uniqueDeps.includes(dep)) databases.push(dbName);
  }

  const testFrameworks: string[] = [];
  for (const [dep, testName] of Object.entries(PYTHON_TEST_MAPPINGS)) {
    if (uniqueDeps.includes(dep)) testFrameworks.push(testName);
  }

  const linters: string[] = [];
  for (const [dep, linterName] of Object.entries(PYTHON_LINTER_MAPPINGS)) {
    if (uniqueDeps.includes(dep)) linters.push(linterName);
  }

  const otherDeps: string[] = [];
  for (const [dep, otherName] of Object.entries(PYTHON_OTHER_MAPPINGS)) {
    if (uniqueDeps.includes(dep)) otherDeps.push(otherName);
  }

  return {
    name,
    languages: [{ name: 'Python' }],
    frameworks,
    databases,
    testFrameworks,
    linters,
    otherDeps,
    packageManager,
  };
}
