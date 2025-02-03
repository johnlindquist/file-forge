# ghi (GitHub Ingest)

**ghi** is a powerful command‑line tool for deep analysis of GitHub repositories and local directories. It scans your codebase to generate detailed markdown reports that include a summary, a visual directory tree, file metadata, and (optionally) file contents. Use it to quickly understand new projects, generate documentation, or integrate into your CI/CD workflows.

> **Note:** **ghi** supports both GitHub URLs (by cloning or updating a cached repository) and local directories. It can also generate dependency graphs for projects using tools like [madge](https://github.com/pahen/madge).

---

## Features

- **Repository & Directory Analysis:** Analyze both remote GitHub repositories and local directories.
- **Custom File Filtering:** Include or exclude files using glob patterns, or search by name and file content.
- **Branch & Commit Checkout:** Clone and check out specific branches or commits.
- **Graph Generation:** Create dependency graphs starting from a specified entry file.
- **Output Options:** Save results to a file, pipe the output to STDOUT, or open the digest in your preferred editor.
- **Editor Integration & Clipboard Support:** Configure your editor (or skip it) and even copy results directly to your clipboard.
- **Debug & Verbose Modes:** Get detailed debug output or include full file contents when needed.
- **Bulk Mode for AI Processing:** Append instructions for generating a single shell script that reconstructs the scanned file structure.

---

## Installation

Use your favorite package manager to install **ghi** globally. For example, with [pnpm](https://pnpm.io):

```bash
pnpm add -g ghi
```

Or with npm:

```bash
npm install -g @johnlindquist/ghi
```

---

## Usage

The general usage syntax is:

```bash
ghi [options] <repo-or-path>
```

Where `<repo-or-path>` can be a GitHub repository URL or a local directory path.

### Common Examples

#### 1. Analyze a GitHub Repository

Clone and analyze the repository on the default branch (usually `main`):

```bash
ghi https://github.com/owner/repo
```

#### 2. Analyze a Local Directory

Scan a local directory with default settings:

```bash
ghi /path/to/local/project
```

#### 3. Filter Files with Include/Exclude Patterns

Include only specific files (e.g. only TypeScript files) and/or exclude unwanted files:

```bash
ghi /path/to/project --include "*.ts,*.tsx" --exclude "*.spec.*,node_modules"
```

#### 4. Search Within Files

- **Find Mode (OR behavior):** Find files whose names or content contain *any* of the search terms:

  ```bash
  ghi /path/to/project --find "console,debug"
  ```

- **Require Mode (AND behavior):** Only return files that contain *all* specified terms in their content:

  ```bash
  ghi /path/to/project --require "console,log"
  ```

You can combine `--find` and `--require` to further fine‑tune the selection.

#### 5. Checkout a Specific Branch or Commit

- **Branch Checkout:**

  ```bash
  ghi https://github.com/owner/repo --branch develop
  ```

- **Commit Checkout:**

  ```bash
  ghi https://github.com/owner/repo --commit a1b2c3d
  ```

*(When using branch or commit options, **ghi** will perform the necessary Git operations either with the built‑in git library or using your system’s Git if `--use-regular-git` is specified.)*

#### 6. Generate a Dependency Graph

Analyze a project’s dependency structure starting from a given entry file:

```bash
ghi /path/to/project --graph /path/to/project/src/index.js
```

The output includes a tree‑formatted dependency graph and the content of the related files.

#### 7. Output Options

- **Pipe Mode:** Output the digest directly to STDOUT rather than opening an editor.

  ```bash
  ghi /path/to/project --pipe
  ```

- **Open in Editor:** Automatically open the results file in your preferred editor. On first use, you will be prompted to configure your editor command (e.g. `code`, `vim`, or `nano`):

  ```bash
  ghi /path/to/project --open
  ```

- **Clipboard Support:** Copy the results to your clipboard automatically:

  ```bash
  ghi /path/to/project --clipboard
  ```

#### 8. Bulk Mode for AI Shell Script Generation

Append AI instructions at the end of the output to generate a single shell script that will recreate the file structure and content:

```bash
ghi /path/to/project --bulk --pipe
```

#### 9. Debug and Verbose Modes

- **Debug Mode:** Output extra debug logs to help troubleshoot issues.

  ```bash
  ghi /path/to/project --debug
  ```

- **Verbose Mode:** Include full file contents in the digest (useful for detailed analysis or troubleshooting).

  ```bash
  ghi /path/to/project --verbose
  ```

#### 10. Respecting .gitignore

By default, **ghi** will read and apply `.gitignore` rules (and other common ignore patterns) to exclude build artifacts and cache files. To disable this behavior:

```bash
ghi /path/to/project --ignore=false
```

---

## CLI Options Reference

Below is a summary of the available options:

| Flag(s)                    | Description |
| -------------------------- | ----------- |
| `--include, -i`            | Glob or path patterns to include (comma‑separated or repeatable). |
| `--exclude, -e`            | Glob or path patterns to exclude (comma‑separated or repeatable). |
| `--find, -f`               | Return files that contain **any** of these terms (searches file names and content). |
| `--require, -r`            | Return files that contain **all** of these terms in their content. |
| `--branch, -b`             | Git branch to clone or check out when analyzing a repository URL. |
| `--commit, -c`             | Specific commit SHA to check out when analyzing a repository URL. |
| `--max-size, -s`           | Maximum file size (in bytes) to process per file (default: 10 MB). Files exceeding this limit show a placeholder. |
| `--pipe, -p`               | Pipe the final output to STDOUT (useful for scripting or CI). |
| `--open, -o`               | Open the generated results file in your configured editor. |
| `--debug`                  | Enable detailed debug logging. |
| `--verbose`                | Include detailed file contents in the digest. |
| `--bulk, -k`               | Append AI processing instructions for generating a shell script that rebuilds the file structure. |
| `--ignore`                 | Whether to honor `.gitignore` rules (default: true). Use `--ignore=false` to disable. |
| `--skip-artifacts`         | Skip dependency files, build artifacts, and generated assets (default: true). |
| `--clipboard, -y`          | Copy the results to your clipboard. |
| `--no-editor, -n`          | Save the results file but do not open it in an editor. |
| `--use-regular-git`        | Use the system’s Git commands rather than a library-based Git client. |
| `--graph, -g`              | Analyze a dependency graph starting from the specified entry file. |

---

## Output & Configuration

When **ghi** runs, it generates a markdown file containing:

- **Summary:** Basic information about the source (repository URL or local path), timestamp, and analysis details.
- **Directory Structure:** A tree‑formatted representation of the project.
- **Files Content:** The content of the files that were analyzed (if not skipped, and when verbose or debug modes are enabled).
- **Additional AI Instructions:** (Only when using `--bulk`.)

### Where Are the Results Saved?

The results file is saved to a system‑specific configuration directory:

- **macOS:** `~/Library/Preferences/ghi/config/`
- **Linux:** `~/.config/ghi/config/`
- **Windows:** `%APPDATA%/ghi/config/`

If you run with the `--pipe` flag, the digest is printed to STDOUT as well as saved.

### Editor Configuration

On first use with the `--open` flag, you’ll be prompted to enter your preferred editor command (e.g., `code` for VS Code, `vim`, or `nano`). Your selection is saved for future runs.

---

## Development

To contribute or run **ghi** locally:

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/johnlindquist/ghi.git
   cd ghi
   ```

2. **Install Dependencies:**

   ```bash
   pnpm install
   ```

3. **Run in Development Mode:**

   You can run the CLI directly using:

   ```bash
   pnpm node src/index.ts [options] <repo-or-path>
   ```

4. **Build:**

   ```bash
   pnpm build
   ```

5. **Run Tests:**

   **ghi** uses [Vitest](https://vitest.dev/) for testing:

   ```bash
   pnpm test
   ```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

By covering all of these scenarios and options, **ghi** provides a flexible solution for codebase analysis, whether you are exploring a new GitHub repository or need to generate comprehensive reports on local projects. Happy analyzing!