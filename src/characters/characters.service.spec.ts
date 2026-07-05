import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockDbCrud } from 'test/common/mock-db.type';
import { createChainableMock } from 'test/helpers/chainable-mock';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CharactersService } from './characters.service';
import { CharacterStatus } from './enums/character-status.enum';

describe('CharactersService', () => {
  let service: CharactersService;
  let mockDb: MockDbCrud;

  const mockCharacterRow = {
    id: 1,
    name: 'Kai',
    description: 'The Fire Ninja',
    aliases: null,
    species: 'Human',
    status: 'Alive',
    debutSeasonId: null as number | null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function mockFindOneQueries(
    character = mockCharacterRow,
    relations: {
      elements?: unknown[];
      weapons?: unknown[];
      seasons?: unknown[];
    } = {},
  ): void {
    mockDb.select
      .mockReturnValueOnce(createChainableMock([character]))
      .mockReturnValueOnce(createChainableMock(relations.elements ?? []))
      .mockReturnValueOnce(createChainableMock(relations.weapons ?? []))
      .mockReturnValueOnce(createChainableMock(relations.seasons ?? []));
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
        CharactersService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = moduleRef.get(CharactersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns data and pagination meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockCharacterRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 1 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.data).toEqual([
        {
          id: mockCharacterRow.id,
          name: mockCharacterRow.name,
          description: mockCharacterRow.description,
          aliases: mockCharacterRow.aliases,
          species: mockCharacterRow.species,
          status: mockCharacterRow.status,
          createdAt: mockCharacterRow.createdAt,
          updatedAt: mockCharacterRow.updatedAt,
        },
      ]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });

    it('calculates totalPages correctly when total does not divide evenly', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockCharacterRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 25 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('findOne', () => {
    it('returns a mapped detail with empty relations', async () => {
      mockFindOneQueries();

      const result = await service.findOne(1);

      expect(result).toEqual({
        ...mockCharacterRow,
        elements: [],
        weapons: [],
        seasons: [],
      });
    });

    it('throws NotFoundException when the character does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Character with id 999 not found'),
      );
    });

    it('maps nested relations correctly', async () => {
      mockFindOneQueries(
        { ...mockCharacterRow, debutSeasonId: 1 },
        {
          elements: [{ id: 1, name: 'Fire', isActive: true }],
          weapons: [{ id: 3, name: 'Sword of Fire', type: 'Sword' }],
          seasons: [{ id: 1, number: 1, title: 'Rise of the Snakes' }],
        },
      );

      const result = await service.findOne(1);

      expect(result.elements).toEqual([
        { id: 1, name: 'Fire', isActive: true },
      ]);
      expect(result.weapons).toEqual([
        { id: 3, name: 'Sword of Fire', type: 'Sword' },
      ]);
      expect(result.seasons).toEqual([
        { id: 1, number: 1, title: 'Rise of the Snakes' },
      ]);
    });
  });

  describe('create', () => {
    it('inserts a new character and returns the detail', async () => {
      mockDb.insert.mockReturnValue(createChainableMock([mockCharacterRow]));
      mockFindOneQueries();

      const result = await service.create({
        name: 'Kai',
        description: 'The Fire Ninja',
      });

      expect(result.name).toBe('Kai');
      expect(result.elements).toEqual([]);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('validates debutSeasonId before insert', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([{ id: 1 }]));
      mockDb.insert.mockReturnValue(
        createChainableMock([{ ...mockCharacterRow, debutSeasonId: 1 }]),
      );
      mockFindOneQueries({ ...mockCharacterRow, debutSeasonId: 1 });

      const result = await service.create({
        name: 'Kai',
        description: 'The Fire Ninja',
        debutSeasonId: 1,
      });

      expect(result.debutSeasonId).toBe(1);
    });

    it('throws BadRequestException when debutSeasonId does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(
        service.create({
          name: 'Kai',
          description: 'The Fire Ninja',
          debutSeasonId: 99,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates a character and returns the detail', async () => {
      const updatedRow = {
        ...mockCharacterRow,
        status: CharacterStatus.DECEASED,
      };
      mockDb.update.mockReturnValue(createChainableMock([updatedRow]));
      mockFindOneQueries(updatedRow);

      const result = await service.update(1, {
        status: CharacterStatus.DECEASED,
      });

      expect(result.status).toBe(CharacterStatus.DECEASED);
    });

    it('throws NotFoundException when the character does not exist', async () => {
      mockDb.update.mockReturnValue(createChainableMock([]));

      await expect(
        service.update(999, { status: CharacterStatus.DECEASED }),
      ).rejects.toThrow(
        new NotFoundException('Character with id 999 not found'),
      );
    });

    it('throws BadRequestException when debutSeasonId does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.update(1, { debutSeasonId: 99 })).rejects.toThrow(
        BadRequestException,
      );

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a character without error', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([mockCharacterRow]));

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when nothing is deleted', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([]));

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Character with id 999 not found'),
      );
    });
  });
});
