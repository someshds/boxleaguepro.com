'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'firebase.rules.json'), 'utf8');
const rules = JSON.parse(source).rules;

const mixInWrite = rules.clubs.$clubId.mixInGames.$gameId['.write'];
assert.match(mixInWrite, /clubAdmins/);
assert.doesNotMatch(mixInWrite, /newData\.child\('createdBy'\)/);
assert.doesNotMatch(mixInWrite, /data\.child\('createdBy'\)/);

assert.equal(rules.users.$uid.homeClub['.write'], "auth != null && auth.token.email == 'grantdeswardt@gmail.com'");
assert.match(rules.users.$uid.$profileField['.write'], /\$profileField != 'homeClub'/);

const userLeagueWrite = rules.userLeagues.$uid.$leagueId['.write'];
assert.match(userLeagueWrite, /child\('role'\)\.val\(\) === 'player'/);
assert.match(userLeagueWrite, /newData\.child\('role'\)\.val\(\) === data\.child\('role'\)\.val\(\)/);

console.log('Firebase rule hardening assertions passed.');
