import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../database/database.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule, DatabaseModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
