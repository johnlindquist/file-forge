# File Forge

**File Forge** is a powerful command‑line tool for deep analysis of codebases. It scans your project (or GitHub repository) and generates comprehensive markdown reports that include a summary, a visual directory structure, file contents, and even dependency graphs. These reports are designed to feed AI reasoning models and support a variety of advanced use cases.

> **Note:** File Forge works both with GitHub URLs (by cloning/updating a cached repository) and local directories. It also supports filtering files by patterns, searching for specific content, and advanced output options like piping, clipboard copy, and XML wrapping.

## Features

- **Comprehensive Analysis**: Automatically generate detailed reports with a summary, directory structure, and full file content.
- **Smart Filtering**: Use glob patterns with `--include` and `--exclude` to select exactly which files to analyze.
- **Content Search**: Find files by name using `--find` (OR behavior) or require specific strings in file content using `--require` (AND behavior).
- **Git Integration**: Analyze specific branches (`--branch`) or commits (`--commit`) for GitHub-hosted repositories.
- **Dependency Graphs**: Generate visual dependency graphs using the `--graph` flag.
- **Flexible Output Options**: 
  - Pipe output to stdout with `--pipe`
  - Open results in your default editor with `--open`
  - Copy output to clipboard using `--clipboard`
- **Advanced Modes**:
  - **Bulk Mode**: Append AI processing instructions with `--bulk`
  - **Debug/Verbose**: Enable additional logging with `--debug` or `--verbose`

## Installation

Install **File Forge** globally with your favorite package manager:

```bash
# Using pnpm:
pnpm add -g @johnlindquist/file-forge

# Or using npm:
npm install -g @johnlindquist/file-forge
```

## Usage Examples

### Analyze Current Directory
```bash
# Analyze all files in current directory
ffg

# Analyze specific directory/files in current directory
ffg src
ffg "src/**/*.ts"
```

### Analyze a GitHub Repository
```bash
ffg https://github.com/owner/repo --branch develop
```

### Analyze a Local Directory
```bash
ffg /path/to/local/project
```

### Filter Files by Pattern
```bash
# Filter in current directory
ffg --include "*.ts,*.tsx" --exclude "*.spec.*,node_modules"

# Filter in specific directory
ffg src --include "*.ts" --exclude "*.test.ts"
```

### Search for Specific Content
- **Find files containing ANY of the terms:**
  ```bash
  ffg src --find "console,debug"
  ```
- **Require files to have ALL of the terms:**
  ```bash
  ffg src --require "console,log"
  ```

### Generate a Dependency Graph
```bash
ffg --graph src/index.js
```

### Advanced Options
- **Pipe output:**
  ```bash
  ffg src --pipe
  ```
- **Copy to clipboard:**
  ```bash
  ffg src --clipboard
  ```
- **Bulk Analysis Mode:**
  ```bash
  ffg src --bulk
  ```
- **Enable Debug/Verbose Output:**
  ```bash
  ffg src --debug
  ffg src --verbose
  ```

## Viewing Help

For a complete list of options and examples, run:
```bash
ffg --help
```

## Configuration & Development

Analysis results and configuration are stored in:
- **macOS:** `~/Library/Preferences/@johnlindquist/file-forge/config/`
- **Linux:** `~/.config/@johnlindquist/file-forge/config/`
- **Windows:** `%APPDATA%/@johnlindquist/file-forge/config/`

To contribute or run File Forge locally:
```bash
git clone https://github.com/johnlindquist/file-forge.git
cd @johnlindquist/file-forge
pnpm install
pnpm build
```

## License

This project is licensed under the MIT License – see the LICENSE file for details.