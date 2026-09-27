/**
 * All incident/vessel/candidate timestamps in this app are UTC ISO strings
 * (e.g. ow-0008's T0 is 2019-06-14T20:35:58Z). `toLocaleString()` renders
 * them in the viewer's local timezone instead, which silently shifts both
 * the clock time and — whenever the offset crosses midnight — the calendar
 * date (ow-0008's T0 displayed as 6/15 instead of 6/14 for an IST viewer).
 * These helpers always format in UTC so every viewer sees the same date and
 * time the source data actually records.
 */
const UTC_DATETIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export const formatUTCDateTime = (value) => {
  if (!value) return "";
  return `${UTC_DATETIME_FORMATTER.format(new Date(value))} UTC`;
};

export const formatUTCDate = (value) => {
  if (!value) return "";
  return UTC_DATE_FORMATTER.format(new Date(value));
};
