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
  - Generate Markdown output with `--markdown` (default output is XML)
  - Control whitespace/indentation with `--whitespace`
  - Preview output in terminal without saving using `--dry-run` / `-D`
- **Advanced Modes**:
  - **Bulk Mode**: Append AI processing instructions with `--bulk`
  - **Debug/Verbose**: Enable additional logging with `--debug` or `--verbose`
  - **AI Templates**: Apply prompt templates for AI processing with `--template`
- **Configuration File**: Define default options and reusable named command sets in `ffg.config.jsonc`.

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

Use glob patterns to precisely control which files are included or excluded.

```bash
# Include only TypeScript files in the root of the current directory
ffg --include "*.ts"

# Include TypeScript files recursively in all subdirectories
ffg --include "**/*.ts"

# Exclude node_modules and test files recursively
ffg --exclude "**/*test.*,node_modules/**"

# Combine include and exclude for specific filtering in the 'src' directory
ffg src --include "**/*.ts" --exclude "**/*.spec.ts,**/__tests__/**"
```

**Note:**
- A pattern like `*.ts` matches files only in the immediate directory being scanned.
- Use `**/*` to match files recursively through all subdirectories (e.g., `**/*.ts`).
- You can provide multiple patterns separated by commas (e.g., `"*.ts,*.js"`) or by using multiple `--include` / `--exclude` flags (e.g., `--include "*.ts" --include "*.js"`).
- You can also include specific files using their absolute paths alongside glob patterns (e.g., `ffg --include "**/*.ts,/Users/me/Documents/important_config.json"`).

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
- **Generate Markdown output (default is XML):**
  ```bash
  ffg src --markdown
  ```
- **Enable whitespace/indentation in output:**
  ```bash
  ffg src --whitespace
  ```
- **Preview output without saving (Dry Run):**
  ```bash
  ffg src --dry-run
  # Alias
  ffg src -D
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
- **Command Traceability:**
  The original command used to generate the output is now included in the XML output for better traceability.
  ```xml
  <project>
    <source>/path/to/source</source>
    <timestamp>20240324-123456</timestamp>
    <command>ffg src --verbose</command>
  </project>
  ```
- **Using AI Prompt Templates:**
  ```bash
  # List all available templates
  ffg --list-templates

  # Apply a specific template
  ffg src --template refactor

  # Combine with other options
  ffg src --template test --include "*.js" --exclude "*.test.js"
  ```

## Configuration File (`ffg.config.jsonc`)

File Forge supports a configuration file named `ffg.config.jsonc` (or `ffg.config.json`) in the root of your project (the directory where you run `ffg`). This allows you to define default options and create reusable, named command configurations.

**Features:**

-   **Default Command:** Specify a `defaultCommand` object whose flags will be applied automatically whenever `ffg` is run without the `--use` flag.
-   **Named Commands:** Define multiple named command configurations under the `commands` object. Invoke a specific named command using the `--use <command-name>` flag.
-   **JSONC Support:** Use comments in your `ffg.config.jsonc` file for better documentation.
-   **Precedence:** Command-line flags always take precedence over configuration file settings. If using `--use <name>`, the named command's settings override `defaultCommand` settings.
-   **Array Merging:** For array flags like `--include`, `--exclude`, `--find`, `--require`, and `--extension`, values provided on the command line are *merged* with (added to) the values defined in the applied configuration (either `defaultCommand` or the named command used with `--use`).
-   **Saving Commands (`--save` / `--save-as`):** You can easily save the current set of command-line flags to your `ffg.config.jsonc` file:
    -   `--save`: Saves the current flags (excluding transient flags like `--pipe`, `--debug`, etc.) as the new `defaultCommand`, overwriting any existing default.
    -   `--save-as <name>`: Saves the current flags under a new named command (or overwrites an existing one with the same name) in the `commands` section.

**Example `ffg.config.jsonc`:**

```jsonc
{
  // Default settings applied when no --use flag is given
  "defaultCommand": {
    "exclude": ["node_modules/**", "dist/**", "*.log"],
    "ignore": true, // Respect .gitignore by default
    "skipArtifacts": true
  },
  // Reusable named command configurations
  "commands": {
    "ts-analysis": {
      "include": ["src/**/*.ts"],
      "exclude": ["**/*.test.ts", "**/*.spec.ts"], // Merged with defaultCommand exclude on use
      "require": ["import", "export"],
      "verbose": true
    },
    "docs-only": {
      "include": ["**/*.md", "docs/**"],
      "markdown": true
    },
    "find-todos": {
      // Inherits defaults from defaultCommand if not overridden
      "find": ["TODO", "FIXME"],
      "include": ["src/**", "scripts/**"]
    }
  }
}
```

**Usage with Config:**

```bash
# Uses defaultCommand settings (exclude node_modules, etc.)
ffg .

# Uses the 'ts-analysis' named command settings
ffg --use ts-analysis

# Uses 'ts-analysis' but overrides verbose and adds another include pattern
ffg --use ts-analysis --verbose=false --include "tests/**/*.ts"
# Resulting flags: include=["src/**/*.ts", "tests/**/*.ts"], exclude=[...], require=[...], verbose=false

# Uses 'find-todos' command
ffg --use find-todos

# Save current flags as the new default command
ffg . --include "**/*.ts" --exclude "node_modules/**" --verbose --save
# This will update ffg.config.jsonc's "defaultCommand"

# Save current flags as a named command 'test-setup'
ffg . --require "test" --exclude "dist/**" --save-as test-setup
# This will add or overwrite "test-setup" in ffg.config.jsonc's "commands"
```

## AI Prompt Templates

File Forge includes a set of prompt templates that can be applied to your analysis results. These templates are designed to guide AI models (like GPT-4 or Claude) in performing specific tasks on your code.

### Available Template Categories

- **Documentation & Explanation**
  - `explain`: Summarize what a code file does in plain language
  - `document`: Insert explanatory comments into the code

- **Refactoring & Improvement**
  - `refactor`: Improve code clarity and maintainability without changing behavior
  - `optimize`: Improve code efficiency without changing behavior
  - `fix`: Find potential bugs or issues and fix them

- **Code Generation**
  - `test`: Generate unit tests for the given code

### Using Templates

1. List all available templates:
   ```bash
   ffg --list-templates
   ```

2. Apply a template to your analysis:
   ```bash
   ffg src --template refactor
   ```

3. The template will be included in the output, with your code analysis inserted in the appropriate place.

4. When you view the output in an editor or copy it to the clipboard, you can then paste it to an AI assistant to get the desired result.

### Customizing Templates

You can create your own templates or override the built-in ones by creating individual template files in your File Forge configuration directory:

- **macOS:** `~/Library/Preferences/@johnlindquist/file-forge/templates/`
- **Linux:** `~/.config/@johnlindquist/file-forge/templates/`
- **Windows:** `%APPDATA%/@johnlindquist/file-forge/templates/`

Each template is a Markdown (`.md`) file with front-matter containing metadata and a body containing the template content. Here's an example template `custom-explain.md`:

```markdown
---
name: custom-explain
category: documentation
description: My custom explanation template
---

**Goal:** Explain this code in simple terms.

**Context:**  
{{ code }}

<instructions>
- Explain what this code does in simple language
- Focus on the main functionality
</instructions>

<task>
Provide a clear explanation of the code for a non-technical audience.
</task>
```

When you run File Forge, it will automatically load and merge your custom templates with the built-in ones.

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

## Test Optimization

The test suite has been optimized to run faster using several strategies:

### Parallel Test Execution

Tests can now run concurrently, leveraging multiple CPU cores for faster test execution. This is enabled in `vitest.config.ts` by removing the `sequence: { concurrent: false }` option.

### Direct Function Testing

Instead of spawning a new process for each test (which is slow), many tests now use the direct function testing approach through `utils/directTestRunner.ts`. This utility allows tests to call the main application functions directly while capturing their output.

Benefits:
- Much faster test execution (typically 5-10x faster)
- Same test coverage and assertions
- No process spawning overhead

To migrate an existing test to use direct function testing:

1. Run the test analysis to see candidates for optimization:
   ```
   pnpm test:optimize:analyze
   ```

2. Migrate a specific test file:
   ```
   pnpm test:optimize test/your-test-file.test.ts
   ```

3. Verify the test still passes and check the performance improvement.

### Batch Migration

To optimize multiple tests at once, you can use the batch processing options:

1. Analyze and run a dry-run batch (no changes applied):
   ```
   pnpm test:optimize:batch:dry
   ```

2. Fast batch migration (skips performance measurement):
   ```
   pnpm test:optimize:batch:fast
   ```

3. Full batch migration with performance measurements:
   ```
   pnpm test:optimize:batch
   ```

Additional options:
- Use `--force` to re-optimize already migrated files
- Use `--dry-run` to see what would be changed without making actual changes
- Use `--skip-measure` to skip performance measurements (faster)

### Best Practices

- Use `beforeAll` instead of `beforeEach` when the setup only needs to be done once for all tests in a describe block
- For expensive file operations, consider mocking the filesystem
- Use the `waitForFile` helper with appropriate timeouts for file-based tests
- Run optimized test files with `pnpm test:direct` to verify they still work

### Additional Tools

- `scripts/optimize-tests.js`: Helper script to analyze and optimize test files
- `utils/directTestRunner.ts`: Direct function execution utility
- `test/helpers/fileWaiter.ts`: Optimized file waiting utility with adaptive polling

### Inspiration

- https://gitingest.com/