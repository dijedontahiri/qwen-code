/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

const DOCUMENT_MCP_APP_BRIDGE_STUB_INPUT =
  /(^|[\\/])document-mcp-app-bridge-stub\.ts$/;

/**
 * Fails closed when the static document build did not actually route the
 * Web Shell MCP Apps bridge import through its document-only stub.
 */
export function assertDocumentMcpAppBridgeStubInput(documentInputs) {
  if (
    Object.keys(documentInputs).some((input) =>
      DOCUMENT_MCP_APP_BRIDGE_STUB_INPUT.test(input),
    )
  ) {
    return;
  }

  throw new Error(
    'Document export MCP bridge substitution did not engage: ' +
      'document-mcp-app-bridge-stub.ts is missing from the esbuild inputs.',
  );
}
