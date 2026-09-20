/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const verifier = path.join(
  root,
  'packages/web-shell/scripts/verify-publish-artifacts.mjs',
);
const tempDirs = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function fixture({ entry = './dist/index.js', source = 'export {};\n' } = {}) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'web-shell-pack-'));
  tempDirs.push(fixtureRoot);
  mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
  copyFileSync(verifier, path.join(fixtureRoot, 'scripts/verifier.mjs'));
  writeFileSync(
    path.join(fixtureRoot, 'package.json'),
    JSON.stringify({
      name: 'web-shell-publish-fixture',
      version: '1.0.0',
      type: 'module',
      exports: { '.': { import: entry } },
      files: ['dist/*.js'],
    }),
  );
  const entryPath = path.join(fixtureRoot, entry);
  mkdirSync(path.dirname(entryPath), { recursive: true });
  writeFileSync(entryPath, source);
  return fixtureRoot;
}

function runVerifier(fixtureRoot) {
  return spawnSync(process.execPath, ['scripts/verifier.mjs'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
}

describe('web-shell publish verifier', () => {
  it(
    'rejects an export that exists on disk but is omitted from npm pack',
    () => {
      const fixtureRoot = fixture({ entry: './dist/nested/index.js' });

      const result = runVerifier(fixtureRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        './dist/nested/index.js was built but is not included in npm pack',
      );
    },
  );

  it(
    'rejects a relative chunk that exists on disk but is omitted from npm pack',
    () => {
      const fixtureRoot = fixture({
        source: "export { value } from './nested/chunk.js';\n",
      });
      const chunk = path.join(fixtureRoot, 'dist/nested/chunk.js');
      mkdirSync(path.dirname(chunk), { recursive: true });
      writeFileSync(chunk, 'export const value = 1;\n');

      const result = runVerifier(fixtureRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        './dist/index.js imports ./nested/chunk.js, which is not included in npm pack',
      );
    },
  );

  it('accepts an export and relative chunk that npm packs', () => {
    const fixtureRoot = fixture({
      source: "export { value } from './chunk.js';\n",
    });
    writeFileSync(
      path.join(fixtureRoot, 'dist/chunk.js'),
      'export const value = 1;\n',
    );

    const result = runVerifier(fixtureRoot);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
