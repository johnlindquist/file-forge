export const APP_NAME = "@johnlindquist/file-forge";
export const APP_COMMAND = "f";
export const APP_DISPLAY_NAME = "File Forge";
export const APP_DESCRIPTION =
  "File Forge is a powerful CLI tool for deep analysis of codebases, generating markdown reports to feed AI reasoning models.";

// Used for env-paths and other system-level identifiers
export const APP_SYSTEM_ID = APP_NAME;

// Used for markdown headers and CLI output
export const APP_HEADER = `# ${APP_DISPLAY_NAME}`;
export const APP_ANALYSIS_HEADER = `${APP_DISPLAY_NAME} Analysis`;

// Property names for consistent usage across files
export const PROP_SUMMARY = "summary";
export const PROP_TREE = "tree";
export const PROP_CONTENT = "content";

// Status messages
export const BRANCH_STATUS = (branch: string) => `Branch: ${branch}`;
export const COMMIT_STATUS = (commit: string) => `Commit: ${commit}`;
export const CHECKOUT_BRANCH_STATUS = (branch: string) =>
  `Checked out branch ${branch}`;
export const CHECKOUT_COMMIT_STATUS = (commit: string) =>
  `Checked out commit ${commit}`;
export const REPO_RESET_COMPLETE = "Repository reset complete";
export const TEXT_DIGEST_BUILT = "Text digest built";

// Used for file naming
export const getAnalysisFilename = (hash: string, timestamp: string) =>
  `${APP_NAME}-${hash}-${timestamp}.md`;

export const FILE_SIZE_MESSAGE = (size: number) =>
  ` [${(size / 1024 / 1024).toFixed(2)} MB - too large]`;

// Return type for ingest functions
export type DigestResult = {
  [PROP_SUMMARY]: string;
  [PROP_TREE]: string;
  [PROP_CONTENT]: string;
};

/** Directories that should always be ignored, regardless of nesting */
export const PERMANENT_IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
  ".cache",
  "coverage",
  ".next",
  ".nuxt",
  "bower_components",
] as const;

/** Glob patterns for permanently ignored directories */
export const PERMANENT_IGNORE_PATTERNS = PERMANENT_IGNORE_DIRS.map(
  (dir) => `**/${dir}/**`
);
