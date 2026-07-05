import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockDbCrud } from 'test/common/mock-db.type';
import { createChainableMock } from 'test/helpers/chainable-mock';
import { DATABASE_CONNECTION } from '../database/database.module';
import { SeasonsService } from './seasons.service';
import { SeasonType } from './enums/season-type.enum';

describe('SeasonsService', () => {
  let service: SeasonsService;
  let mockDb: MockDbCrud;

  const mockSeasonRow = {
    id: 1,
    title: 'Rise of the Snakes',
    type: SeasonType.STANDARD,
    number: 1,
    episodesCount: 13,
    releaseYear: 2011,
    mainAntagonist: 'Pythor',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function mockFindOneQueries(
    season = mockSeasonRow,
    relations: {
      characters?: unknown[];
      weapons?: unknown[];
      locations?: unknown[];
    } = {},
  ): void {
    mockDb.select
      .mockReturnValueOnce(createChainableMock([season]))
      .mockReturnValueOnce(createChainableMock(relations.characters ?? []))
      .mockReturnValueOnce(createChainableMock(relations.weapons ?? []))
      .mockReturnValueOnce(createChainableMock(relations.locations ?? []));
  }

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonsService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = moduleRef.get(SeasonsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns data and pagination meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockSeasonRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 1 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.data).toEqual([
        {
          id: mockSeasonRow.id,
          title: mockSeasonRow.title,
          type: mockSeasonRow.type,
          number: mockSeasonRow.number,
          episodesCount: mockSeasonRow.episodesCount,
          releaseYear: mockSeasonRow.releaseYear,
          mainAntagonist: mockSeasonRow.mainAntagonist,
        },
      ]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('returns a mapped detail with empty relations', async () => {
      mockFindOneQueries();

      const result = await service.findOne(1);

      expect(result).toEqual({
        ...mockSeasonRow,
        characters: [],
        weapons: [],
        locations: [],
      });
    });

    it('throws NotFoundException when the season does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Season with id 999 not found'),
      );
    });

    it('maps nested relations correctly', async () => {
      mockFindOneQueries(mockSeasonRow, {
        characters: [{ id: 1, name: 'Kai' }],
        weapons: [{ id: 3, name: 'Sword of Fire', type: 'Sword' }],
        locations: [{ id: 1, name: 'Monastery of Spinjitzu' }],
      });

      const result = await service.findOne(1);

      expect(result.characters).toEqual([{ id: 1, name: 'Kai' }]);
      expect(result.weapons).toEqual([
        { id: 3, name: 'Sword of Fire', type: 'Sword' },
      ]);
      expect(result.locations).toEqual([
        { id: 1, name: 'Monastery of Spinjitzu' },
      ]);
    });
  });

  describe('create', () => {
    it('inserts a new season and returns the detail', async () => {
      mockDb.insert.mockReturnValue(createChainableMock([mockSeasonRow]));
      mockFindOneQueries();

      const result = await service.create({
        title: 'Rise of the Snakes',
        type: SeasonType.STANDARD,
        number: 1,
        episodesCount: 13,
        releaseYear: 2011,
        mainAntagonist: 'Pythor',
        description: 'The first season of the show',
      });

      expect(result.title).toBe('Rise of the Snakes');
      expect(result.characters).toEqual([]);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates a season and returns the detail', async () => {
      const updatedRow = { ...mockSeasonRow, title: 'Updated Title' };
      mockDb.update.mockReturnValue(createChainableMock([updatedRow]));
      mockFindOneQueries(updatedRow);

      const result = await service.update(1, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('throws NotFoundException when the season does not exist', async () => {
      mockDb.update.mockReturnValue(createChainableMock([]));

      await expect(
        service.update(999, { title: 'Updated Title' }),
      ).rejects.toThrow(new NotFoundException('Season with id 999 not found'));
    });
  });

  describe('remove', () => {
    it('deletes a season without error', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([mockSeasonRow]));

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when nothing is deleted', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([]));

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Season with id 999 not found'),
      );
    });
  });
});
