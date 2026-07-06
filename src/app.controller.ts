import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Get()
  @ApiExcludeEndpoint()
  getVersionedRoot() {
    return {
      name: 'Spinjitzu API',
      version: 'v1',
      docs: '/docs',
      endpoints: [
        '/characters',
        '/seasons',
        '/elements',
        '/weapons',
        '/locations',
        '/realms',
        '/health',
      ],
    };
  }
}
