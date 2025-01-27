# GitIngest CLI

A CLI tool for ingesting and analyzing GitHub repositories or local directories, creating a detailed markdown report of their structure and contents.

## Installation

```bash
pnpm add -g gitingest
```

## Usage

```bash
gitingest [options] <repo-or-path>
```

### Examples

```bash
# Ingest a GitHub repo using default settings
gitingest https://github.com/owner/repo

# Ingest a local directory with custom patterns
gitingest /local/path --include "*.ts" --exclude "*.spec.*"

# Clone specific branch, limit file size, pipe output
gitingest https://github.com/owner/repo --branch develop --max-size 500000 --pipe

# Multiple include/exclude patterns
gitingest /path --include "*.ts,*.js" --exclude "*.test.*,node_modules"
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
- macOS: `~/Library/Preferences/gitingest/config/`
- Linux: `~/.config/gitingest/config/`
- Windows: `%APPDATA%/gitingest/config/`

The output includes:
- Source and timestamp information
- Directory summary (file counts, sizes)
- Tree structure visualization
- File contents (for text files under size limit)

### Editor Integration

On first run, gitingest will prompt you to:
1. Choose whether to automatically open results in an editor
2. Specify your preferred editor command (e.g., 'code', 'vim', 'nano')

You can change these settings by editing the config file in your system's config directory.

## Features

- Analyzes GitHub repos or local directories
- Smart file filtering with glob patterns
- Branch/commit specific cloning
- File size limits and safety checks
- Tree structure visualization
- Automatic text/binary detection
- Editor integration
- Pipe support for automation

## Development

```bash
# Clone the repo
git clone https://github.com/owner/gitingest.git

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