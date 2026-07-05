import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockDbCrud } from 'test/common/mock-db.type';
import { createChainableMock } from 'test/helpers/chainable-mock';
import { DATABASE_CONNECTION } from '../database/database.module';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let mockDb: MockDbCrud;

  const mockLocationRow = {
    id: 1,
    name: 'Blacksmith',
    realmId: 1 as number | null,
    description: 'Forge in Ninjago City',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockLocationDetailRow = {
    ...mockLocationRow,
    realmName: 'Ninjago' as string | null,
  };

  function mockFindOneQueries(
    location = mockLocationDetailRow,
    seasons: unknown[] = [],
  ): void {
    mockDb.select
      .mockReturnValueOnce(createChainableMock([location]))
      .mockReturnValueOnce(createChainableMock(seasons));
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
        LocationsService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = moduleRef.get(LocationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns data and pagination meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockLocationRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 1 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.data).toEqual([
        {
          id: mockLocationRow.id,
          name: mockLocationRow.name,
          realmId: mockLocationRow.realmId,
          description: mockLocationRow.description,
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
    it('returns a mapped detail with empty seasons', async () => {
      mockFindOneQueries();

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: mockLocationRow.id,
        name: mockLocationRow.name,
        realmId: mockLocationRow.realmId,
        description: mockLocationRow.description,
        createdAt: mockLocationRow.createdAt,
        updatedAt: mockLocationRow.updatedAt,
        realm: { id: mockLocationRow.realmId, name: 'Ninjago' },
        seasons: [],
      });
    });

    it('throws NotFoundException when the location does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Location with id 999 not found'),
      );
    });

    it('maps nested relations correctly', async () => {
      mockFindOneQueries(mockLocationDetailRow, [
        { id: 1, number: 1, title: 'Rise of the Snakes' },
      ]);

      const result = await service.findOne(1);

      expect(result.seasons).toEqual([
        { id: 1, number: 1, title: 'Rise of the Snakes' },
      ]);
    });

    it('returns null realm when realmId is missing', async () => {
      mockFindOneQueries({
        ...mockLocationRow,
        realmId: null,
        realmName: null,
      });

      const result = await service.findOne(1);

      expect(result.realm).toBeNull();
    });
  });

  describe('create', () => {
    it('inserts a new location and returns the detail', async () => {
      mockDb.insert.mockReturnValue(createChainableMock([mockLocationRow]));
      mockFindOneQueries();

      const result = await service.create({
        name: 'Blacksmith',
        description: 'Forge in Ninjago City',
        realmId: 1,
      });

      expect(result.name).toBe('Blacksmith');
      expect(result.realm?.name).toBe('Ninjago');
      expect(result.seasons).toEqual([]);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('throws BadRequestException when realmId does not exist', async () => {
      mockDb.insert.mockReturnValue(
        createChainableMock([], { postgresErrorCode: '23503' }),
      );

      await expect(
        service.create({
          name: 'Blacksmith',
          realmId: 99,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates a location and returns the detail', async () => {
      const updatedRow = {
        ...mockLocationRow,
        name: 'Updated Blacksmith',
      };
      mockDb.update.mockReturnValue(createChainableMock([updatedRow]));
      mockFindOneQueries({
        ...mockLocationDetailRow,
        name: 'Updated Blacksmith',
      });

      const result = await service.update(1, { name: 'Updated Blacksmith' });

      expect(result.name).toBe('Updated Blacksmith');
    });

    it('throws NotFoundException when the location does not exist', async () => {
      mockDb.update.mockReturnValue(createChainableMock([]));

      await expect(
        service.update(999, { name: 'Updated Blacksmith' }),
      ).rejects.toThrow(
        new NotFoundException('Location with id 999 not found'),
      );
    });
  });

  describe('remove', () => {
    it('deletes a location without error', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([mockLocationRow]));

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when nothing is deleted', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([]));

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Location with id 999 not found'),
      );
    });
  });
});
