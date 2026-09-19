/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { assertDocumentMcpAppBridgeStubInput } from '../../packages/web-templates/src/export-html/document-mcp-stub-guard.mjs';

describe('document MCP app bridge stub guard', () => {
  it('accepts the document-only stub with either path separator', () => {
    expect(() =>
      assertDocumentMcpAppBridgeStubInput({
        'packages/web-templates/src/export-html/src/document-mcp-app-bridge-stub.ts':
          { bytes: 841 },
      }),
    ).not.toThrow();

    expect(() =>
      assertDocumentMcpAppBridgeStubInput({
        'C:\\repo\\packages\\web-templates\\src\\export-html\\src\\document-mcp-app-bridge-stub.ts':
          { bytes: 841 },
      }),
    ).not.toThrow();
  });

  it('rejects a transcript-only input graph when substitution did not engage', () => {
    expect(() =>
      assertDocumentMcpAppBridgeStubInput({
        'packages/web-shell/dist/transcript.js': { bytes: 1000 },
      }),
    ).toThrow(/MCP bridge substitution did not engage/);
  });
});
