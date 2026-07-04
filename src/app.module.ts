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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
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
  providers: [AppService],
})
export class AppModule {}
