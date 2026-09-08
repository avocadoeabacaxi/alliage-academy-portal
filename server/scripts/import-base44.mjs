import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { countRecords, db, upsertAccount, upsertImportedRecord } from '../db.mjs';

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Uso: pnpm import:data /caminho/alliage-database.json');
  process.exit(1);
}

let exported;
try {
  exported = JSON.parse(readFileSync(resolve(sourcePath), 'utf8'));
} catch (error) {
  console.error(`Não foi possível ler o export: ${error.message}`);
  process.exit(1);
}

if (!exported?.entities || typeof exported.entities !== 'object') {
  console.error('Arquivo inválido: a chave "entities" não foi encontrada.');
  process.exit(1);
}

const allowedEntities = new Set(['TrainingRequest', 'TrainingSchedule', 'Client', 'TeamMember', 'UserAuthorization', 'RoutingRule', 'SatisfactionSurvey', 'TrainingEvaluation', 'EmailTemplate', 'SurveyResponse', 'User']);
const imported = {};

db.exec('BEGIN IMMEDIATE');
try {
  for (const [entity, records] of Object.entries(exported.entities)) {
    if (!allowedEntities.has(entity)) {
      console.warn(`Ignorando entidade desconhecida: ${entity}`);
      continue;
    }
    if (!Array.isArray(records)) throw new Error(`A entidade ${entity} não contém uma lista`);
    imported[entity] = 0;
    for (const record of records) {
      upsertImportedRecord(entity, record);
      imported[entity] += 1;
      if (entity === 'User' && record.email) {
        upsertAccount({ id: record.id, email: record.email, emailVerified: true });
      }
    }
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  console.error(`Importação cancelada: ${error.message}`);
  process.exit(1);
}

console.log(JSON.stringify({ source_exported_at: exported.exported_at || null, imported, database: countRecords() }, null, 2));
