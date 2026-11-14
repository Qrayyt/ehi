import { getTelegramToken } from './secrets.mjs';
import { approveLoginChallenge } from './login-challenges.mjs';

let cachedProfile = null;

async function callTelegram(method, body = {}) {
  const token = getTelegramToken();
  if (!token) throw new Error('telegram_not_configured');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`telegram_${method}_failed`);
  return result.result;
}

export async function getBotProfile({ refresh = false } = {}) {
  if (!cachedProfile || refresh) cachedProfile = await callTelegram('getMe');
  return cachedProfile;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const commandHandlers = new Map([
  ['start', async ({ chatId, user, message }) => {
    const parameter = String(message.text || '').trim().split(/\s+/, 2)[1] || '';
    if (parameter.startsWith('login_')) {
      const challengeId = parameter.slice(6);
      const approved = /^[a-f0-9]{48}$/.test(challengeId) && approveLoginChallenge(challengeId, user);
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: approved ? 'Вход подтверждён. Можно вернуться на страницу EHI! CINEMA.' : 'Ссылка для входа устарела. Откройте страницу входа ещё раз.',
      });
    }
    return callTelegram('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `Привет, ${escapeHtml(user.first_name || 'гость')}! Это бот <b>EHI! CINEMA</b>. Здесь позже появятся уведомления о бронях и билетах.`,
      reply_markup: { inline_keyboard: [[{ text: 'Открыть кинотеатр', url: process.env.PUBLIC_ORIGIN }]] },
    });
  }],
  ['help', async ({ chatId }) => callTelegram('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: '<b>Команды</b>\n/start — главное меню\n/site — открыть сайт\n/id — ваш Telegram ID\n/help — эта справка',
  })],
  ['site', async ({ chatId }) => callTelegram('sendMessage', {
    chat_id: chatId,
    text: 'EHI! CINEMA',
    reply_markup: { inline_keyboard: [[{ text: 'Открыть сайт', url: process.env.PUBLIC_ORIGIN }]] },
  })],
  ['id', async ({ chatId, user }) => callTelegram('sendMessage', {
    chat_id: chatId,
    text: `Ваш Telegram ID: ${user.id}`,
  })],
]);

export async function handleTelegramUpdate(update) {
  const message = update?.message;
  if (!message?.chat?.id) return;
  const text = String(message.text || '').trim();
  const command = text.startsWith('/') ? text.slice(1).split(/[\s@]/)[0].toLowerCase() : '';
  const handler = commandHandlers.get(command);
  if (handler) {
    await handler({ chatId: message.chat.id, user: message.from || {}, message, update });
    return;
  }
  if (text) {
    await callTelegram('sendMessage', {
      chat_id: message.chat.id,
      text: 'Пока я понимаю только команды. Нажмите /help, чтобы посмотреть список.',
    });
  }
}

export async function configureTelegramBot() {
  const profile = await getBotProfile({ refresh: true });
  await callTelegram('setMyCommands', { commands: [
    { command: 'start', description: 'Главное меню' },
    { command: 'site', description: 'Открыть кинотеатр' },
    { command: 'id', description: 'Показать Telegram ID' },
    { command: 'help', description: 'Список команд' },
  ] });
  await callTelegram('setWebhook', {
    url: `${process.env.PUBLIC_ORIGIN}/api/telegram/webhook`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message'],
  });
  return profile;
}
