export class AuditRepository {
  constructor(database) {
    this.database = database;
  }

  record({ actorUserId = null, action, entityType, entityId = null, metadata = {}, now }) {
    this.database
      .prepare(
        `INSERT INTO audit_events (
          actor_user_id, action, entity_type, entity_id, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(actorUserId, action, entityType, entityId, JSON.stringify(metadata), now);
  }
}
