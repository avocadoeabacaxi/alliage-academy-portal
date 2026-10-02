import { DatabaseSync, backup } from 'node:sqlite';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Deliberately bypasses application automations: restoring an empty pending
// stage must neither approve a request nor dispatch email or create surveys.
const [databasePath, requestId, option] = process.argv.slice(2);
if (!databasePath || !/^TR-\d{4}-\d+$/.test(requestId || '') || (option && option !== '--apply')) {
  throw new Error('Uso: node server/scripts/repair-pending-workflow.mjs <banco.sqlite> <TR-AAAA-NNN> [--apply]');
}
const apply = option === '--apply';
if (!existsSync(databasePath)) throw new Error('O banco informado não existe');
const db = new DatabaseSync(resolve(databasePath), { readOnly: !apply, timeout: 5000 });
const select = db.prepare("SELECT id, data FROM records WHERE entity = 'TrainingRequest' AND json_extract(data, '$.request_id') = ?");
const missing = value => value == null || value === '';

function inspect() {
  const rows = select.all(requestId);
  if (rows.length !== 1) throw new Error('A solicitação deve existir e ser única');
  const row = rows[0];
  const request = JSON.parse(row.data);
  if (request.status !== 'Pendente Análise' || request.date_stage1 || request.date_stage2 || request.training_completed_date) {
    throw new Error('Recusado: a solicitação não está pendente ou já possui histórico de decisão');
  }
  const stages = ['decision_stage1', 'decision_stage2'];
  if (stages.some(key => !missing(request[key]) && request[key] !== 'Pendente')) {
    throw new Error('Recusado: existe uma decisão que não pode ser sobrescrita');
  }
  return { row, request, fields: stages.filter(key => missing(request[key])) };
}

try {
  const before = inspect();
  if (!apply || !before.fields.length) {
    console.log(JSON.stringify({ request_id: requestId, mode: apply ? 'unchanged' : 'preview', fields: before.fields, status: before.request.status }));
  } else {
    const backupDir = join(dirname(resolve(databasePath)), 'backups');
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const backupPath = join(backupDir, `before-workflow-${requestId}-${Date.now()}.sqlite`);
    await backup(db, backupPath);
    chmodSync(backupPath, 0o600);

    db.exec('BEGIN IMMEDIATE');
    try {
      const current = inspect();
      if (current.row.data !== before.row.data) throw new Error('A solicitação mudou durante o backup; execute novamente');
      const now = new Date().toISOString();
      const repaired = { ...current.request, ...Object.fromEntries(current.fields.map(key => [key, 'Pendente'])), updated_date: now };
      const result = db.prepare("UPDATE records SET data = ?, updated_at = ? WHERE entity = 'TrainingRequest' AND id = ? AND data = ?")
        .run(JSON.stringify(repaired), now, current.row.id, current.row.data);
      if (result.changes !== 1) throw new Error('A atualização não atingiu exatamente uma solicitação');
      db.exec('COMMIT');
      console.log(JSON.stringify({ request_id: requestId, mode: 'repaired', fields: current.fields, status: repaired.status, backup: backupPath }));
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
} finally {
  db.close();
}
