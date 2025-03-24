<example>
---
description: 
globs: 
alwaysApply: true
---

# GHX - GitHub Code Search CLI

## Key Files

- src/index.ts: Main entry point that defines the CLI commands, search functionality, and result handling
- src/constants.ts: Contains shared constants used across the codebase
- package.json: Project configuration, dependencies, and scripts
- test/index.test.ts: Test suite for verifying functionality
- .husky/pre-commit: Git hooks for ensuring code quality before commits

## Core Features

1. **GitHub Code Search**:
   - Searches GitHub code using the GitHub API
   - Uses the GitHub CLI for authentication
   - Supports advanced search qualifiers

2. **Result Processing**:
   - Formats search results into readable markdown
   - Provides context around code matches
   - Saves results to local filesystem

3. **Editor Integration**:
   - Configurable editor support
   - Prompts for editor preference on first run
   - Opens search results directly in preferred editor

4. **CLI Options**:
   - Customizable search limits
   - Context line configuration
   - Support for GitHub search qualifiers
   - Output piping capabilities

5. **Configuration Management**:
   - Persistent config via Conf package
   - Editor preferences
   - Cross-platform config location

## Main Components

- **Search Logic**: Handles API queries and result processing
- **Output Formatting**: Converts API results to human-readable format
- **Configuration**: Manages user preferences and settings
- **CLI Interface**: Parses command line arguments via yargs

## Development Workflow

- TypeScript-based codebase
- Build process using tsc
- Testing with Vitest
- Semantic versioning and releases
</example> 