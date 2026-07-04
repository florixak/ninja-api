import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CharactersModule } from './characters/characters.module';
import { AppConfigModule } from './config/config.module';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RealmsModule } from './realms/realms.module';
import { SeasonsModule } from './seasons/seasons.module';
import { ElementsModule } from './elements/elements.module';
import { LocationsModule } from './locations/locations.module';
import { WeaponsModule } from './weapons/weapons.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'read', ttl: 60_000, limit: 200 },
        { name: 'write', ttl: 60_000, limit: 20 },
        { name: 'auth', ttl: 60_000, limit: 5 },
      ],
      skipIf: (context) => {
        const request = context.switchToHttp().getRequest<{ url?: string }>();
        return (
          request.url === '/docs' ||
          (request.url?.startsWith('/docs/') ?? false)
        );
      },
    }),
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    CharactersModule,
    RealmsModule,
    SeasonsModule,
    ElementsModule,
    LocationsModule,
    WeaponsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
