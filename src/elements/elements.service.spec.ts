import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockDbCrud } from 'test/common/mock-db.type';
import { createChainableMock } from 'test/helpers/chainable-mock';
import { DATABASE_CONNECTION } from '../database/database.module';
import { ElementsService } from './elements.service';

describe('ElementsService', () => {
  let service: ElementsService;
  let mockDb: MockDbCrud;

  const mockElementRow = {
    id: 1,
    name: 'Fire',
    description: 'The element of fire',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function mockFindOneQueries(
    element = mockElementRow,
    masters: unknown[] = [],
  ): void {
    mockDb.select
      .mockReturnValueOnce(createChainableMock([element]))
      .mockReturnValueOnce(createChainableMock(masters));
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
        ElementsService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = moduleRef.get(ElementsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns data and pagination meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockElementRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 1 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.data).toEqual([
        {
          id: mockElementRow.id,
          name: mockElementRow.name,
          description: mockElementRow.description,
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
    it('returns a mapped detail with empty masters', async () => {
      mockFindOneQueries();

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: mockElementRow.id,
        name: mockElementRow.name,
        description: mockElementRow.description,
        createdAt: mockElementRow.createdAt,
        updatedAt: mockElementRow.updatedAt,
        masters: [],
      });
    });

    it('throws NotFoundException when the element does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Element with id 999 not found'),
      );
    });

    it('maps masters correctly', async () => {
      mockFindOneQueries(mockElementRow, [
        { characterId: 1, characterName: 'Kai', isActive: true },
      ]);

      const result = await service.findOne(1);

      expect(result.masters).toEqual([{ id: 1, name: 'Kai', isActive: true }]);
    });
  });

  describe('create', () => {
    it('inserts a new element and returns the detail', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.insert.mockReturnValue(createChainableMock([mockElementRow]));
      mockFindOneQueries();

      const result = await service.create({
        name: 'Fire',
        description: 'The element of fire',
      });

      expect(result.name).toBe('Fire');
      expect(result.masters).toEqual([]);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('throws ConflictException when the name already exists', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([{ id: 2 }]));

      await expect(
        service.create({ name: 'Fire', description: 'Duplicate' }),
      ).rejects.toThrow(ConflictException);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates an element and returns the detail', async () => {
      const updatedRow = { ...mockElementRow, name: 'Lightning' };
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.update.mockReturnValue(createChainableMock([updatedRow]));
      mockFindOneQueries(updatedRow);

      const result = await service.update(1, { name: 'Lightning' });

      expect(result.name).toBe('Lightning');
    });

    it('throws NotFoundException when the element does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.update.mockReturnValue(createChainableMock([]));

      await expect(service.update(999, { name: 'Lightning' })).rejects.toThrow(
        new NotFoundException('Element with id 999 not found'),
      );
    });

    it('throws ConflictException when the new name already exists', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([{ id: 2 }]));

      await expect(service.update(1, { name: 'Ice' })).rejects.toThrow(
        ConflictException,
      );

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an element without error', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([mockElementRow]));

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when nothing is deleted', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([]));

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Element with id 999 not found'),
      );
    });
  });
});
