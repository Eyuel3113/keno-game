import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    });
    console.log(`Telegram message sent to chat ID: ${chatId}`);
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

export async function sendTelegramMessageToUser(telegramId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  // Telegram ID is the same as chat ID for direct messages
  return sendTelegramMessage(telegramId, text, parseMode);
}

export async function sendTelegramMessageToAdmins(text: string, adminTelegramIds: string[]) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  for (const telegramId of adminTelegramIds) {
    await sendTelegramMessageToUser(telegramId, text);
  }
}
