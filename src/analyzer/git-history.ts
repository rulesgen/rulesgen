import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitContext } from '../types/analysis.js';

const execAsync = promisify(exec);

export async function analyzeGitHistory(projectPath: string): Promise<GitContext | undefined> {
  // Check if .git exists
  try {
    await access(join(projectPath, '.git'));
  } catch {
    return undefined;
  }

  const opts = { cwd: projectPath, timeout: 10000 };

  try {
    // Recent commit messages
    let recentCommitMessages: string[] = [];
    try {
      const { stdout } = await execAsync('git log --oneline -20 --format="%s"', opts);
      recentCommitMessages = stdout.trim().split('\n').filter(Boolean);
    } catch {
      // empty repo or error
    }

    // Active branch
    let activeBranch = 'unknown';
    try {
      const { stdout } = await execAsync('git branch --show-current', opts);
      activeBranch = stdout.trim() || 'unknown';
    } catch {
      // detached HEAD or error
    }

    // Contributor count
    let contributorCount = 0;
    try {
      const { stdout } = await execAsync('git shortlog -sn --all | wc -l', opts);
      contributorCount = parseInt(stdout.trim(), 10) || 0;
    } catch {
      // error
    }

    // Recently modified files (last 30 days)
    let recentlyModifiedFiles: string[] = [];
    try {
      const { stdout } = await execAsync('git log --since="30 days ago" --name-only --format="" | sort -u | head -50', opts);
      recentlyModifiedFiles = stdout.trim().split('\n').filter(Boolean);
    } catch {
      // error
    }

    return {
      recentCommitMessages,
      activeBranch,
      contributorCount,
      recentlyModifiedFiles,
    };
  } catch {
    return undefined;
  }
}
