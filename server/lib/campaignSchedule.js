const DEFAULT_SCHEDULE = {
  timezone: 'Australia/Sydney',
  activationHours: { start: '08:00', end: '22:00' },
  days: [0, 1, 2, 3, 4, 5, 6],
};

function parseTimeParts(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function resolveSchedule(campaignConfig = {}) {
  const fromConfig = campaignConfig.schedule || {};
  return {
    timezone: fromConfig.timezone || DEFAULT_SCHEDULE.timezone,
    activationHours: {
      start: fromConfig.activationHours?.start || DEFAULT_SCHEDULE.activationHours.start,
      end: fromConfig.activationHours?.end || DEFAULT_SCHEDULE.activationHours.end,
    },
    days: Array.isArray(fromConfig.days) && fromConfig.days.length > 0
      ? fromConfig.days
      : DEFAULT_SCHEDULE.days,
    locale: fromConfig.locale || 'en-AU',
  };
}

function formatTime12h(value) {
  const parts = parseTimeParts(value);
  if (!parts) return value;
  const period = parts.hours >= 12 ? 'pm' : 'am';
  const hour12 = parts.hours % 12 || 12;
  const mins = parts.minutes ? `:${String(parts.minutes).padStart(2, '0')}` : '';
  return `${hour12}${mins}${period}`;
}

function formatActivationHours(schedule) {
  const start = formatTime12h(schedule.activationHours.start);
  const end = formatTime12h(schedule.activationHours.end);
  return `${start} – ${end}`;
}

function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = pick('weekday');
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayMap[weekday] ?? date.getDay(),
    hours: Number(pick('hour')),
    minutes: Number(pick('minute')),
  };
}

function minutesSinceMidnight(hours, minutes) {
  return hours * 60 + minutes;
}

function isWithinActivation(schedule, at = new Date()) {
  const start = parseTimeParts(schedule.activationHours.start);
  const end = parseTimeParts(schedule.activationHours.end);
  if (!start || !end) return true;

  const local = zonedParts(at, schedule.timezone);
  if (!schedule.days.includes(local.day)) return false;

  const nowMins = minutesSinceMidnight(local.hours, local.minutes);
  const startMins = minutesSinceMidnight(start.hours, start.minutes);
  const endMins = minutesSinceMidnight(end.hours, end.minutes);

  if (startMins <= endMins) {
    return nowMins >= startMins && nowMins < endMins;
  }
  return nowMins >= startMins || nowMins < endMins;
}

function formatDateLabel(isoDate, locale = 'en-AU') {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildCampaignDetails(campaign, manifestStats = {}) {
  const schedule = resolveSchedule(campaign?.config || {});
  const activationLabel = formatActivationHours(schedule);
  const qrActiveNow = isWithinActivation(schedule);
  const lab = campaign?.config?.labCampaignStats;

  return {
    campaignId: campaign?.id || null,
    campaignName: campaign?.name || null,
    startDate: campaign?.startDate || null,
    endDate: campaign?.endDate || null,
    startDateLabel: formatDateLabel(campaign?.startDate, schedule.locale),
    endDateLabel: formatDateLabel(campaign?.endDate, schedule.locale),
    winningMoments: lab?.winningMoments ?? manifestStats.total ?? 0,
    claimedWinningMoments: lab?.claimed ?? null,
    remainingWinningMoments: lab?.remaining ?? manifestStats.remaining ?? 0,
    unawardedWinningMoments: lab?.unawarded ?? null,
    unawardedNote: lab?.unawardedNote || 'online draw',
    activationHours: schedule.activationHours,
    activationHoursLabel: activationLabel,
    timezone: schedule.timezone,
    qrActiveNow,
    qrStatusLabel: qrActiveNow ? 'QR active now' : 'Outside retail hours',
  };
}

module.exports = {
  DEFAULT_SCHEDULE,
  resolveSchedule,
  formatActivationHours,
  formatDateLabel,
  isWithinActivation,
  buildCampaignDetails,
};
