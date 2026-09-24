const assert = require('node:assert/strict');
const fs = require('node:fs');

const CALENDAR = 'https://api.leadconnectorhq.com/widget/bookings/boxleague-onboarding';

const index = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const apply = fs.readFileSync(require.resolve('../apply.html'), 'utf8');

assert.match(index, new RegExp(CALENDAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(apply, new RegExp(CALENDAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(index, /Book a 15-min onboarding call/);
assert.match(apply, /Prefer a call\?/);
assert.match(apply, /Book 15 minutes/);
assert.match(
  index,
  /href="https:\/\/api\.leadconnectorhq\.com\/widget\/bookings\/boxleague-onboarding"[^>]*target="_blank"[^>]*rel="noopener"/
);
assert.match(
  apply,
  /href="https:\/\/api\.leadconnectorhq\.com\/widget\/bookings\/boxleague-onboarding"[^>]*target="_blank"[^>]*rel="noopener"/
);

console.log('onboarding-calendar.test.js: all assertions passed');
