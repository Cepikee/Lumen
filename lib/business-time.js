"use strict";

const ZONE = "Europe/Budapest";

function parts(date, timeZone = ZONE) {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(values.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function offsetAt(date, timeZone = ZONE) {
  const p = parts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

function localToUtc(local, timeZone = ZONE) {
  const target = Date.UTC(local.year, local.month - 1, local.day, local.hour || 0, local.minute || 0, local.second || 0);
  let candidate = target - offsetAt(new Date(target), timeZone);
  candidate = target - offsetAt(new Date(candidate), timeZone);
  return new Date(candidate);
}

function addLocalDays(local, days) {
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day + days, local.hour || 0, local.minute || 0, local.second || 0));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() };
}

function businessDayBounds(date = new Date(), timeZone = ZONE) {
  const current = parts(date, timeZone);
  const startLocal = { year: current.year, month: current.month, day: current.day, hour: 0, minute: 0, second: 0 };
  return { start: localToUtc(startLocal, timeZone), end: localToUtc(addLocalDays(startLocal, 1), timeZone), timeZone };
}

function businessWeekBounds(date = new Date(), timeZone = ZONE) {
  const current = parts(date, timeZone);
  const weekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const startLocal = addLocalDays({ year: current.year, month: current.month, day: current.day, hour: 0, minute: 0, second: 0 }, mondayOffset);
  return { start: localToUtc(startLocal, timeZone), end: localToUtc(addLocalDays(startLocal, 7), timeZone), timeZone };
}

function businessMonthBounds(date = new Date(), timeZone = ZONE) {
  const current = parts(date, timeZone);
  const startLocal = { year: current.year, month: current.month, day: 1, hour: 0, minute: 0, second: 0 };
  return { start: localToUtc(startLocal, timeZone), end: localToUtc(addLocalDays(startLocal, 32 - new Date(Date.UTC(current.year, current.month - 1, 32)).getUTCDate()), timeZone), timeZone };
}

function mysqlUtc(date) { return date.toISOString().slice(0, 19).replace("T", " "); }
function hourInZone(date, timeZone = ZONE) { return parts(date, timeZone).hour; }

module.exports = { ZONE, parts, localToUtc, businessDayBounds, businessWeekBounds, businessMonthBounds, mysqlUtc, hourInZone };
