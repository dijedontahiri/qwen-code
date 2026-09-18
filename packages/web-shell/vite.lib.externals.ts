import pkg from './package.json' with { type: 'json' };

const bundledStyleImports = new Set([
  'katex/dist/katex.min.css',
  '@xterm/xterm/css/xterm.css',
]);

const issue12185Dependencies = new Set([
  '@xterm/xterm',
  '@xterm/addon-fit',
  '@tanstack/react-table',
  '@tanstack/react-virtual',
  'fzf',
  '@modelcontextprotocol/ext-apps',
]);

const diagnosticExtra = process.env.QWEN_12185_DIAGNOSTIC_EXTERNAL;
const runtimeDependencies = new Set(
  [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)].filter(
    (dependency) =>
      !diagnosticExtra ||
      !issue12185Dependencies.has(dependency) ||
      dependency === diagnosticExtra,
  ),
);

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
