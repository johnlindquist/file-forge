# File Forge

**File Forge** is a powerful command‑line tool for deep analysis of codebases. It scans your codebase to generate detailed markdown reports that include a summary, a visual directory structure, and file contents. These reports are optimized for feeding into AI reasoning models.

> **Note:** **File Forge** supports both GitHub URLs (by cloning or updating a cached repository) and local directories. It can also generate dependency graphs for projects using tools like [madge](https://github.com/pahen/madge).

## Features

- 📊 **Comprehensive Analysis**: Generates detailed reports with summaries, directory structures, and file contents
- 🔍 **Smart Filtering**: Include/exclude files based on patterns, find specific content, or require certain strings
- 📦 **GitHub Integration**: Clone repositories or use local directories
- 🌳 **Dependency Graphs**: Generate visual dependency graphs for your project
- 📋 **Multiple Output Options**: Save to file, pipe to another command, or copy to clipboard
- 🎯 **Flexible Search**: Find files containing specific strings or requiring certain content
- 🔄 **Git Branch/Commit Support**: Analyze specific branches or commits

## Installation

Use your favorite package manager to install **File Forge** globally. For example, with [pnpm](https://pnpm.io):

```bash
pnpm add -g @johnlindquist/file-forge
```

Or with npm:

```bash
npm install -g @johnlindquist/file-forge
```

## Usage

Basic usage:

```bash
ffg [options] <repo-or-path>
```

### Examples

#### Analyze a GitHub Repository

```bash
ffg https://github.com/owner/repo
```

#### Analyze a Local Directory

```bash
ffg /path/to/local/project
```

#### Filter Files by Pattern

```bash
ffg /path/to/project --include "*.ts,*.tsx" --exclude "*.spec.*,node_modules"
```

#### Find Files Containing Text

```bash
ffg /path/to/project --find "console,debug"
```

#### Require Files to Have Content

```bash
ffg /path/to/project --require "console,log"
```

#### Analyze a Specific Branch

```bash
ffg https://github.com/owner/repo --branch develop
```

#### Analyze a Specific Commit

```bash
ffg https://github.com/owner/repo --commit a1b2c3d
```

*(When using branch or commit options, **File Forge** will perform the necessary Git operations either with the built‑in git library or using your system's Git if `--use-regular-git` is specified.)*

#### Generate a Dependency Graph

```bash
ffg /path/to/project --graph /path/to/project/src/index.js
```

#### Pipe Output to Another Command

```bash
ffg /path/to/project --pipe
```

#### Open in Default Editor

```bash
ffg /path/to/project --open
```

#### Copy to Clipboard

```bash
ffg /path/to/project --clipboard
```

#### Bulk Analysis Mode

```bash
ffg /path/to/project --bulk --pipe
```

#### Debug Mode

```bash
ffg /path/to/project --debug
```

#### Verbose Output

```bash
ffg /path/to/project --verbose
```

### Ignore Patterns

By default, **File Forge** will read and apply `.gitignore` rules (and other common ignore patterns) to exclude build artifacts and cache files. To disable this behavior:

```bash
ffg /path/to/project --ignore=false
```

## Output Format

When **File Forge** runs, it generates a markdown file containing:

1. **Summary**: A brief overview of the analyzed codebase
2. **Directory Structure**: A visual tree of the project's file structure
3. **File Contents**: The actual content of files (based on filters and options)
4. **Dependency Graph**: (If requested) A visual representation of dependencies

## Configuration

Analysis results are saved in:

- **macOS:** `~/Library/Preferences/@johnlindquist/file-forge/config/`
- **Linux:** `~/.config/@johnlindquist/file-forge/config/`
- **Windows:** `%APPDATA%/@johnlindquist/file-forge/config/`

## Development

To contribute or run **File Forge** locally:

```bash
git clone https://github.com/johnlindquist/file-forge.git
cd @johnlindquist/file-forge
pnpm install
pnpm build
```

### Scripts

- `pnpm build`: Build the project
- `pnpm test`: Run tests
- `pnpm lint`: Run ESLint
- `pnpm format`: Format code with Prettier

### Testing

**File Forge** uses [Vitest](https://vitest.dev/) for testing:

```bash
pnpm test
```

For watch mode:

```bash
pnpm test:watch
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

By covering all of these scenarios and options, **File Forge** provides a flexible solution for codebase analysis, whether you are exploring a new GitHub repository or need to generate comprehensive reports on local projects. Happy analyzing!