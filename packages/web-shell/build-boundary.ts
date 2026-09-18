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
  isDocumentExport = false,
): boolean {
  if (bundledStyleImports.has(id)) {
    return false;
  }

  // Only the private document build bundles MCP Apps. Public library entries
  // keep one shared dependency instance. Preserve Rollup's tree shaking here. Externalizing this package here retains additional
  // SDK/schema code downstream and exceeds the existing document export budget.
  if (
    isDocumentExport &&
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
