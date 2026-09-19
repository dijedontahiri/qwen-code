/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MutableOriginAllowlist } from '../auth.js';
import { CredentialStore } from './credentials.js';
import { LocalControlService } from './service.js';

const sleep = vi.hoisted(() => ({ release: vi.fn() }));
const sleepInhibitorMock = vi.hoisted(() => ({
  acquire: vi.fn(() => sleep),
  isRunning: vi.fn(() => true),
}));

vi.mock('@qwen-code/qwen-code-core', () => ({
  sleepInhibitor: sleepInhibitorMock,
}));

vi.mock('./lan-interfaces.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lan-interfaces.js')>()),
  selectLanAddress: vi.fn(() => ({
    interfaceName: 'en0',
    address: '127.0.0.1',
  })),
}));

const blockers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    blockers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
  vi.clearAllMocks();
});

async function occupyPort(): Promise<number> {
  const blocker = createServer();
  blockers.push(blocker);
  await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  return (blocker.address() as AddressInfo).port;
}

describe('LocalControlService busy-port fallback', () => {
  it('binds a free LAN port and publishes that exact endpoint', async () => {
    const busyPort = await occupyPort();
    const credentials = new CredentialStore();
    const origins = new MutableOriginAllowlist({
      allowAny: false,
      origins: new Set(),
    });
    const attachWebSocket = vi.fn();
    const detachWebSocket = vi.fn();
    const service = new LocalControlService({
      app: express(),
      credentials,
      originAllowlist: origins,
      attachWebSocket,
      detachWebSocket,
      getPort: () => busyPort,
    });

    const status = await service.enable({ target: '/?workspace=%2Ftmp' });

    expect(status.active).toBe(true);
    expect(status.port).toBeTypeOf('number');
    expect(status.port).not.toBe(busyPort);
    expect(attachWebSocket).toHaveBeenCalledOnce();
    expect(detachWebSocket).not.toHaveBeenCalled();

    const paired = new URL(status.url!);
    expect(Number(paired.port)).toBe(status.port);
    expect(paired.pathname).toBe('/');
    expect(paired.search).toBe('?workspace=%2Ftmp');

    const authority = `127.0.0.1:${status.port}`;
    const token = paired.hash.slice('#token='.length);
    expect(origins.allows(`http://${authority}`)).toBe(true);
    expect(origins.allows(`http://127.0.0.1:${busyPort}`)).toBe(false);
    expect(
      credentials.verify(token, { kind: 'local-control', authority }),
    ).toBe(true);
    expect(
      credentials.verify(token, {
        kind: 'local-control',
        authority: `127.0.0.1:${busyPort}`,
      }),
    ).toBe(false);

    await service.disable();
    expect(detachWebSocket).toHaveBeenCalledOnce();
    expect(origins.allows(`http://${authority}`)).toBe(false);
    expect(
      credentials.verify(token, { kind: 'local-control', authority }),
    ).toBe(false);
  });
});
