import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';

@Controller()
export class RootController {
  @Version(VERSION_NEUTRAL)
  @Get('/')
  redirectInfo() {
    return {
      title: 'Welcome to the Spinjitzu API',
      description:
        'The Spinjitzu API is a RESTful API that provides data about the Ninjago characters, seasons, elements, weapons, locations, and realms.',
      documentation: '/docs',
      apiRoot: '/api/v1',
    };
  }
}
