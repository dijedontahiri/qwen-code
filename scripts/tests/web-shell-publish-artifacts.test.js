/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const verifierPath = join(
  repoRoot,
  'packages/web-shell/scripts/verify-publish-artifacts.mjs',
);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function makeFixture({ entry = 'dist/index.js', source = 'export const ok = true;\n' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'qwen-web-shell-pack-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(dirname(join(root, entry)), { recursive: true });
  cpSync(verifierPath, join(root, 'scripts/verify-publish-artifacts.mjs'));
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        name: '@qwen-code/web-shell',
        version: '0.0.0-test',
        type: 'module',
        exports: {
          '.': {
            import: `./${entry}`,
          },
        },
        files: ['dist/*.js'],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(root, entry), source);
  return root;
}

function packedPaths(root) {
  const result = spawnSync(
    npmCommand,
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );
  expect(result.status, result.stderr).toBe(0);
  const packed = JSON.parse(result.stdout);
  return packed[0].files.map((entry) => entry.path);
}

function runVerifier(root) {
  return spawnSync(process.execPath, ['scripts/verify-publish-artifacts.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('web-shell publish artifact verifier', () => {
  it('rejects an export target that exists on disk but is omitted from npm pack', () => {
    const root = makeFixture({ entry: 'dist/nested/index.js' });
    try {
      expect(packedPaths(root)).not.toContain('dist/nested/index.js');
      const result = runVerifier(root);
      expect(result.status, result.stderr).toBe(1);
      expect(result.stderr).toContain(
        'missing ./dist/nested/index.js from the packed package',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a built relative chunk that npm pack omits', () => {
    const root = makeFixture({
      source: "import './nested/chunk.js';\nexport const ok = true;\n",
    });
    mkdirSync(join(root, 'dist/nested'), { recursive: true });
    writeFileSync(join(root, 'dist/nested/chunk.js'), 'export const value = 1;\n');
    try {
      expect(packedPaths(root)).toContain('dist/index.js');
      expect(packedPaths(root)).not.toContain('dist/nested/chunk.js');
      const result = runVerifier(root);
      expect(result.status, result.stderr).toBe(1);
      expect(result.stderr).toContain(
        './dist/index.js imports ./nested/chunk.js, which is not included in the packed package',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts an export target that npm pack includes', () => {
    const root = makeFixture();
    try {
      expect(packedPaths(root)).toContain('dist/index.js');
      const result = runVerifier(root);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
