import { Test, TestingModule } from '@nestjs/testing';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import { WeaponsService } from './weapons.service';

describe('WeaponsService', () => {
  let service: WeaponsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeaponsService,
        {
          provide: DATABASE_CONNECTION,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WeaponsService>(WeaponsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
