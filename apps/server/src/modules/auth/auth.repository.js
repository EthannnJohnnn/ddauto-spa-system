export class AuthRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  countUsers() {
    return this.database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  }

  createUser({ username, displayName, passwordHash, passwordSalt, role, now }) {
    const result = this.database
      .prepare(
        `INSERT INTO users (
          username, display_name, password_hash, password_salt, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(username, displayName, passwordHash, passwordSalt, role, now, now);

    return Number(result.lastInsertRowid);
  }

  findUserByUsername(username) {
    return this.database
      .prepare(
        `SELECT id, username, display_name, password_hash, password_salt, role, is_active
         FROM users
         WHERE username = ? COLLATE NOCASE`,
      )
      .get(username);
  }

  findUserById(userId) {
    return this.database
      .prepare(
        `SELECT id, username, display_name, role, is_active
         FROM users
         WHERE id = ?`,
      )
      .get(userId);
  }

  updatePassword(userId, passwordHash, passwordSalt, now) {
    this.database
      .prepare(
        `UPDATE users
         SET password_hash = ?, password_salt = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(passwordHash, passwordSalt, now, userId);
  }

  createSession({ tokenHash, userId, csrfToken, now, expiresAt, absoluteExpiresAt }) {
    this.database
      .prepare(
        `INSERT INTO sessions (
          token_hash, user_id, csrf_token, created_at, last_seen_at, expires_at,
          absolute_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(tokenHash, userId, csrfToken, now, now, expiresAt, absoluteExpiresAt);
  }

  findSession(tokenHash) {
    return this.database
      .prepare(
        `SELECT
          sessions.token_hash,
          sessions.csrf_token,
          sessions.expires_at,
          sessions.absolute_expires_at,
          users.id AS user_id,
          users.username,
          users.display_name,
          users.role,
          users.is_active
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?`,
      )
      .get(tokenHash);
  }

  touchSession(tokenHash, lastSeenAt, expiresAt) {
    this.database
      .prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
      .run(lastSeenAt, expiresAt, tokenHash);
  }

  deleteSession(tokenHash) {
    this.database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  deleteSessionsForUser(userId) {
    this.database.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  deleteExpiredSessions(now) {
    this.database
      .prepare('DELETE FROM sessions WHERE expires_at <= ? OR absolute_expires_at <= ?')
      .run(now, now);
  }

  createRecoveryCode(userId, codeHash, now) {
    this.database
      .prepare('INSERT INTO recovery_codes (user_id, code_hash, created_at) VALUES (?, ?, ?)')
      .run(userId, codeHash, now);
  }

  findActiveRecoveryCode(userId, codeHash) {
    return this.database
      .prepare(
        `SELECT id
         FROM recovery_codes
         WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`,
      )
      .get(userId, codeHash);
  }

  markRecoveryCodeUsed(recoveryCodeId, now) {
    this.database
      .prepare('UPDATE recovery_codes SET used_at = ? WHERE id = ? AND used_at IS NULL')
      .run(now, recoveryCodeId);
  }

  recordAudit({ actorUserId = null, action, entityType, entityId = null, metadata = {}, now }) {
    this.database
      .prepare(
        `INSERT INTO audit_events (
          actor_user_id, action, entity_type, entity_id, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(actorUserId, action, entityType, entityId, JSON.stringify(metadata), now);
  }
}
