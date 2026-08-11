export const SCHEDULE_BUFFER_MINUTES = 40;
const BUFFER_MS = SCHEDULE_BUFFER_MINUTES * 60 * 1000;
const STEP_MS = 30 * 60 * 1000;

export function scheduleConflicts(start, end, schedules) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return schedules.filter((schedule) => {
    const blockedStart = new Date(schedule.start_datetime).getTime() - BUFFER_MS;
    const blockedEnd = new Date(schedule.end_datetime).getTime() + BUFFER_MS;
    return startTime < blockedEnd && endTime > blockedStart;
  });
}

export function suggestScheduleSlots(start, end, schedules, count = 3) {
  const duration = new Date(end).getTime() - new Date(start).getTime();
  let candidate = new Date(start).getTime();
  const suggestions = [];
  for (let attempt = 0; attempt < 192 && suggestions.length < count; attempt += 1) {
    const candidateEnd = candidate + duration;
    if (scheduleConflicts(new Date(candidate), new Date(candidateEnd), schedules).length === 0) {
      suggestions.push({ start: new Date(candidate), end: new Date(candidateEnd) });
    }
    candidate += STEP_MS;
  }
  return suggestions;
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}