import { config } from './config.mjs';
import { getJobRun, saveJobRun } from './db.mjs';
import { sendParticipantReminders } from './functions.mjs';

const JOB_NAME = 'participant-reminders';
let timer;

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.schedulerTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

export async function runScheduledJobs(now = new Date()) {
  if (!config.schedulerEnabled) return { skipped: true, reason: 'disabled' };
  const parts = localParts(now);
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (Number(parts.hour) < config.schedulerHour) return { skipped: true, reason: 'before-hour' };

  const previous = getJobRun(JOB_NAME);
  if (previous?.last_run_at) {
    const previousParts = localParts(new Date(previous.last_run_at));
    const previousDate = `${previousParts.year}-${previousParts.month}-${previousParts.day}`;
    if (previousDate === localDate && previous.status === 'success') {
      return { skipped: true, reason: 'already-ran' };
    }
  }

  try {
    const result = await sendParticipantReminders();
    saveJobRun(JOB_NAME, 'success', result);
    return result;
  } catch (error) {
    saveJobRun(JOB_NAME, 'error', { message: error.message });
    throw error;
  }
}

export function startScheduler() {
  if (!config.schedulerEnabled || timer) return;
  const execute = () => runScheduledJobs().catch(error => console.error('Scheduled job failed:', error));
  timer = setInterval(execute, 15 * 60 * 1000);
  timer.unref();
  setTimeout(execute, 5_000).unref();
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
