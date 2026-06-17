import prisma from '../config/db';
import { sendTelegramMessageToUser } from './telegramBot';

// Send game reminder to all Telegram users
async function sendGameReminder() {
  try {
    const users = await prisma.user.findMany({
      where: {
        telegramId: { not: null },
        isBanned: false,
      },
      select: {
        telegramId: true,
      },
    });

    const message = `
<b>🎮 Game Reminder!</b>

Don't forget to play Keno today! 
Test your luck and win big prizes.

Click the game to start playing now!
    `.trim();

    for (const user of users) {
      if (user.telegramId) {
        await sendTelegramMessageToUser(user.telegramId, message);
      }
    }

    console.log(`Game reminder sent to ${users.length} users`);
  } catch (error) {
    console.error('Failed to send game reminder:', error);
  }
}

// Calculate time until next reminder
function getNextReminderTime(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

// Start the scheduler
export function startGameReminderScheduler() {
  // Send reminders at 10:00 AM and 6:00 PM (Ethiopia time)
  const reminderTimes = [
    { hour: 10, minute: 0 },
    { hour: 18, minute: 0 },
  ];

  reminderTimes.forEach(({ hour, minute }) => {
    const delay = getNextReminderTime(hour, minute);
    
    setTimeout(() => {
      sendGameReminder();
      // Schedule to repeat every 24 hours
      setInterval(sendGameReminder, 24 * 60 * 60 * 1000);
    }, delay);

    console.log(`Game reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')} (first run in ${Math.round(delay / 1000 / 60)} minutes)`);
  });
}
