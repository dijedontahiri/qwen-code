from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
old_budget = """// Last measured at 1,833,894 bytes of JS with 2,302,905 bytes of CSS moved
// out, by the Lint & Static lane on this branch. Before the split that lane
// measured the combined bundle at 4,133,282 bytes on main at c3023b3e6d — the
// measurement #11372 raised these two constants for, and which this branch
// supersedes because the CSS it counted is no longer in the JS. Keep the
// warning close to the measurement and the hard ceiling close above it: a cap
// left far above the measurement is a ratchet with enough slack for a whole
// dependency family to come back unnoticed.
const DOCUMENT_RUNTIME_WARNING_BYTES = 1_870_000;
const MAX_DOCUMENT_RUNTIME_BYTES = 1_930_000;
"""
new_budget = """// Measured at 1,806,361 bytes of JS on the manifest-externalized document
// build with the document MCP bridge substitution engaged. A review control
// with that substitution removed measured 2,111,566 bytes. Keep the warning
// close to the healthy measurement and the hard ceiling close above it: a cap
// left far above the measurement is a ratchet with enough slack for a whole
// dependency family to come back unnoticed.
const DOCUMENT_RUNTIME_WARNING_BYTES = 1_830_000;
const MAX_DOCUMENT_RUNTIME_BYTES = 1_870_000;
"""
if source.count(old_budget) != 1:
    raise SystemExit('budget block drifted')
source = source.replace(old_budget, new_budget)
needle = "const documentInputs = documentBuildResult.metafile.inputs;\n"
guard = """const documentInputs = documentBuildResult.metafile.inputs;
const documentMcpBridgeStubEngaged = Object.keys(documentInputs).some((input) =>
  input
    .replaceAll('\\\\', '/')
    .endsWith('/document-mcp-app-bridge-stub.ts'),
);
if (!documentMcpBridgeStubEngaged) {
  throw new Error(
    'Document export did not use document-mcp-app-bridge-stub.ts; the real ' +
      'interactive MCP App bridge may have been bundled into the transcript entry.',
  );
}
"""
if source.count(needle) != 1:
    raise SystemExit('documentInputs declaration drifted')
path.write_text(source.replace(needle, guard))
