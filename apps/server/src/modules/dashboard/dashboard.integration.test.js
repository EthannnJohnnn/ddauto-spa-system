import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';

const OWNER = { username: 'owner', displayName: 'Owner', password: 'SecureOwner123' };

describe('dashboard notes API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({ database, runtimeConfig: { nodeEnv: 'test', secureCookies: false } });
  });

  afterEach(() => database.close());

  it('requires authentication to read notes', async () => {
    const response = await request(app).get('/api/v1/dashboard/notes');
    expect(response.status).toBe(401);
  });

  it('creates, edits, archives, and restores audited owner notes', async () => {
    const owner = await setupOwner(app);
    const created = await owner.agent
      .post('/api/v1/dashboard/notes')
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Order towels', body: 'Call the supplier before Friday.' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Order towels', status: 'ACTIVE' });

    const edited = await owner.agent
      .patch(`/api/v1/dashboard/notes/${created.body.id}`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Order towels and soap', body: 'Call the supplier today.' });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe('Order towels and soap');

    const archived = await owner.agent
      .post(`/api/v1/dashboard/notes/${created.body.id}/archive`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Task completed' });
    expect(archived.body.status).toBe('ARCHIVED');
    expect((await owner.agent.get('/api/v1/dashboard/notes')).body).toEqual([]);

    const withArchived = await owner.agent.get('/api/v1/dashboard/notes?includeArchived=true');
    expect(withArchived.body).toHaveLength(1);

    const restored = await owner.agent
      .post(`/api/v1/dashboard/notes/${created.body.id}/restore`)
      .set('x-csrf-token', owner.csrfToken)
      .send({ reason: 'Still needed' });
    expect(restored.body.status).toBe('ACTIVE');

    const actions = database
      .prepare("SELECT action FROM audit_events WHERE entity_type = 'DASHBOARD_NOTE' ORDER BY id")
      .all()
      .map((row) => row.action);
    expect(actions).toEqual([
      'DASHBOARD_NOTE_CREATED',
      'DASHBOARD_NOTE_UPDATED',
      'DASHBOARD_NOTE_ARCHIVED',
      'DASHBOARD_NOTE_RESTORED',
    ]);
  });

  it('rejects owner note changes without CSRF protection', async () => {
    const owner = await setupOwner(app);
    const response = await owner.agent
      .post('/api/v1/dashboard/notes')
      .send({ title: 'Unsafe', body: 'Missing token.' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('INVALID_CSRF_TOKEN');
  });
});

async function setupOwner(app) {
  const agent = request.agent(app);
  const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
  expect(setup.status).toBe(201);
  return { agent, csrfToken: setup.body.csrfToken };
}
