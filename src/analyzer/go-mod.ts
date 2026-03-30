import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Framework, Language } from '../types/analysis.js';

interface GoModAnalysis {
  moduleName: string;
  goVersion: string;
  languages: Language[];
  frameworks: Framework[];
  databases: string[];
  testFrameworks: string[];
  otherDeps: string[];
}

const GO_FRAMEWORK_MAPPINGS: Array<{ dep: string; name: string; role: Framework['role'] }> = [
  { dep: 'github.com/gin-gonic/gin', name: 'Gin', role: 'backend' },
  { dep: 'github.com/labstack/echo', name: 'Echo', role: 'backend' },
  { dep: 'github.com/gofiber/fiber', name: 'Fiber', role: 'backend' },
  { dep: 'github.com/go-chi/chi', name: 'Chi', role: 'backend' },
  { dep: 'github.com/gorilla/mux', name: 'Gorilla Mux', role: 'backend' },
  { dep: 'google.golang.org/grpc', name: 'gRPC', role: 'backend' },
];

const GO_DB_MAPPINGS: Record<string, string> = {
  'gorm.io/gorm': 'GORM',
  'github.com/jackc/pgx': 'PostgreSQL (pgx)',
  'github.com/go-sql-driver/mysql': 'MySQL',
  'github.com/redis/go-redis': 'Redis',
  'go.mongodb.org/mongo-driver': 'MongoDB',
  'github.com/mattn/go-sqlite3': 'SQLite',
};

const GO_TEST_MAPPINGS: Record<string, string> = {
  'github.com/stretchr/testify': 'Testify',
  'github.com/onsi/ginkgo': 'Ginkgo',
  'github.com/onsi/gomega': 'Gomega',
};

const GO_OTHER_MAPPINGS: Record<string, string> = {
  'go.uber.org/zap': 'Zap Logger',
  'github.com/sirupsen/logrus': 'Logrus',
  'github.com/spf13/cobra': 'Cobra CLI',
  'github.com/spf13/viper': 'Viper Config',
  'github.com/anthropics/anthropic-sdk-go': 'Anthropic SDK',
  'github.com/golang-jwt/jwt': 'JWT',
  'github.com/swaggo/swag': 'Swagger',
};

export async function analyzeGoMod(projectPath: string): Promise<GoModAnalysis | null> {
  let content: string;
  try {
    content = await readFile(join(projectPath, 'go.mod'), 'utf-8');
  } catch {
    return null;
  }

  const lines = content.split('\n');

  // Extract module name
  const moduleLine = lines.find(l => l.startsWith('module '));
  const moduleName = moduleLine ? moduleLine.replace('module ', '').trim() : 'unknown';

  // Extract Go version
  const goLine = lines.find(l => l.startsWith('go '));
  const goVersion = goLine ? goLine.replace('go ', '').trim() : 'unknown';

  // Extract require blocks
  const deps: string[] = [];
  let inRequire = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'require (') {
      inRequire = true;
      continue;
    }
    if (trimmed === ')') {
      inRequire = false;
      continue;
    }
    if (inRequire && trimmed && !trimmed.startsWith('//')) {
      const dep = trimmed.split(/\s+/)[0];
      if (dep) deps.push(dep);
    }
    // Single-line require
    if (trimmed.startsWith('require ') && !trimmed.includes('(')) {
      const dep = trimmed.replace('require ', '').split(/\s+/)[0];
      if (dep) deps.push(dep);
    }
  }

  // Map dependencies
  const frameworks: Framework[] = [];
  for (const mapping of GO_FRAMEWORK_MAPPINGS) {
    if (deps.some(d => d.startsWith(mapping.dep))) {
      frameworks.push({
        name: mapping.name,
        version: 'unknown',
        confidence: 'high',
        role: mapping.role,
      });
    }
  }

  const databases: string[] = [];
  for (const [dep, name] of Object.entries(GO_DB_MAPPINGS)) {
    if (deps.some(d => d.startsWith(dep))) databases.push(name);
  }

  const testFrameworks: string[] = ['testing/T'];
  for (const [dep, name] of Object.entries(GO_TEST_MAPPINGS)) {
    if (deps.some(d => d.startsWith(dep))) testFrameworks.push(name);
  }

  const otherDeps: string[] = [];
  for (const [dep, name] of Object.entries(GO_OTHER_MAPPINGS)) {
    if (deps.some(d => d.startsWith(dep))) otherDeps.push(name);
  }

  return {
    moduleName,
    goVersion,
    languages: [{ name: 'Go' }],
    frameworks,
    databases,
    testFrameworks,
    otherDeps,
  };
}
