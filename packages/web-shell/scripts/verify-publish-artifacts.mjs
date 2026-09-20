// Runs from `prepublishOnly`: a published version cannot be replaced, so refuse
// to pack artifacts that consumers could not resolve.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), '..');

function normalizePackPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function collectPackedFiles(root) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const output = execFileSync(
    npm,
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const metadata = JSON.parse(output);
  const files = metadata[0]?.files;
  if (!Array.isArray(files)) {
    throw new Error('npm pack did not return a file list');
  }
  return new Set(files.map((file) => normalizePackPath(file.path)));
}

export function verifyPublishArtifacts(root, pkg) {
  const problems = [];
  let packedFiles;
  try {
    packedFiles = collectPackedFiles(root);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    problems.push(`could not inspect npm pack contents: ${message}`);
  }

  const entryPoints = Object.values(pkg.exports).flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.values(entry),
  );
  for (const entry of new Set(entryPoints)) {
    const target = join(root, entry);
    if (!existsSync(target)) {
      problems.push(`missing ${entry}`);
      continue;
    }

    const packedEntry = normalizePackPath(entry);
    if (packedFiles && !packedFiles.has(packedEntry)) {
      problems.push(`${entry} was built but is not included by npm pack`);
    }

    // The bundles share chunks by relative path, and `files` publishes them by
    // globbing `dist/*.js`. Verify both that each chunk was built and that npm
    // will actually include it in the immutable package.
    if (!entry.endsWith('.js')) continue;
    for (const [, specifier] of readFileSync(target, 'utf8').matchAll(
      /(?:from|import\()\s*['"](\.[^'"]+)['"]/g,
    )) {
      const importedTarget = resolve(dirname(target), specifier);
      if (!existsSync(importedTarget)) {
        problems.push(`${entry} imports ${specifier}, which was not built`);
        continue;
      }
      const packedImport = normalizePackPath(relative(root, importedTarget));
      if (packedFiles && !packedFiles.has(packedImport)) {
        problems.push(
          `${entry} imports ${specifier}, which was built but is not included by npm pack`,
        );
      }
    }
  }

  // Declarations ship verbatim, so they must not import through the alias that
  // only this repository resolves.
  const typesDir = join(root, 'dist/types');
  if (existsSync(typesDir)) {
    for (const name of readdirSync(typesDir, { recursive: true })) {
      if (!name.endsWith('.d.ts')) continue;
      const source = readFileSync(join(typesDir, name), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      for (const [, specifier] of source.matchAll(
        /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g,
      )) {
        if (specifier.startsWith('@/')) {
          problems.push(`dist/types/${name} imports the repo-only ${specifier}`);
        }
      }
    }
  }

  return problems;
}

function run() {
  const pkg = JSON.parse(readFileSync(join(defaultRoot, 'package.json'), 'utf8'));
  const problems = verifyPublishArtifacts(defaultRoot, pkg);
  if (problems.length === 0) return;

  console.error(
    `Refusing to publish @qwen-code/web-shell:\n${problems
      .map((problem) => `  - ${problem}`)
      .join('\n')}`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  run();
}
