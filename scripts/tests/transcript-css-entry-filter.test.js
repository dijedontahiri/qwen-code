/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { TRANSCRIPT_CSS_ENTRY_FILTER } from '../../packages/web-templates/src/export-html/transcript-css-entry.mjs';

// esbuild passes plugin callbacks the platform-native absolute path, so the
// filter that decides whether the transcript stylesheet gets extracted has to
// match both separators. A forward-slash-only class passes on this (POSIX) host
// and silently never fires on Windows, where the mandatory extraction guard in
// build.mjs then aborts every build — including the one `npm ci` runs.
describe('transcript CSS entry filter', () => {
  it('matches the web-shell transcript entry with either path separator', () => {
    expect(
      TRANSCRIPT_CSS_ENTRY_FILTER.test(
        '/repo/packages/web-shell/dist/transcript.js',
      ),
    ).toBe(true);
    expect(
      TRANSCRIPT_CSS_ENTRY_FILTER.test(
        'C:\\repo\\packages\\web-shell\\dist\\transcript.js',
      ),
    ).toBe(true);
  });

  it('does not match the barred web-shell package-root entry', () => {
    // build.mjs lists web-shell/dist/index.js under FORBIDDEN_DOCUMENT_INPUTS:
    // the package root pulls the interactive shell into every export, so a
    // filter widened to a bare dist prefix would lift the wrong stylesheet.
    expect(
      TRANSCRIPT_CSS_ENTRY_FILTER.test(
        '/repo/packages/web-shell/dist/index.js',
      ),
    ).toBe(false);
    expect(
      TRANSCRIPT_CSS_ENTRY_FILTER.test(
        'C:\\repo\\packages\\web-shell\\dist\\index.js',
      ),
    ).toBe(false);
  });
});

describe('private document transcript CSS entry filter', () => {
  it.each([
    '/repo/packages/web-shell/dist/document-export/transcript.js',
    'C:\\repo\\packages\\web-shell\\dist\\document-export\\transcript.js',
  ])('matches the isolated transcript at %s', (file) => {
    expect(TRANSCRIPT_CSS_ENTRY_FILTER.test(file)).toBe(true);
  });
  it.each([
    '/repo/packages/web-shell/dist/document-export/index.js',
    '/repo/packages/web-shell/dist/document-export/nested/transcript.js',
    '/repo/packages/web-shell/dist/document-export/transcript.js.map',
  ])('still rejects non-entry files at %s', (file) => {
    expect(TRANSCRIPT_CSS_ENTRY_FILTER.test(file)).toBe(false);
  });
});
