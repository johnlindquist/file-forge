export const APP_NAME = "@johnlindquist/file-forge"
export const APP_COMMAND = "ffg"
export const APP_DISPLAY_NAME = "File Forge"
export const APP_DESCRIPTION = "File Forge is a powerful CLI tool for deep analysis of codebases, generating markdown reports to feed AI reasoning models."

// Used for env-paths and other system-level identifiers
export const APP_SYSTEM_ID = APP_NAME

// Used for markdown headers and CLI output
export const APP_HEADER = `# ${APP_DISPLAY_NAME}`
export const APP_ANALYSIS_HEADER = `🔍 ${APP_DISPLAY_NAME} Analysis`

// Used for file naming
export const getAnalysisFilename = (hash: string, timestamp: string) => 
  `${APP_NAME}-${hash}-${timestamp}.md` 