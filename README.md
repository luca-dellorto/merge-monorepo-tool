# merge-monorepo-tool

**CLI tool to merge multiple repositories into a monorepo while preserving Git history.**

## Features

- Merge multiple Git repositories into a single monorepo
- Preserve full commit history for each project
- Supports custom subdirectory mapping for each repo
- Simple configuration via JSON file
- Fast and safe (uses [git-filter-repo](https://github.com/newren/git-filter-repo))

## Installation

You can install globally or use via `npx`:

```sh
npm install -g merge-monorepo-tool
# or
npx merge-monorepo
```

## Usage

### Initialize configuration

Generate a sample configuration file:

```sh
npx merge-monorepo init
```

Edit `monorepo-merge-config.json` to set your repositories and desired subfolders.

### Merge repositories

Run the merge process:

```sh
npx merge-monorepo merge
```

## Configuration

The tool uses a JSON config file named `monorepo-merge-config.json` in your working directory.  
Example:

```json
{
  "default_branch": "main",
  "repos": [
    {
      "source": "/absolute/path/to/repo1",
      "subdir": "apps/backend",
      "branches": { "main": "main" },
      "tags": true
    },
    {
      "source": "/absolute/path/to/repo2",
      "subdir": "apps/frontend",
      "branches": { "main": "main" },
      "tags": true
    }
  ]
}
```

- `source`: Absolute path to the source repository
- `subdir`: Subdirectory in the monorepo where the repo will be placed
- `branches`: Mapping of source branch to target branch
- `tags`: Whether to preserve tags

## Requirements

- [git-filter-repo](https://github.com/newren/git-filter-repo) must be installed and available in your PATH.
- Node.js 16+

## License

MIT

## Author

[Luca Dell'Orto](https://github.com/luca-dellorto)
