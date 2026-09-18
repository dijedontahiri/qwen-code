import pkg from './package.json' with { type: 'json' };

const bundledStyleImports = new Set([
  '@xterm/xterm/css/xterm.css',
  'katex/dist/katex.min.css',
]);

const runtimePackages = new Set([
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]);

export function shouldExternalizeWebShellDependency(
  id: string,
  isTranscriptBuild = false,
): boolean {
  if (bundledStyleImports.has(id)) {
    return false;
  }

  // Preserve Rollup's MCP App tree shaking before the standalone HTML export
  // bundles the transcript. Externalizing this package here retains additional
  // SDK/schema code downstream and exceeds the existing document export budget.
  if (
    isTranscriptBuild &&
    (id === '@modelcontextprotocol/ext-apps' ||
      id.startsWith('@modelcontextprotocol/ext-apps/'))
  ) {
    return false;
  }

  for (const packageName of runtimePackages) {
    if (id === packageName || id.startsWith(`${packageName}/`)) {
      return true;
    }
  }

  return false;
}
