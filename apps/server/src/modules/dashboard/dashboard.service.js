import { AppError } from '../../errors/app-error.js';

export class DashboardService {
  constructor(repository, auditRepository, { clock = () => new Date() } = {}) {
    this.repository = repository;
    this.auditRepository = auditRepository;
    this.clock = clock;
  }

  listNotes(filters) {
    return this.repository.listNotes(filters).map(mapNote);
  }

  createNote(input, actorUserId) {
    const now = this.clock().toISOString();
    let id;
    this.repository.transaction(() => {
      id = this.repository.createNote({ ...input, actorUserId, now });
      this.auditRepository.record({
        actorUserId,
        action: 'DASHBOARD_NOTE_CREATED',
        entityType: 'DASHBOARD_NOTE',
        entityId: id,
        metadata: { after: input },
        now,
      });
    });
    return mapNote(this.requireNote(id));
  }

  updateNote(id, input, actorUserId) {
    const before = this.requireActiveNote(id);
    const now = this.clock().toISOString();
    this.repository.transaction(() => {
      this.repository.updateNote(id, { ...input, actorUserId, now });
      this.auditRepository.record({
        actorUserId,
        action: 'DASHBOARD_NOTE_UPDATED',
        entityType: 'DASHBOARD_NOTE',
        entityId: id,
        metadata: { before: mapNote(before), after: input },
        now,
      });
    });
    return mapNote(this.requireNote(id));
  }

  setNoteActive(id, isActive, reason, actorUserId) {
    const before = this.requireNote(id);
    if ((before.status === 'ACTIVE') === isActive) {
      throw new AppError(
        409,
        'DASHBOARD_NOTE_STATUS_UNCHANGED',
        'The note already has that status.',
      );
    }
    const now = this.clock().toISOString();
    this.repository.transaction(() => {
      this.repository.setNoteActive(id, isActive, reason, actorUserId, now);
      this.auditRepository.record({
        actorUserId,
        action: isActive ? 'DASHBOARD_NOTE_RESTORED' : 'DASHBOARD_NOTE_ARCHIVED',
        entityType: 'DASHBOARD_NOTE',
        entityId: id,
        metadata: { reason },
        now,
      });
    });
    return mapNote(this.requireNote(id));
  }

  requireNote(id) {
    const note = this.repository.findNote(id);
    if (!note)
      throw new AppError(404, 'DASHBOARD_NOTE_NOT_FOUND', 'The dashboard note was not found.');
    return note;
  }

  requireActiveNote(id) {
    const note = this.requireNote(id);
    if (note.status !== 'ACTIVE') {
      throw new AppError(409, 'DASHBOARD_NOTE_ARCHIVED', 'Restore the note before editing it.');
    }
    return note;
  }
}

function mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status,
    archiveReason: row.archive_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
