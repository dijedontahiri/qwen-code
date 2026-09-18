import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { GitIgnoreParser } from '../../packages/core/src/utils/gitIgnoreParser.ts';

const count = Number(process.argv[2] || 20000);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-ignore-repro-'));
const rules = Array.from({ length: 45 }, (_, i) => `*.ignored-${i}`).join('\n');
try {
  fs.writeFileSync(path.join(root, '.gitignore'), rules);
  for (let i = 0; i < count; i++) fs.mkdirSync(path.join(root, `scratch-${i}`));
  const parser = new GitIgnoreParser(root);
  global.gc();
  const initial = process.memoryUsage().heapUsed;
  const started = performance.now();
  for (let i = 0; i < count; i++) {
    assert.equal(parser.isIgnored(`scratch-${i}/result.txt`), false);
    assert.equal(parser.isIgnored(`scratch-${i}/result.ignored-0`), true);
  }
  global.gc();
  console.log(JSON.stringify({
    node: process.version, platform: `${process.platform}/${process.arch}`,
    directories: count, lookups: count * 2, rules: 45,
    initialHeapMiB: initial / 1024 / 1024,
    retainedHeapMiB: process.memoryUsage().heapUsed / 1024 / 1024,
    durationMs: performance.now() - started,
    directoryMemos: parser.ignorerCache.size,
    distinctRetainedMatchers: new Set(parser.ignorerCache.values()).size,
    patternCacheEntries: parser.cache.size,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
