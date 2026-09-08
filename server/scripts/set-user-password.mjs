import { getAccountByEmail, setAccountPassword, setAccountVerified } from '../db.mjs';
import { hashPassword } from '../security.mjs';

const email = String(process.argv[2] || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (!email || password.length < 8) {
  console.error('Uso: ADMIN_PASSWORD="senha-com-8-ou-mais" pnpm admin:set-password usuario@dominio.com');
  process.exit(1);
}
if (!getAccountByEmail(email)) {
  console.error('A conta não existe. Importe a base antes de definir a senha.');
  process.exit(1);
}

const passwordData = hashPassword(password);
setAccountPassword(email, passwordData.hash, passwordData.salt);
setAccountVerified(email, true);
console.log(`Senha atualizada para ${email}.`);
