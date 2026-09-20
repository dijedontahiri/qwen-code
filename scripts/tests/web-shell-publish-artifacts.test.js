/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  collectPublishProblems,
  readPackedFileSet,
} from '../../packages/web-shell/scripts/verify-publish-artifacts.mjs';

function withFixture({ manifest, files }, run) {
  const root = mkdtempSync(path.join(tmpdir(), 'web-shell-pack-'));
  try {
    writeFileSync(
      path.join(root, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    for (const [name, contents] of Object.entries(files)) {
      const target = path.join(root, name);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const baseManifest = {
  name: 'web-shell-pack-fixture',
  version: '1.0.0',
  type: 'module',
  files: ['dist/*.js'],
};

describe('Web Shell publish artifact verifier', () => {
  it('rejects an export target that exists on disk but is omitted by npm pack', () => {
    withFixture(
      {
        manifest: {
          ...baseManifest,
          exports: { '.': { import: './dist/nested/index.js' } },
        },
        files: { 'dist/nested/index.js': 'export const value = 1;\n' },
      },
      (root) => {
        const packedFiles = readPackedFileSet(root);
        expect(packedFiles.has('dist/nested/index.js')).toBe(false);
        expect(
          collectPublishProblems(
            root,
            {
              ...baseManifest,
              exports: { '.': { import: './dist/nested/index.js' } },
            },
            packedFiles,
          ),
        ).toContain(
          './dist/nested/index.js exists but is omitted from npm pack',
        );
      },
    );
  });

  it('rejects a relative bundle chunk that npm omits', () => {
    withFixture(
      {
        manifest: {
          ...baseManifest,
          exports: { '.': { import: './dist/index.js' } },
        },
        files: {
          'dist/index.js': "export { value } from './nested/chunk.js';\n",
          'dist/nested/chunk.js': 'export const value = 1;\n',
        },
      },
      (root) => {
        const manifest = {
          ...baseManifest,
          exports: { '.': { import: './dist/index.js' } },
        };
        const packedFiles = readPackedFileSet(root);
        expect(packedFiles.has('dist/index.js')).toBe(true);
        expect(packedFiles.has('dist/nested/chunk.js')).toBe(false);
        expect(collectPublishProblems(root, manifest, packedFiles)).toContain(
          './dist/index.js imports ./nested/chunk.js, which is omitted from npm pack',
        );
      },
    );
  });

  it('accepts root-level entries and relative chunks that npm includes', () => {
    withFixture(
      {
        manifest: {
          ...baseManifest,
          exports: { '.': { import: './dist/index.js' } },
        },
        files: {
          'dist/index.js': "export { value } from './chunk.js';\n",
          'dist/chunk.js': 'export const value = 1;\n',
        },
      },
      (root) => {
        const manifest = {
          ...baseManifest,
          exports: { '.': { import: './dist/index.js' } },
        };
        const packedFiles = readPackedFileSet(root);
        expect(packedFiles.has('dist/index.js')).toBe(true);
        expect(packedFiles.has('dist/chunk.js')).toBe(true);
        expect(collectPublishProblems(root, manifest, packedFiles)).toEqual([]);
      },
    );
  });
});
