import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { analyzeGoMod } from '../../src/analyzer/go-mod.js';

const TEST_DIR = join(import.meta.dirname, '__fixtures__', 'go-mod');

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('analyzeGoMod', () => {
  it('returns null if no go.mod exists', async () => {
    const result = await analyzeGoMod(TEST_DIR);
    expect(result).toBeNull();
  });

  it('detects Gin framework and PostgreSQL', async () => {
    await writeFile(join(TEST_DIR, 'go.mod'), `module github.com/myorg/myapp

go 1.22

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/jackc/pgx/v5 v5.5.0
	github.com/redis/go-redis/v9 v9.3.0
	github.com/stretchr/testify v1.8.4
	go.uber.org/zap v1.26.0
)
`);

    const result = await analyzeGoMod(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.moduleName).toBe('github.com/myorg/myapp');
    expect(result!.goVersion).toBe('1.22');
    expect(result!.languages).toContainEqual(expect.objectContaining({ name: 'Go' }));
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'Gin', role: 'backend' }));
    expect(result!.databases).toContain('PostgreSQL (pgx)');
    expect(result!.databases).toContain('Redis');
    expect(result!.testFrameworks).toContain('Testify');
    expect(result!.otherDeps).toContain('Zap Logger');
  });

  it('detects Echo framework', async () => {
    await writeFile(join(TEST_DIR, 'go.mod'), `module myapp

go 1.21

require github.com/labstack/echo/v4 v4.11.0
`);

    const result = await analyzeGoMod(TEST_DIR);
    expect(result).not.toBeNull();
    expect(result!.frameworks).toContainEqual(expect.objectContaining({ name: 'Echo' }));
  });

  it('always includes testing/T as default test framework', async () => {
    await writeFile(join(TEST_DIR, 'go.mod'), `module myapp

go 1.22

require (
	github.com/gin-gonic/gin v1.9.1
)
`);

    const result = await analyzeGoMod(TEST_DIR);
    expect(result!.testFrameworks).toContain('testing/T');
  });
});
