// test/helpers/createTempGitRepo.ts
import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { simpleGit, SimpleGit } from 'simple-git';
import { nanoid } from 'nanoid';

export interface TempGitRepoOptions {
  initialBranch?: string;
  files?: Record<string, string>; // relativePath: content
  commits?: { message: string; files?: string[] }[]; // Optional sequence of commits
}

export interface TempGitRepoResult {
  repoPath: string;
  git: SimpleGit;
  cleanup: () => Promise<void>;
  commitShas?: string[]; // Store commit SHAs if commits are made
}

/**
 * Creates a temporary, isolated Git repository for testing purposes.
 * Initializes Git, optionally creates files, and performs initial commits.
 * Returns the repository path, a simple-git instance, and a cleanup function.
 */
export async function createTempGitRepo(options: TempGitRepoOptions = {}): Promise<TempGitRepoResult> {
  const { initialBranch = 'main', files = {}, commits = [] } = options;
  const repoPrefix = join(tmpdir(), `ffg-test-repo-${nanoid()}-`);
  const repoPath = await mkdtemp(repoPrefix);
  const git = simpleGit(repoPath);
  const commitShas: string[] = [];

  try {
    await git.init();
    // Use a standard config to avoid global git config issues in CI/tests
    await git.addConfig('user.name', 'Test User', false, 'local');
    await git.addConfig('user.email', 'test@example.com', false, 'local');

    // Create and add initial files specified in 'files'
    let initialFilesAdded = false;
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = resolve(repoPath, relativePath);
      const dir = join(filePath, '..'); // Get directory path
      await fs.mkdir(dir, { recursive: true }); // Ensure directory exists
      await fs.writeFile(filePath, content);
      await git.add(relativePath); // Add relative path
      initialFilesAdded = true;
    }

    // Create the FIRST commit to establish HEAD and the default branch.
    // This needs to happen before we try to check/switch branches.
    let firstCommitMade = false;
    if (initialFilesAdded) {
      await git.commit('Initial setup commit');
      const initialCommitResult = await git.revparse(['HEAD']);
      commitShas.push(initialCommitResult.trim());
      firstCommitMade = true;
    } else if (commits.length === 0) {
        // If no files and no commits specified, create an empty initial commit
        await git.commit('Initial empty commit', ['--allow-empty']);
        const initialCommitResult = await git.revparse(['HEAD']);
        commitShas.push(initialCommitResult.trim());
        firstCommitMade = true;
    }
    // If commits *are* specified, but no initial files, we still need an initial commit.
    else if (!initialFilesAdded && commits.length > 0) {
         await git.commit('Setup: Empty initial commit', ['--allow-empty']);
         const initialCommitResult = await git.revparse(['HEAD']);
         commitShas.push(initialCommitResult.trim());
         firstCommitMade = true;
    }

    // If for some reason no initial commit was made (shouldn't happen with above logic), error out.
    if (!firstCommitMade && commits.length === 0 && !initialFilesAdded) {
         // This case implies commits array was not empty initially, but became empty? Unlikely.
         // Or the logic above has a flaw. Add a safety net.
         await git.commit('Fallback empty initial commit', ['--allow-empty']);
         const initialCommitResult = await git.revparse(['HEAD']);
         commitShas.push(initialCommitResult.trim());
    }


    // NOW, check and potentially switch the branch name *after* the first commit exists.
    const currentBranchAfterCommit = await git.revparse(['--abbrev-ref', 'HEAD']);
    if (currentBranchAfterCommit !== initialBranch) {
        // If the default branch isn't the desired one, create and checkout the desired one.
        await git.checkout(['-b', initialBranch]);
    }
    // If currentBranchAfterCommit *is* initialBranch, we're already on it. No action needed.


    // Process additional specified commits (if any)
    // Start loop from index 0 as the first commit might be specified in the commits array
    for (const commitInfo of commits) {
      const filesToCommit = commitInfo.files || []; // Get files for this commit
      if (filesToCommit.length > 0) {
        // If specific files are listed, add only those
        await git.add(filesToCommit);
      }
      // Check if there are staged changes OR if an empty commit is explicitly requested
      const status = await git.status();
      if (status.staged.length > 0 || filesToCommit.length === 0) { // Allow empty commit if files array is empty/undefined
         await git.commit(commitInfo.message, filesToCommit.length === 0 ? ['--allow-empty'] : undefined);
         const commitResult = await git.revparse(['HEAD']);
         commitShas.push(commitResult.trim());
      }
    }

  } catch (error) {
    // Cleanup immediately if setup fails
    await fs.rm(repoPath, { recursive: true, force: true }).catch(() => {}); // Ignore cleanup error
    throw error; // Re-throw the setup error
  }

  const cleanup = async () => {
    await fs.rm(repoPath, { recursive: true, force: true }).catch(() => {}); // Ignore cleanup error
  };

  return { repoPath, git, cleanup, commitShas };
}
