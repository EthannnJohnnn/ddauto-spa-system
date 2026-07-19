import { AppError } from '../../errors/app-error.js';
import {
  generateCsrfToken,
  generateRecoveryCode,
  generateSessionToken,
  hashOpaqueValue,
  hashPassword,
  normalizeRecoveryCode,
  verifyAgainstDummyPassword,
  verifyPassword,
} from './auth.crypto.js';
import { SESSION_ABSOLUTE_DURATION_MS, SESSION_IDLE_DURATION_MS } from './auth.constants.js';

const INVALID_CREDENTIALS = 'The username or password is incorrect.';
const INVALID_RECOVERY = 'The username or recovery code is incorrect.';

export class AuthService {
  constructor(repository, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.clock = clock;
  }

  needsSetup() {
    return this.repository.countUsers() === 0;
  }

  async setupOwner({ username, displayName, password }) {
    if (!this.needsSetup()) {
      throw new AppError(409, 'SETUP_ALREADY_COMPLETED', 'Initial setup is already complete.');
    }

    const now = this.now();
    const passwordRecord = await hashPassword(password);
    const recoveryCode = generateRecoveryCode();
    let userId;

    this.repository.transaction(() => {
      if (!this.needsSetup()) {
        throw new AppError(409, 'SETUP_ALREADY_COMPLETED', 'Initial setup is already complete.');
      }

      userId = this.repository.createUser({
        username,
        displayName,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
        role: 'OWNER',
        now,
      });
      this.repository.createRecoveryCode(
        userId,
        hashOpaqueValue(normalizeRecoveryCode(recoveryCode)),
        now,
      );
      this.repository.recordAudit({
        actorUserId: userId,
        action: 'OWNER_SETUP_COMPLETED',
        entityType: 'USER',
        entityId: String(userId),
        now,
      });
    });

    return {
      ...this.createSession(userId),
      recoveryCode,
      user: this.publicUser(this.repository.findUserById(userId)),
    };
  }

  async login({ username, password }) {
    const user = this.repository.findUserByUsername(username);
    const passwordMatches = user
      ? await verifyPassword(password, user.password_hash, user.password_salt)
      : await verifyAgainstDummyPassword(password);

    if (!user || !passwordMatches || user.is_active !== 1) {
      this.repository.recordAudit({
        action: 'LOGIN_FAILED',
        entityType: 'SESSION',
        metadata: { username },
        now: this.now(),
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS);
    }

    const session = this.createSession(user.id);
    this.repository.recordAudit({
      actorUserId: user.id,
      action: 'LOGIN_SUCCEEDED',
      entityType: 'SESSION',
      now: this.now(),
    });

    return {
      ...session,
      user: this.publicUser(user),
    };
  }

  getSession(sessionToken) {
    if (!sessionToken) {
      return null;
    }

    const now = this.clock();
    const nowIso = now.toISOString();
    this.repository.deleteExpiredSessions(nowIso);

    const tokenHash = hashOpaqueValue(sessionToken);
    const session = this.repository.findSession(tokenHash);

    if (!session || session.is_active !== 1) {
      return null;
    }

    const absoluteExpiry = new Date(session.absolute_expires_at);
    const slidingExpiry = new Date(now.getTime() + SESSION_IDLE_DURATION_MS);
    const nextExpiry = slidingExpiry < absoluteExpiry ? slidingExpiry : absoluteExpiry;

    this.repository.touchSession(tokenHash, nowIso, nextExpiry.toISOString());

    return {
      csrfToken: session.csrf_token,
      user: this.publicUser({
        id: session.user_id,
        username: session.username,
        display_name: session.display_name,
        role: session.role,
      }),
    };
  }

  logout(sessionToken, actorUserId) {
    if (sessionToken) {
      this.repository.deleteSession(hashOpaqueValue(sessionToken));
    }

    this.repository.recordAudit({
      actorUserId,
      action: 'LOGOUT',
      entityType: 'SESSION',
      now: this.now(),
    });
  }

  async resetPassword({ username, recoveryCode, newPassword }) {
    const user = this.repository.findUserByUsername(username);
    const normalizedCode = normalizeRecoveryCode(recoveryCode);
    const recoveryCodeHash = hashOpaqueValue(normalizedCode);
    const recoveryRecord = user
      ? this.repository.findActiveRecoveryCode(user.id, recoveryCodeHash)
      : null;

    if (!user || !recoveryRecord || user.is_active !== 1) {
      throw new AppError(401, 'INVALID_RECOVERY_CODE', INVALID_RECOVERY);
    }

    const now = this.now();
    const passwordRecord = await hashPassword(newPassword);
    const nextRecoveryCode = generateRecoveryCode();

    this.repository.transaction(() => {
      const activeRecoveryCode = this.repository.findActiveRecoveryCode(user.id, recoveryCodeHash);

      if (!activeRecoveryCode) {
        throw new AppError(401, 'INVALID_RECOVERY_CODE', INVALID_RECOVERY);
      }

      this.repository.markRecoveryCodeUsed(activeRecoveryCode.id, now);
      this.repository.updatePassword(user.id, passwordRecord.hash, passwordRecord.salt, now);
      this.repository.deleteSessionsForUser(user.id);
      this.repository.createRecoveryCode(
        user.id,
        hashOpaqueValue(normalizeRecoveryCode(nextRecoveryCode)),
        now,
      );
      this.repository.recordAudit({
        actorUserId: user.id,
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityId: String(user.id),
        now,
      });
    });

    return {
      ...this.createSession(user.id),
      recoveryCode: nextRecoveryCode,
      user: this.publicUser(user),
    };
  }

  createSession(userId) {
    const nowDate = this.clock();
    const now = nowDate.toISOString();
    const sessionToken = generateSessionToken();
    const csrfToken = generateCsrfToken();

    this.repository.deleteExpiredSessions(now);
    this.repository.createSession({
      tokenHash: hashOpaqueValue(sessionToken),
      userId,
      csrfToken,
      now,
      expiresAt: new Date(nowDate.getTime() + SESSION_IDLE_DURATION_MS).toISOString(),
      absoluteExpiresAt: new Date(nowDate.getTime() + SESSION_ABSOLUTE_DURATION_MS).toISOString(),
    });

    return { sessionToken, csrfToken };
  }

  now() {
    return this.clock().toISOString();
  }

  publicUser(user) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    };
  }
}
