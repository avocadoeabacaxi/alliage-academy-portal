import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/repair-pending-workflow.mjs', import.meta.url));

test('reparo tem prévia, backup, é idempotente e não modifica outros registros', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alliage-workflow-repair-'));
  const path = join(dir, 'test.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec('CREATE TABLE records (entity TEXT, id TEXT, data TEXT, created_at TEXT, updated_at TEXT)');
    const original = { id: 'target', request_id: 'TR-2026-041', status: 'Pendente Análise', justification: { pt: 'Preservar' } };
    db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?)').run('TrainingRequest', 'target', JSON.stringify(original), 'before', 'before');
    db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?)').run('UserAuthorization', 'admin', '{"role":"admin"}', 'before', 'before');
    const read = () => JSON.parse(db.prepare("SELECT data FROM records WHERE id = 'target'").get().data);
    const run = (...args) => spawnSync(process.execPath, [script, path, 'TR-2026-041', ...args], { encoding: 'utf8' });

    const preview = run();
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).mode, 'preview');
    assert.deepEqual(read(), original);

    const applied = run('--apply');
    assert.equal(applied.status, 0, applied.stderr);
    const result = JSON.parse(applied.stdout);
    assert.equal(result.mode, 'repaired');
    const repaired = read();
    assert.deepEqual(repaired, { ...original, decision_stage1: 'Pendente', decision_stage2: 'Pendente', updated_date: repaired.updated_date });
    const saved = new DatabaseSync(result.backup, { readOnly: true });
    assert.deepEqual(JSON.parse(saved.prepare("SELECT data FROM records WHERE id = 'target'").get().data), original);
    saved.close();
    assert.equal(JSON.parse(run('--apply').stdout).mode, 'unchanged');
    assert.equal(readdirSync(join(dir, 'backups')).length, 1);
    assert.deepEqual({ ...db.prepare("SELECT data, updated_at FROM records WHERE id = 'admin'").get() }, { data: '{"role":"admin"}', updated_at: 'before' });
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reparo recusa solicitações decididas, canceladas ou com histórico', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alliage-workflow-guard-'));
  const path = join(dir, 'test.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec('CREATE TABLE records (entity TEXT, id TEXT, data TEXT, created_at TEXT, updated_at TEXT)');
    const cases = [
      { status: 'Concluído' }, { status: 'Cancelado' }, { status: 'Rejeitado' },
      { status: 'Pendente Análise', decision_stage1: 'Aprovado' },
      { status: 'Pendente Análise', decision_stage2: 'Rejeitado' },
      { status: 'Pendente Análise', date_stage1: '2026-10-01' },
    ];
    for (const data of cases) {
      db.exec('DELETE FROM records');
      const json = JSON.stringify({ id: 'target', request_id: 'TR-2026-041', ...data });
      db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?)').run('TrainingRequest', 'target', json, 'before', 'before');
      const result = spawnSync(process.execPath, [script, path, 'TR-2026-041', '--apply'], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Recusado/);
      assert.equal(db.prepare("SELECT data FROM records WHERE id = 'target'").get().data, json);
    }
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
