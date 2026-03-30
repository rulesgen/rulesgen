import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { select } from '@inquirer/prompts';
import type { GeneratedFiles, WrittenFile } from '../types/analysis.js';
import { estimateTokenCount } from './claude-client.js';

export interface WriteOptions {
  force: boolean;
  merge: boolean;
}

export async function writeFiles(
  files: GeneratedFiles,
  outputDir: string,
  options: WriteOptions,
): Promise<WrittenFile[]> {
  const results: WrittenFile[] = [];

  for (const [filename, content] of Object.entries(files)) {
    if (!content) continue;

    const filePath = join(outputDir, filename);
    const dir = dirname(filePath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    const tokens = estimateTokenCount(content);
    let action: WrittenFile['action'] = 'created';

    // Check if file already exists
    let existingContent: string | null = null;
    try {
      await access(filePath);
      existingContent = await readFile(filePath, 'utf-8');
    } catch {
      // File doesn't exist
    }

    if (existingContent !== null) {
      if (options.force) {
        action = 'overwritten';
      } else if (options.merge) {
        const merged = mergeContent(existingContent, content, filename);
        await writeFile(filePath, merged, 'utf-8');
        results.push({ filename, tokens, action: 'merged' });
        continue;
      } else {
        // Interactive prompt
        const choice = await select({
          message: `${filename} already exists.`,
          choices: [
            { name: 'Overwrite', value: 'overwrite' },
            { name: 'Merge', value: 'merge' },
            { name: 'Skip', value: 'skip' },
            { name: 'Preview diff', value: 'preview' },
          ],
        });

        if (choice === 'skip') {
          results.push({ filename, tokens, action: 'skipped' });
          continue;
        }

        if (choice === 'preview') {
          console.log(`\n--- Existing ${filename} ---`);
          console.log(existingContent.slice(0, 500) + (existingContent.length > 500 ? '\n...(truncated)' : ''));
          console.log(`\n--- Generated ${filename} ---`);
          console.log(content.slice(0, 500) + (content.length > 500 ? '\n...(truncated)' : ''));

          const afterPreview = await select({
            message: 'What would you like to do?',
            choices: [
              { name: 'Overwrite', value: 'overwrite' },
              { name: 'Merge', value: 'merge' },
              { name: 'Skip', value: 'skip' },
            ],
          });

          if (afterPreview === 'skip') {
            results.push({ filename, tokens, action: 'skipped' });
            continue;
          }
          if (afterPreview === 'merge') {
            const merged = mergeContent(existingContent, content, filename);
            await writeFile(filePath, merged, 'utf-8');
            results.push({ filename, tokens, action: 'merged' });
            continue;
          }
          action = 'overwritten';
        }

        if (choice === 'merge') {
          const merged = mergeContent(existingContent, content, filename);
          await writeFile(filePath, merged, 'utf-8');
          results.push({ filename, tokens, action: 'merged' });
          continue;
        }

        if (choice === 'overwrite') {
          action = 'overwritten';
        }
      }
    }

    // Add rulesgen comment
    const finalContent = appendRulesgenComment(content, filename);
    await writeFile(filePath, finalContent, 'utf-8');
    results.push({ filename, tokens, action });
  }

  return results;
}

function mergeContent(existing: string, generated: string, filename: string): string {
  // For Markdown files (CLAUDE.md, copilot-instructions.md)
  if (filename.endsWith('.md')) {
    return mergeMarkdown(existing, generated);
  }

  // For plain text files (.cursorrules, .windsurfrules)
  // Replace entirely but preserve any manual sections marked with comments
  return appendRulesgenComment(generated, filename);
}

function mergeMarkdown(existing: string, generated: string): string {
  const existingSections = parseMarkdownSections(existing);
  const generatedSections = parseMarkdownSections(generated);

  const mergedSections: Array<{ heading: string; content: string }> = [];
  const processedHeadings = new Set<string>();

  // First, add all generated sections (they take priority)
  for (const section of generatedSections) {
    mergedSections.push(section);
    processedHeadings.add(section.heading.toLowerCase());
  }

  // Then, add any existing sections not in the generated output (manual additions)
  for (const section of existingSections) {
    if (!processedHeadings.has(section.heading.toLowerCase())) {
      mergedSections.push(section);
    }
  }

  let result = mergedSections
    .map(s => s.heading ? `## ${s.heading}\n\n${s.content}` : s.content)
    .join('\n\n');

  result = appendRulesgenComment(result, 'merged.md');
  return result;
}

function parseMarkdownSections(content: string): Array<{ heading: string; content: string }> {
  const sections: Array<{ heading: string; content: string }> = [];
  const lines = content.split('\n');
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Don't forget the last section
  if (currentHeading || currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }

  return sections;
}

function appendRulesgenComment(content: string, filename: string): string {
  const date = new Date().toISOString().split('T')[0];
  if (filename.endsWith('.md')) {
    return `${content.trimEnd()}\n\n<!-- Last updated by rulesgen v0.1.0 on ${date} -->\n`;
  }
  return `${content.trimEnd()}\n\n# Last updated by rulesgen v0.1.0 on ${date}\n`;
}
