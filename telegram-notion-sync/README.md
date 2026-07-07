# Telegram → Notion Sync

Salva automaticamente as mensagens de um grupo específico do Telegram como
novas páginas dentro da página **"Tudo Pessoal"** no seu Notion.

Roda 100% grátis via GitHub Actions (sem VPS, sem servidor pra manter),
verificando mensagens novas a cada 30 minutos.

## ⚠️ Antes de tudo: deixe o repositório privado

Settings do repositório → role até "Danger Zone" → "Change visibility" →
"Make private". Assim ninguém além de você vê os logs de execução.

## 1. Criar o bot no Telegram

1. Abra uma conversa com [@BotFather](https://t.me/BotFather) no Telegram.
2. Envie `/newbot` e siga as instruções (nome e username do bot).
3. Guarde o **token** que ele te der (parece com `123456789:ABCdefGhIJKlmNoPQRstuVWXyz`).
4. **Importante:** envie `/setprivacy` para o BotFather, escolha o seu bot e
   selecione **Disable**. Sem isso, o bot só enxerga comandos e menções —
   não vê as mensagens normais do grupo.
5. Adicione o bot ao grupo específico que você quer sincronizar.

## 2. Descobrir o `chat_id` do grupo

1. Envie qualquer mensagem no grupo (com o bot já dentro dele).
2. Acesse no navegador (substituindo `<TOKEN>` pelo token do bot):
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Procure `"chat":{"id": -100XXXXXXXXXX, ...}` no JSON retornado — esse
   número (geralmente negativo, para grupos) é o `chat_id`.

## 3. Criar a integração do Notion

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
   e clique em "New integration".
2. Dê um nome (ex: "Telegram Sync") e crie.
3. Copie o **"Internal Integration Secret"**.
4. Abra a página **"Tudo Pessoal"** no Notion → menu `•••` no canto superior
   direito → "Connections" (ou "Add connections") → selecione a integração
   que você acabou de criar. Sem esse passo a API do Notion recusa criar
   páginas ali.

## 4. Configurar os Secrets no GitHub

No repositório: Settings → Secrets and variables → Actions → "New repository secret".
Crie estes três:

| Nome                 | Valor                                      |
|----------------------|---------------------------------------------|
| `TELEGRAM_BOT_TOKEN` | Token do bot (passo 1)                     |
| `TELEGRAM_CHAT_ID`   | ID do grupo (passo 2)                      |
| `NOTION_TOKEN`       | Internal Integration Secret (passo 3)       |

## 5. Pronto

O workflow `.github/workflows/telegram-to-notion.yml` já roda sozinho a
cada 30 minutos. Para testar na hora sem esperar, vá na aba **Actions** →
"Telegram to Notion Sync" → "Run workflow".

Cada mensagem de texto enviada no grupo vira uma nova página dentro de
"Tudo Pessoal", com o remetente, data/hora e o texto da mensagem.

## Ajustando a frequência

O agendamento está em `*/30 * * * *` (a cada 30 minutos) para caber
folgadamente no limite gratuito de minutos do GitHub Actions em repositórios
privados (2.000 min/mês). Rodar a cada 5 ou 10 minutos é possível, mas pode
estourar esse limite ao longo do mês — ajuste o `cron` em
`.github/workflows/telegram-to-notion.yml` se quiser mudar esse equilíbrio.

## Limitações atuais

- Só mensagens de **texto** são salvas (fotos, áudios, stickers, etc. são
  ignorados por enquanto).
- Não é em tempo real: existe um atraso de até 30 minutos (o tempo entre
  execuções agendadas).
