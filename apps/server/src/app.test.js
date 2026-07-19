import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { openDatabase } from './db/database.js';

describe('health API', () => {
  it('reports that the local server is ready', async () => {
    const database = openDatabase({ filename: ':memory:' });
    const response = await request(
      createApp({
        database,
        runtimeConfig: { nodeEnv: 'test', secureCookies: false },
      }),
    ).get('/api/v1/health');

    database.close();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'ddauto-spa-server',
      apiVersion: 'v1',
    });
  });
});
