import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { analyzePython } from '../../src/analyzer/python.js';

const TEST_DIR = join(import.meta.dirname, '__fixtures__', 'python');

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('analyzePython', () => {
  it('returns null if no Python config files exist', async () => {
    const result = await analyzePython(TEST_DIR);
    expect(result).toBeNull();
  });

  it('detects FastAPI + SQLAlchemy from requirements.txt', async () => {
    await writeFile(join(TEST_DIR, 'requirements.txt'), `
fastapi==0.104.0
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pytest==7.4.0
ruff==0.1.0
anthropic==0.8.0
`);

    const result = await analyzePython(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.languages).toContainEqual(expect.objectContaining({ name: 'Python' }));
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'FastAPI', role: 'backend' }));
    expect(result!.databases).toContain('SQLAlchemy');
    expect(result!.databases).toContain('PostgreSQL');
    expect(result!.testFrameworks).toContain('Pytest');
    expect(result!.linters).toContain('Ruff');
    expect(result!.otherDeps).toContain('Pydantic');
    expect(result!.otherDeps).toContain('Anthropic SDK');
  });

  it('detects Django from requirements.txt', async () => {
    await writeFile(join(TEST_DIR, 'requirements.txt'), `
django>=4.2
djangorestframework>=3.14
celery>=5.3
redis>=5.0
`);

    const result = await analyzePython(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'Django', role: 'fullstack' }));
    expect(result!.databases).toContain('Redis');
  });

  it('detects poetry package manager from pyproject.toml', async () => {
    await writeFile(join(TEST_DIR, 'pyproject.toml'), `
[tool.poetry]
name = "my-project"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
`);

    const result = await analyzePython(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.packageManager).toBe('poetry');
  });

  it('ignores comment lines in requirements.txt', async () => {
    await writeFile(join(TEST_DIR, 'requirements.txt'), `
# Core dependencies
flask==3.0.0
# Testing
pytest==7.4.0
-r requirements-dev.txt
`);

    const result = await analyzePython(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'Flask' }));
    expect(result!.testFrameworks).toContain('Pytest');
  });
});
