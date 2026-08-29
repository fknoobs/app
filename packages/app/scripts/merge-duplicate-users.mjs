#!/usr/bin/env node
import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';

const env = dotenv.config().parsed ?? {};
const adminEmail = env.PB_ADMIN_EMAIL;
const adminPassword = env.PB_ADMIN_PASSWORD;
const baseUrl = env.PB_URL ?? 'http://127.0.0.1:8090';
const max = Number(process.argv.find((arg) => arg.startsWith('--max='))?.split('=')[1] || '50');

if (!adminEmail || !adminPassword) {
	throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in .env');
}

const client = new PocketBase(baseUrl);
await client.collection('_superusers').authWithPassword(adminEmail, adminPassword);
console.log(`Authenticated against ${baseUrl}`);

const result = await client.send(`/api/users/merge/run?max=${max}`, { method: 'POST' });
const groups = result?.groups || [];

for (const group of groups) {
	console.log(`Merged ${(group.loserIds || []).length} account(s) into ${group.keeperId}`, group);
}

console.log(`Done. groups=${groups.length} remaining=${Boolean(result?.remaining)}`);
