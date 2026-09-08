# Alliage Trainning

Portal de solicitações, aprovações e avaliação de treinamentos da Alliage. Esta versão é autônoma e não depende do Base44.

## Arquitetura

- React + Vite no frontend.
- API HTTP em Node.js 24.
- SQLite persistente para dados e autenticação.
- Armazenamento local de imagens e PDFs.
- Resend para e-mails, com modo seguro `EMAIL_DRY_RUN=true`.
- Provedor de IA compatível com a API OpenAI para tradução e geração de pesquisas, com perguntas padrão quando a IA não está configurada.
- OAuth Google e Microsoft opcional.
- Agendador diário de lembretes aos participantes.
- Nginx/Certbot no VPS para proxy reverso e HTTPS.

## Desenvolvimento local

```bash
pnpm install
cp .env.example .env
pnpm dev:server
```

Em outro terminal:

```bash
pnpm dev
```

O frontend abre em `http://localhost:5173` e encaminha `/api` para `http://localhost:3001`.

## Importar o export do Base44

O arquivo exportado contém dados pessoais e não deve ser adicionado ao Git.

```bash
DATA_DIR=.data pnpm import:data /caminho/alliage-database-2026-08-03.json
```

A importação é idempotente: os IDs originais são preservados e uma nova execução atualiza os mesmos registros.

O export não contém senhas. Usuários importados precisam usar **Esqueci minha senha** após o e-mail real ser ativado. Para criar uma senha administrativa temporária diretamente no servidor:

```bash
ADMIN_PASSWORD='uma-senha-forte' pnpm admin:set-password admin@dominio.com
```

## E-mail e IA

Mantenha `EMAIL_DRY_RUN=true` durante homologação. Cada tentativa fica registrada em `email_log` no SQLite, mas nenhuma mensagem sai do servidor. Depois de validar domínio/remetente no Resend, configure `RESEND_API_KEY` e altere para `false`.

Sem `AI_API_URL`, `AI_API_KEY` e `AI_MODEL`, o portal continua funcionando: traduções mantêm o texto original e pesquisas usam o questionário trilíngue padrão.

## Produção

1. Copie `.env.example` para `.env` e preencha os segredos.
2. Importe o banco antes de liberar usuários.
3. Inicie com `docker compose up -d --build`. O app fica disponível apenas em `127.0.0.1:8027`.
4. Instale `deploy/nginx-http.conf` no Nginx e confira `/api/health`.

Quando o servidor de produção não tiver acesso ao registro npm, compile primeiro com `pnpm build` e gere a imagem sem reinstalar dependências:

```bash
docker build -f deploy/Dockerfile.prebuilt -t alliage-trainning-app .
docker compose up -d
```

O Certbot só conseguirá emitir o certificado quando os registros DNS A/AAAA do domínio apontarem para o servidor e as portas 80/443 estiverem acessíveis. Para `training.alliage.global`, mantenha `APP_ORIGIN=https://training.alliage.global`.

Faça backup periódico do volume `alliage_data`; ele contém o SQLite e os uploads.
