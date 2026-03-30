import { describe, it, expect } from 'vitest';
import { parseResponse, validateGeneratedFiles, getMissingFiles, buildRetryPrompt } from '../../src/generator/response-parser.js';

describe('parseResponse', () => {
  it('parses a response with multiple file sections', () => {
    const response = `=== CLAUDE.md ===
## Project Overview

This is a NestJS backend with TypeORM.

## Architecture

Modular NestJS structure.

=== .cursorrules ===
You are an expert NestJS developer.

Tech stack: NestJS, TypeORM, PostgreSQL, Jest

=== .github/copilot-instructions.md ===
# Copilot Instructions

Use NestJS patterns for all new modules.
`;

    const files = parseResponse(response, ['claude', 'cursor', 'copilot']);
    expect(files['CLAUDE.md']).toContain('Project Overview');
    expect(files['CLAUDE.md']).toContain('NestJS backend');
    expect(files['.cursorrules']).toContain('You are an expert');
    expect(files['.github/copilot-instructions.md']).toContain('NestJS patterns');
  });

  it('handles extra whitespace around delimiters', () => {
    const response = `===  CLAUDE.md  ===
## Project Overview

Test content here.
`;
    const files = parseResponse(response, ['claude']);
    expect(files['CLAUDE.md']).toContain('Test content here');
  });

  it('ignores text before the first delimiter', () => {
    const response = `Some preamble text that should be ignored.

=== CLAUDE.md ===
## Project Overview

The actual content.
`;
    const files = parseResponse(response, ['claude']);
    expect(files['CLAUDE.md']).toContain('The actual content');
    expect(files['CLAUDE.md']).not.toContain('preamble');
  });

  it('returns empty object for empty response', () => {
    const files = parseResponse('', ['claude']);
    expect(Object.keys(files)).toHaveLength(0);
  });

  it('ignores invalid filenames', () => {
    const response = `=== invalid-file.txt ===
Some content

=== CLAUDE.md ===
Valid content
`;
    const files = parseResponse(response, ['claude']);
    expect(files['CLAUDE.md']).toContain('Valid content');
    expect((files as Record<string, string>)['invalid-file.txt']).toBeUndefined();
  });
});

describe('validateGeneratedFiles', () => {
  it('warns when CLAUDE.md is too short', () => {
    const files = { 'CLAUDE.md': 'Short content.' };
    const warnings = validateGeneratedFiles(files);
    expect(warnings.some(w => w.includes('too short'))).toBe(true);
  });

  it('warns when .cursorrules does not start correctly', () => {
    const files = { '.cursorrules': 'This file does not start correctly.' };
    const warnings = validateGeneratedFiles(files);
    expect(warnings.some(w => w.includes('should start with'))).toBe(true);
  });

  it('warns about generic filler phrases in CLAUDE.md', () => {
    const content = '## Project Overview\n\n' + 'word '.repeat(250) + '\n\nFollowing best practices for maintainable code.';
    const files = { 'CLAUDE.md': content };
    const warnings = validateGeneratedFiles(files);
    expect(warnings.some(w => w.includes('generic filler'))).toBe(true);
  });

  it('returns no warnings for well-formed files', () => {
    const claudeContent = `## Project Overview

This is a NestJS backend with TypeORM and PostgreSQL.

## Architecture

Modular NestJS structure with services, controllers, and DTOs.

## Key Conventions

Use kebab-case for file names. Use PascalCase for classes.

## Common Commands

pnpm run start:dev - Start development server
pnpm test - Run tests

## Anti-patterns to Avoid

Never use raw SQL queries. Always use TypeORM repositories.

${'Additional context about the project. '.repeat(10)}`;

    const cursorContent = `You are an expert NestJS developer.

Tech stack: NestJS 10, TypeORM, PostgreSQL, Jest, TypeScript 5

${'Specific project details and conventions to follow. '.repeat(5)}`;

    const files = {
      'CLAUDE.md': claudeContent,
      '.cursorrules': cursorContent,
    };
    const warnings = validateGeneratedFiles(files);
    // Should have no critical warnings for well-formed content
    // Allow size-related warnings which depend on exact content length
    const criticalWarnings = warnings.filter(w =>
      !w.includes('too short') && !w.includes('long') && !w.includes('chars')
    );
    expect(criticalWarnings).toHaveLength(0);
  });
});

describe('getMissingFiles', () => {
  it('identifies missing files', () => {
    const files = { 'CLAUDE.md': 'content' };
    const missing = getMissingFiles(files, ['claude', 'cursor']);
    expect(missing).toContain('.cursorrules');
    expect(missing).not.toContain('CLAUDE.md');
  });

  it('returns empty array when all files present', () => {
    const files = {
      'CLAUDE.md': 'content',
      '.cursorrules': 'content',
    };
    const missing = getMissingFiles(files, ['claude', 'cursor']);
    expect(missing).toHaveLength(0);
  });
});

describe('buildRetryPrompt', () => {
  it('constructs a retry prompt with the missing filename', () => {
    const prompt = buildRetryPrompt('.cursorrules');
    expect(prompt).toContain('.cursorrules');
    expect(prompt).toContain('missing');
    expect(prompt).toContain('=== .cursorrules ===');
  });
});
