import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PublicRead } from '../common/decorators/public-read.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check the health of the database' })
  @HealthCheck()
  @PublicRead()
  check() {
    return this.health.check([() => this.healthService.isDatabaseHealthy()]);
  }
}
