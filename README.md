# ghi (GitHub Ingest)

A powerful CLI tool for deep repository analysis. Quickly scan, analyze, and generate detailed reports of GitHub repositories or local directories. Perfect for understanding new codebases, generating documentation, or analyzing code patterns.

## Installation

```bash
pnpm add -g ghi
```

## Usage

```bash
ghi [options] <repo-or-path>
```

### Examples

```bash
# Analyze a GitHub repo using default settings
ghi https://github.com/owner/repo

# Analyze a local directory with custom patterns
ghi /local/path --include "*.ts" --exclude "*.spec.*"

# Clone specific branch, limit file size, pipe output
ghi https://github.com/owner/repo --branch develop --max-size 500000 --pipe

# Multiple include/exclude patterns
ghi /path --include "*.ts,*.js" --exclude "*.test.*,node_modules"
```

### Options

- `--include, -i` - Glob or path patterns to include (comma-separated or multiple flags)
- `--exclude, -e` - Glob or path patterns to exclude (comma-separated or multiple flags)
- `--branch, -b` - Git branch to clone if using a repo URL
- `--commit, -c` - Specific commit SHA to checkout if using a repo URL
- `--max-size, -s` - Maximum file size to process in bytes (default: 10MB)
- `--pipe, -p` - Pipe output to stdout (still saves results file)
- `--debug` - Enable debug logging

### Default Excludes

The tool automatically excludes common patterns like:
- `node_modules`
- `dist`, `build`
- `.git`
- Various cache and build directories

## Output

Results are saved as markdown files in your system's config directory:
- macOS: `~/Library/Preferences/ghi/config/`
- Linux: `~/.config/ghi/config/`
- Windows: `%APPDATA%/ghi/config/`

The output includes:
- Repository metadata and analysis timestamp
- Directory statistics and metrics
- Visual directory tree structure
- Smart file content analysis
- Code pattern insights
- Dependency information

### Editor Integration

On first run, ghi will prompt you to:
1. Choose whether to automatically open results in an editor
2. Specify your preferred editor command (e.g., 'code', 'vim', 'nano')

Settings can be modified in your system's config directory.

## Features

- Deep repository analysis for GitHub or local directories
- Smart content filtering with glob patterns
- Branch/commit specific analysis
- File size limits and safety checks
- Intelligent tree structure visualization
- Automatic text/binary detection
- Editor integration
- Pipe support for automation and CI/CD

## Development

```bash
# Clone the repo
git clone https://github.com/owner/ghi.git

# Install dependencies
pnpm install

# Run directly
pnpm node index.ts [options] <repo-or-path>

# Build and link
pnpm build
pnpm link
```

## License

MIT 