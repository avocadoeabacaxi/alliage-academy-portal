import { createHash } from 'node:crypto';
import { db, getRecord, createRecord } from './db.mjs';
import { requestKind } from './request-kinds.mjs';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

function trainingForFollowUp(requestId) {
  const training = getRecord('TrainingRequest', requestId);
  if (!training) fail(404, 'Solicitação não encontrada');
  if (requestKind(training) !== 'training') fail(400, 'O acompanhamento pós-treinamento é exclusivo de treinamentos');
  return training;
}

export function listTrainingFollowUps(requestId, beforeId = '') {
  trainingForFollowUp(requestId);
  const before = beforeId ? getRecord('TrainingFollowUp', beforeId) : null;
  if (beforeId && (!before || before.training_request_id !== requestId)) fail(400, 'Página inválida');
  const rows = db.prepare(`SELECT data FROM records
    WHERE entity = 'TrainingFollowUp' AND json_extract(data, '$.training_request_id') = ?
    ${before ? 'AND (created_at < ? OR (created_at = ? AND id < ?))' : ''}
    ORDER BY created_at DESC, id DESC LIMIT 51`).all(
    requestId, ...(before ? [before.created_date, before.created_date, before.id] : [])
  );
  const items = rows.slice(0, 50).map(row => JSON.parse(row.data));
  return { items, next_cursor: rows.length > 50 ? items.at(-1).id : null };
}

export function addTrainingFollowUp(requestId, payload, user) {
  const training = trainingForFollowUp(requestId);
  if (!payload || Array.isArray(payload) || typeof payload !== 'object'
    || Object.keys(payload).some(key => !['comment', 'submission_id'].includes(key))) fail(400, 'Dados de acompanhamento inválidos');
  const comment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (!comment || comment.length > 5000) fail(400, 'Informe um comentário de 1 a 5000 caracteres');
  if (typeof payload.submission_id !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(payload.submission_id)) fail(400, 'Identificador de envio inválido');
  // Retrying the same submission cannot duplicate or overwrite an entry.
  const id = createHash('sha256').update(JSON.stringify([requestId, user.id, payload.submission_id])).digest('hex');
  const existing = getRecord('TrainingFollowUp', id);
  if (existing) {
    if (existing.comment !== comment) fail(409, 'Este envio já foi registrado com outro comentário');
    return existing;
  }
  if (['Cancelado', 'Rejeitado'].includes(training.status)
    || !(training.status === 'Concluído' || training.training_completed_date)) fail(409, 'Registre a realização do treinamento antes de adicionar um acompanhamento');
  return createRecord('TrainingFollowUp', {
    id, training_request_id: requestId, comment,
    author_name: user.full_name || user.email,
    author_email: user.email, author_role: user.role,
  }, user);
}
