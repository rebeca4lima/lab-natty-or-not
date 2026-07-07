'use strict';

const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
// Página "Tudo Pessoal" no Notion — onde cada mensagem vira uma nova página filha.
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID || 'd21b7f41-ef88-435e-aaa1-9470010588d1';

const STATE_FILE = path.join(__dirname, 'state.json');
const MAX_BLOCK_LENGTH = 1900; // margem de segurança abaixo do limite de 2000 chars da API do Notion

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastUpdateId: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

async function getTelegramUpdates(offset) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=0`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Falha ao buscar mensagens do Telegram (HTTP ${res.status})`);
  }
  return data.result;
}

function formatDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function chunkText(text, size = MAX_BLOCK_LENGTH) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function buildPageTitle(message) {
  const text = message.text.trim().replace(/\s+/g, ' ');
  const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
  return `${formatDate(message.date)} — ${preview || '(sem texto)'}`;
}

function buildPageBlocks(message) {
  const senderName =
    [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') ||
    message.from?.username ||
    'Desconhecido';

  const calloutBlock = {
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '💬' },
      rich_text: [
        { type: 'text', text: { content: `Enviado por ${senderName} em ${formatDate(message.date)}` } },
      ],
    },
  };

  const paragraphBlocks = chunkText(message.text).map((chunk) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: chunk } }],
    },
  }));

  return [calloutBlock, ...paragraphBlocks];
}

async function createNotionPage(message) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { page_id: NOTION_PARENT_PAGE_ID },
      properties: {
        title: {
          title: [{ text: { content: buildPageTitle(message) } }],
        },
      },
      children: buildPageBlocks(message),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao criar página no Notion (HTTP ${res.status}): ${body.slice(0, 300)}`);
  }
}

async function main() {
  requireEnv('TELEGRAM_BOT_TOKEN', TELEGRAM_BOT_TOKEN);
  requireEnv('TELEGRAM_CHAT_ID', TELEGRAM_CHAT_ID);
  requireEnv('NOTION_TOKEN', NOTION_TOKEN);

  const state = loadState();
  const updates = await getTelegramUpdates(state.lastUpdateId + 1);

  if (updates.length === 0) {
    console.log('Nenhuma mensagem nova.');
    return;
  }

  let saved = 0;
  for (const update of updates) {
    const message = update.message;
    if (message && String(message.chat.id) === String(TELEGRAM_CHAT_ID) && message.text) {
      await createNotionPage(message);
      saved++;
    }
    state.lastUpdateId = update.update_id;
  }

  saveState(state);
  console.log(`Verificadas ${updates.length} atualizações do Telegram, ${saved} salvas no Notion.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
