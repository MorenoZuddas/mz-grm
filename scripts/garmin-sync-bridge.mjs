#!/usr/bin/env node

const mode = process.argv.includes('--all') ? 'all' : 'latest';
const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const syncSecret = process.env.API_ADMIN_SECRET || process.env.MIGRATION_API_SECRET || process.env.SYNC_SECRET;

if (!syncSecret) {
  console.error('Missing API_ADMIN_SECRET, MIGRATION_API_SECRET or SYNC_SECRET');
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/activities/garmin/sync`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-secret': syncSecret,
  },
  body: JSON.stringify({ mode }),
});

const payload = await response.text();
console.log(payload);

if (!response.ok) {
  process.exit(1);
}
