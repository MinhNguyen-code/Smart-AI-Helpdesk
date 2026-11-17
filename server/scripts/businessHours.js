const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function businessHoursConfig(env = process.env) {
  const timeZone = env.BUSINESS_TIMEZONE || DEFAULT_TIMEZONE;
  const startHour = Number(env.BUSINESS_START_HOUR ?? 8);
  const endHour = Number(env.BUSINESS_END_HOUR ?? 17);
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 24 || startHour >= endHour) {
    throw new Error('Invalid business-hours schedule');
  }
  new Intl.DateTimeFormat('en-GB', { timeZone });
  return { timeZone, startHour, endHour,
    label: `Mon-Fri ${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00 ${timeZone}` };
}

export function localBusinessMinute(date, schedule = businessHoursConfig()) {
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: schedule.timeZone,
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(clock.formatToParts(date).map(part => [part.type, part.value]));
  const business = !['Sat', 'Sun'].includes(parts.weekday)
    && Number(parts.hour) >= schedule.startHour && Number(parts.hour) < schedule.endHour;
  return { key: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
    day: `${parts.year}-${parts.month}-${parts.day}`, business };
}
