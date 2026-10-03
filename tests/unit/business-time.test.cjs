"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { businessDayBounds, businessWeekBounds, businessMonthBounds, localToUtc, parts } = require("../../lib/business-time");

test("Europe/Budapest business day follows DST spring and fall transitions", () => {
  const spring = businessDayBounds(new Date("2026-03-29T12:00:00Z"));
  const fall = businessDayBounds(new Date("2026-10-25T12:00:00Z"));
  assert.equal(spring.start.toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(spring.end.toISOString(), "2026-03-29T22:00:00.000Z");
  assert.equal((spring.end - spring.start) / 3_600_000, 23);
  assert.equal(fall.start.toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(fall.end.toISOString(), "2026-10-25T23:00:00.000Z");
  assert.equal((fall.end - fall.start) / 3_600_000, 25);
});

test("week and month business bounds are explicit and host-timezone independent", () => {
  assert.deepEqual([businessWeekBounds(new Date("2026-09-30T12:00:00Z")).start.toISOString(), businessWeekBounds(new Date("2026-09-30T12:00:00Z")).end.toISOString()], ["2026-09-27T22:00:00.000Z", "2026-10-04T22:00:00.000Z"]);
  assert.deepEqual([businessMonthBounds(new Date("2026-09-30T12:00:00Z")).start.toISOString(), businessMonthBounds(new Date("2026-09-30T12:00:00Z")).end.toISOString()], ["2026-08-31T22:00:00.000Z", "2026-09-30T22:00:00.000Z"]);
  const script = "const {businessDayBounds}=require(process.cwd() + '/lib/business-time'); const b=businessDayBounds(new Date('2026-10-25T12:00:00Z')); console.log(JSON.stringify([b.start.toISOString(),b.end.toISOString()]));";
  const utc = execFileSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: "UTC" }, encoding: "utf8" }).trim();
  const budapest = execFileSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: "Europe/Budapest" }, encoding: "utf8" }).trim();
  assert.equal(utc, budapest);
});

test("source timestamps remain absolute and local civil edge cases are deterministic", () => {
  assert.deepEqual(parts(new Date("2026-07-01T10:00:00Z")), { year: 2026, month: 7, day: 1, hour: 12, minute: 0, second: 0 });
  assert.equal(localToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }).toISOString(), "2026-03-29T01:30:00.000Z");
  assert.equal(localToUtc({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }).toISOString(), "2026-10-25T01:30:00.000Z");
});
