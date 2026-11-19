import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../server/db';

const backupDir = path.resolve(process.cwd(), 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupDir, `portal-backup-${stamp}.db`);

async function run() {
  await db.backup(target);
  console.log(`پشتیبان‌گیری با موفقیت انجام شد: ${target}`);
}

run().catch((err) => {
  console.error('خطا در پشتیبان‌گیری:', err);
  process.exit(1);
});
