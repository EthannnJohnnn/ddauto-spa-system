import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { openDatabase } from '../../db/database.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

const OWNER = {
  username: 'owner',
  displayName: 'DD Auto Spa Owner',
  password: 'SecureOwner123',
};

describe('authentication API', () => {
  let database;
  let app;

  beforeEach(() => {
    database = openDatabase({ filename: ':memory:' });
    app = createApp({
      database,
      runtimeConfig: { nodeEnv: 'test', secureCookies: false },
    });
  });

  afterEach(() => {
    database.close();
  });

  it('starts unconfigured and securely creates the only initial owner', async () => {
    const agent = request.agent(app);
    const initialStatus = await agent.get('/api/v1/auth/status');

    expect(initialStatus.body).toMatchObject({
      needsSetup: true,
      authenticated: false,
    });

    const weakPassword = await agent.post('/api/v1/auth/setup').send({
      username: 'owner',
      password: 'short',
    });
    expect(weakPassword.status).toBe(400);
    expect(weakPassword.body.error.code).toBe('VALIDATION_ERROR');

    const setup = await agent.post('/api/v1/auth/setup').send(OWNER);

    expect(setup.status).toBe(201);
    expect(setup.body.user).toMatchObject({ username: 'owner', role: 'OWNER' });
    expect(setup.body.csrfToken).toBeTruthy();
    expect(setup.body.recoveryCode).toMatch(/^([A-F0-9]{5}-){7}[A-F0-9]{5}$/);
    expect(setup.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(setup.headers['set-cookie'][0]).toContain('SameSite=Strict');

    const storedUser = database
      .prepare('SELECT password_hash, password_salt FROM users WHERE username = ?')
      .get('owner');
    expect(storedUser.password_hash).not.toBe(OWNER.password);
    expect(JSON.stringify(storedUser)).not.toContain(OWNER.password);

    const cookieToken = setup.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const storedSession = database.prepare('SELECT token_hash FROM sessions').get();
    expect(storedSession.token_hash).not.toBe(cookieToken);

    const duplicateSetup = await agent.post('/api/v1/auth/setup').send(OWNER);
    expect(duplicateSetup.status).toBe(409);
    expect(duplicateSetup.body.error.code).toBe('SETUP_ALREADY_COMPLETED');
  });

  it('authenticates, enforces CSRF on logout, and returns generic login errors', async () => {
    const agent = request.agent(app);
    const setup = await agent.post('/api/v1/auth/setup').send(OWNER);

    const rejectedLogout = await agent.post('/api/v1/auth/logout');
    expect(rejectedLogout.status).toBe(403);
    expect(rejectedLogout.body.error.code).toBe('INVALID_CSRF_TOKEN');

    const logout = await agent
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', setup.body.csrfToken);
    expect(logout.status).toBe(204);

    const signedOutStatus = await agent.get('/api/v1/auth/status');
    expect(signedOutStatus.body.authenticated).toBe(false);

    const unknownUser = await agent.post('/api/v1/auth/login').send({
      username: 'unknown',
      password: 'AnythingAtAll123',
    });
    const wrongPassword = await agent.post('/api/v1/auth/login').send({
      username: OWNER.username,
      password: 'IncorrectPassword123',
    });
    expect(unknownUser.body.error).toEqual(wrongPassword.body.error);

    const login = await agent.post('/api/v1/auth/login').send({
      username: OWNER.username,
      password: OWNER.password,
    });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('OWNER');

    const signedInStatus = await agent.get('/api/v1/auth/status');
    expect(signedInStatus.body).toMatchObject({
      needsSetup: false,
      authenticated: true,
      user: { username: OWNER.username },
    });
  });

  it('uses each recovery code once and rotates it after a password reset', async () => {
    const agent = request.agent(app);
    const setup = await agent.post('/api/v1/auth/setup').send(OWNER);
    const newPassword = 'ReplacementOwner456';

    const reset = await agent.post('/api/v1/auth/reset-password').send({
      username: OWNER.username,
      recoveryCode: setup.body.recoveryCode,
      newPassword,
    });

    expect(reset.status).toBe(200);
    expect(reset.body.recoveryCode).not.toBe(setup.body.recoveryCode);

    const reusedCode = await request(app).post('/api/v1/auth/reset-password').send({
      username: OWNER.username,
      recoveryCode: setup.body.recoveryCode,
      newPassword: 'AnotherPassword789',
    });
    expect(reusedCode.status).toBe(401);
    expect(reusedCode.body.error.code).toBe('INVALID_RECOVERY_CODE');

    const oldPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      username: OWNER.username,
      password: OWNER.password,
    });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      username: OWNER.username,
      password: newPassword,
    });
    expect(newPasswordLogin.status).toBe(200);
  });

  it('allows only one winner when setup or recovery requests arrive together', async () => {
    const setupResponses = await Promise.all([
      request(app).post('/api/v1/auth/setup').send(OWNER),
      request(app)
        .post('/api/v1/auth/setup')
        .send({ ...OWNER, username: 'second-owner' }),
    ]);
    const setupStatuses = setupResponses.map((response) => response.status).sort();

    expect(setupStatuses).toEqual([201, 409]);
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get().count).toBe(1);

    const successfulSetup = setupResponses.find((response) => response.status === 201);
    const savedUsername = successfulSetup.body.user.username;
    const resetResponses = await Promise.all([
      request(app).post('/api/v1/auth/reset-password').send({
        username: savedUsername,
        recoveryCode: successfulSetup.body.recoveryCode,
        newPassword: 'ConcurrentPassword123',
      }),
      request(app).post('/api/v1/auth/reset-password').send({
        username: savedUsername,
        recoveryCode: successfulSetup.body.recoveryCode,
        newPassword: 'ConcurrentPassword456',
      }),
    ]);
    const resetStatuses = resetResponses.map((response) => response.status).sort();

    expect(resetStatuses).toEqual([200, 401]);
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM recovery_codes WHERE used_at IS NULL').get()
        .count,
    ).toBe(1);
  });

  it('expires an idle session after 15 minutes', async () => {
    let currentTime = new Date('2026-07-19T00:00:00.000Z');
    const repository = new AuthRepository(database);
    const service = new AuthService(repository, { clock: () => currentTime });
    const setup = await service.setupOwner(OWNER);

    currentTime = new Date('2026-07-19T00:16:00.000Z');

    expect(service.getSession(setup.sessionToken)).toBeNull();
    expect(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count).toBe(0);
  });
});
