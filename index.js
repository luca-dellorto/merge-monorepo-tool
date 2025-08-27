#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execa } from 'execa';
import os from 'os';
import { mkdtemp, rm, cp } from 'fs/promises';

const CONFIG_FILENAME = 'monorepo-merge-config.json';
const defaultConfig = {
  default_branch: "main",
  repos: [
    {
      source: "/path/to/repo1",
      subdir: "apps/backend",
      branches: { main: "main" },
      tags: true
    },
    {
      source: "/path/to/repo2",
      subdir: "apps/frontend",
      branches: { main: "main" },
      tags: true
    }
  ]
};

const command = process.argv[2];


function printHelp() {
  console.log(`
   Usage: npx import-monorepo <command>

    Available commands:
    init   - Create a sample configuration file
    merge  - Migrate repositories into the monorepo

    Examples:
    npx import-monorepo init
    npx import-monorepo merge
    `);
}


function logStep(msg) {
  console.log(`\n🚀 ${msg}`);
}

function logError(msg) {
  console.error(`❌ ${msg}`);
}

async function ensureGitFilterRepo() {
  try {
    await execa('git-filter-repo', ['--help']);
  } catch {
    logError("'git-filter-repo' not found. Please install it manually (https://github.com/newren/git-filter-repo)");
    process.exit(1);
  }
}

async function run(cmd, opts = {}) {
  try {
    const [command, ...args] = cmd;
    const { stdout } = await execa(command, args, opts);
    return stdout;
  } catch (err) {
    logError(`Error executing: ${cmd.join(' ')}`);
    console.error(err.stdout);
    process.exit(1);
  }
}

async function migrateRepo(repo, rootDir) {
  const source = path.resolve(repo.source);
  const subdir = repo.subdir;
  const branches = repo.branches;
  const includeTags = repo.tags;

  logStep(`Starting migration: ${source} → subdirectory '${subdir}'`);

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'monorepo-'));
  const barePath = path.join(tmp, 'bare.git');
  await run(['git', 'clone', '--bare', '--no-local', source, barePath]);

  for (const [srcBranch, targetBranch] of Object.entries(branches)) {
    const filteredPath = path.join(tmp, `${subdir}-${srcBranch}.git`);
    await cp(barePath, filteredPath, { recursive: true });

    const cmd = [
      'git-filter-repo',
      '--to-subdirectory-filter', subdir,
      '--refs', srcBranch
    ];
    if (includeTags) cmd.push('--tag-rename', ':');
    await run(cmd, { cwd: filteredPath });

    const remoteName = `${subdir.replace(/\//g, '_')}_${srcBranch}`;
    await run(['git', 'remote', 'add', remoteName, filteredPath], { cwd: rootDir });
    await run(['git', 'fetch', remoteName], { cwd: rootDir });

    const { stdout: existingBranches } = await execa('git', ['branch', '--list', targetBranch], { cwd: rootDir });

    if (!existingBranches.trim()) {
      console.log(`🟢 Creating branch: ${targetBranch}`);
      await run(['git', 'checkout', '--orphan', targetBranch], { cwd: rootDir });
      await run(['git', 'reset', '--hard'], { cwd: rootDir });
      await run(['git', 'commit', '--allow-empty', '-m', `chore: init ${targetBranch}`], { cwd: rootDir });
    } else {
      await run(['git', 'checkout', targetBranch], { cwd: rootDir });
    }

    await run([
      'git', 'merge', '--allow-unrelated-histories', '--no-ff',
      `${remoteName}/${srcBranch}`,
      '-m', `Merge ${path.basename(source)}::${srcBranch} into ${targetBranch}`
    ], { cwd: rootDir });

    await run(['git', 'remote', 'remove', remoteName], { cwd: rootDir });
  }

  await rm(tmp, { recursive: true, force: true });
}

async function merge() {
  await ensureGitFilterRepo();

  const rootDir = process.cwd();
  const configPath = path.join(rootDir, CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    logError(`Configuration file not found: ${CONFIG_FILENAME}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath));
  const defaultBranch = config.default_branch || 'main';

  if (!fs.existsSync(path.join(rootDir, '.git'))) {
    logStep('Initializing monorepo Git...');
    await run(['git', 'init'], { cwd: rootDir });
    await run(['git', 'checkout', '-b', defaultBranch], { cwd: rootDir });
    await run(['git', 'commit', '--allow-empty', '-m', 'chore: init monorepo'], { cwd: rootDir });
  }

  for (const repo of config.repos) {
    await migrateRepo(repo, rootDir);
  }


  const currentBranch = (await run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd: rootDir })).trim();

  if (currentBranch !== defaultBranch) {
    // Verifica se il branch esiste
    const branchExists = (await run(['git', 'branch', '--list', defaultBranch], { cwd: rootDir })).trim();
    if (branchExists) {
      await run(['git', 'checkout', defaultBranch], { cwd: rootDir });
    } else {
      await run(['git', 'checkout', '-b', defaultBranch], { cwd: rootDir });
    }
  }

  console.log('\n✅ All repositories have been successfully migrated!');
}

function init(){
    const configPath = path.join(process.cwd(), CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
        console.log(`📝 The file ${CONFIG_FILENAME} already exists.`);
        process.exit(0);
    }
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`📝 Configuration file created: ${configPath}`);
    console.log("🔧 Edit the file with your real paths and rerun the script.");
}



async function main() {
  if (command === 'init') {
    init();
    process.exit(0);
  }
  if (command === 'merge') {
    await merge();
    process.exit(0);
  }
  printHelp();
}

main();

export { init };