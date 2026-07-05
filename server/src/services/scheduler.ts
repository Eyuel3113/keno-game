import prisma from '../config/db';
import { sendTelegramMessageToUser } from './telegramBot';
import cron from 'node-cron';

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

// Start the scheduler using node-cron
export function startGameReminderScheduler() {
  // Send reminders at 10:00 AM and 6:00 PM (Ethiopia time)
  // Cron format: minute hour day-of-month month day-of-week
  // 0 10 * * * = Every day at 10:00 AM
  // 0 18 * * * = Every day at 6:00 PM
  
  const morningReminder = cron.schedule('0 10 * * *', () => {
    console.log('Running morning game reminder at 10:00 AM');
    sendGameReminder();
  }, {
    timezone: 'Africa/Addis_Ababa'
  });

  const eveningReminder = cron.schedule('0 18 * * *', () => {
    console.log('Running evening game reminder at 6:00 PM');
    sendGameReminder();
  }, {
    timezone: 'Africa/Addis_Ababa'
  });

  console.log('Game reminders scheduled for 10:00 AM and 6:00 PM (Africa/Addis_Ababa timezone)');

  // Return tasks for potential cleanup
  return { morningReminder, eveningReminder };
}
