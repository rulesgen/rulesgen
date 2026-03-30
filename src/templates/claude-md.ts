export const CLAUDE_MD_SECTIONS = [
  'Project Overview',
  'Architecture',
  'Key Conventions',
  'Common Commands',
  'Important Files',
  'Anti-patterns to Avoid',
] as const;

export const CLAUDE_MD_TEMPLATE = `## Project Overview

[2-3 sentences describing what this project is and its purpose]

## Architecture

[High-level architecture description]

## Key Conventions

[Specific naming, patterns, and rules]

## Common Commands

[Actual commands using the project's package manager]

## Important Files

[5-10 key files with descriptions]

## Anti-patterns to Avoid

[Project-specific anti-patterns]
`;
