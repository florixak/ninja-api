import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { Role } from '../auth/enums/role.enum';
import { envSchema } from '../config/env.schema';
import { createDatabaseConnection } from './database-connection';
import { users } from './schema';

async function seedAdmin(): Promise<void> {
  const env = envSchema.parse(process.env);
  const db = createDatabaseConnection(env.DIRECT_DATABASE_URL);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, env.ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    console.log(`Admin user already exists: ${env.ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await argon2.hash(env.ADMIN_PASSWORD);

  await db.insert(users).values({
    email: env.ADMIN_EMAIL,
    passwordHash,
    role: Role.ADMIN,
  });

  console.log(`Admin user created: ${env.ADMIN_EMAIL}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
