import axios from 'axios';
import FormData from 'form-data';

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

export async function sendTelegramPhoto(chatId: string, photoUrl: string, caption?: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: caption ? parseMode : undefined,
    });
    console.log(`Telegram photo sent to chat ID: ${chatId}`);
  } catch (error) {
    console.error('Failed to send Telegram photo:', error);
  }
}

export async function sendTelegramMessageToUser(telegramId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  // Telegram ID is the same as chat ID for direct messages
  return sendTelegramMessage(telegramId, text, parseMode);
}

export async function sendTelegramPhotoToUser(telegramId: string, photoUrl: string, caption?: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  return sendTelegramPhoto(telegramId, photoUrl, caption, parseMode);
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

export async function sendTelegramPhotoToAdmins(photoUrl: string, caption: string, adminTelegramIds: string[]) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  for (const telegramId of adminTelegramIds) {
    await sendTelegramPhotoToUser(telegramId, photoUrl, caption);
  }
}
