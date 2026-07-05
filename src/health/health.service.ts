import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import type { Database } from '../database/database-connection';
import { DATABASE_CONNECTION } from '../database/database.module';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    super();
  }

  async isDatabaseHealthy(key = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
