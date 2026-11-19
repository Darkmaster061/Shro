import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../server/db';

initDatabase();

const username = (process.argv[2] || process.env.ADMIN_USERNAME || 'owner').trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
const role = (process.argv[4] || 'owner') as 'owner' | 'editor' | 'food_manager' | 'scanner';
const displayName = process.argv[5] || 'مدیر سامانه';

if (!password || password.length < 8) {
  console.error('خطا: لطفاً رمز عبور قوی با حداقل ۸ کاراکتر وارد کنید.');
  console.error('نحوه اجرا: npm run create-admin -- <username> <password> [role] [displayName]');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  `INSERT INTO admin_users (username, display_name, password_hash, role)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, display_name = excluded.display_name`
).run(username, displayName, hash, role);

console.log(`کاربر "${username}" با نقش "${role}" با موفقیت ایجاد یا به‌روزرسانی شد.`);
