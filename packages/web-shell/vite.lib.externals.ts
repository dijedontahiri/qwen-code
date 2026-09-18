import pkg from './package.json' with { type: 'json' };

const bundledStyleImports = new Set([
  'katex/dist/katex.min.css',
  '@xterm/xterm/css/xterm.css',
]);

const runtimeDependencies = new Set([
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]);

export function isWebShellLibExternal(id: string): boolean {
  if (bundledStyleImports.has(id)) {
    return false;
  }

  for (const dependency of runtimeDependencies) {
    if (id === dependency || id.startsWith(`${dependency}/`)) {
      return true;
    }
  }

  return false;
}
