export class DashboardRepository {
  constructor(database) {
    this.database = database;
  }

  transaction(work) {
    return this.database.transaction(work)();
  }

  listNotes({ includeArchived = false } = {}) {
    return this.database
      .prepare(
        `SELECT * FROM dashboard_notes
         WHERE (? = 1 OR status = 'ACTIVE')
         ORDER BY status = 'ACTIVE' DESC, updated_at DESC, id DESC`,
      )
      .all(Number(includeArchived));
  }

  findNote(id) {
    return this.database.prepare('SELECT * FROM dashboard_notes WHERE id = ?').get(id);
  }

  createNote(input) {
    return Number(
      this.database
        .prepare(
          `INSERT INTO dashboard_notes (
             title, body, created_by_user_id, updated_by_user_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(input.title, input.body, input.actorUserId, input.actorUserId, input.now, input.now)
        .lastInsertRowid,
    );
  }

  updateNote(id, input) {
    this.database
      .prepare(
        `UPDATE dashboard_notes
         SET title = ?, body = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.title, input.body, input.actorUserId, input.now, id);
  }

  setNoteActive(id, isActive, reason, actorUserId, now) {
    this.database
      .prepare(
        `UPDATE dashboard_notes
         SET status = ?, archive_reason = ?, updated_by_user_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(isActive ? 'ACTIVE' : 'ARCHIVED', isActive ? '' : reason, actorUserId, now, id);
  }
}
