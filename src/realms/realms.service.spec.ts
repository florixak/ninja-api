import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockDbCrud } from '../../test/common/mock-db.type';
import { createChainableMock } from '../../test/helpers/chainable-mock';
import { DATABASE_CONNECTION } from '../database/database.module';
import { RealmsService } from './realms.service';

describe('RealmsService', () => {
  let service: RealmsService;
  let mockDb: MockDbCrud;

  const mockRealmRow = {
    id: 1,
    name: 'Ninjago',
    description: 'The main realm',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RealmsService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = moduleRef.get(RealmsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns data and pagination meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockRealmRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 1 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.data).toEqual([
        {
          id: mockRealmRow.id,
          name: mockRealmRow.name,
          description: mockRealmRow.description,
          createdAt: mockRealmRow.createdAt,
          updatedAt: mockRealmRow.updatedAt,
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
        .mockReturnValueOnce(createChainableMock([mockRealmRow]))
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
    it('returns a mapped detail', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([mockRealmRow]));

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: mockRealmRow.id,
        name: mockRealmRow.name,
        description: mockRealmRow.description,
        createdAt: mockRealmRow.createdAt,
        updatedAt: mockRealmRow.updatedAt,
      });
    });

    it('throws NotFoundException when the realm does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Realm with id 999 not found'),
      );
    });
  });

  describe('create', () => {
    it('inserts a new realm and returns the detail', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.insert.mockReturnValue(createChainableMock([mockRealmRow]));

      const result = await service.create({
        name: 'Ninjago',
        description: 'The main realm',
      });

      expect(result).toEqual({
        id: mockRealmRow.id,
        name: mockRealmRow.name,
        description: mockRealmRow.description,
        createdAt: mockRealmRow.createdAt,
        updatedAt: mockRealmRow.updatedAt,
      });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('throws ConflictException when the name already exists', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([{ id: 2 }]));

      await expect(
        service.create({ name: 'Ninjago', description: 'Duplicate' }),
      ).rejects.toThrow(ConflictException);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('throws ConflictException on unique violation from the database', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.insert.mockReturnValue(
        createChainableMock([], { postgresErrorCode: '23505' }),
      );

      await expect(
        service.create({ name: 'Ninjago', description: 'The main realm' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates a realm and returns the detail', async () => {
      const updatedRow = { ...mockRealmRow, name: 'Updated Ninjago' };
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.update.mockReturnValue(createChainableMock([updatedRow]));

      const result = await service.update(1, { name: 'Updated Ninjago' });

      expect(result.name).toBe('Updated Ninjago');
    });

    it('throws NotFoundException when the realm does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.update.mockReturnValue(createChainableMock([]));

      await expect(
        service.update(999, { name: 'Updated Ninjago' }),
      ).rejects.toThrow(new NotFoundException('Realm with id 999 not found'));
    });

    it('throws ConflictException when the new name already exists', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([{ id: 2 }]));

      await expect(
        service.update(1, { name: 'Existing Realm' }),
      ).rejects.toThrow(ConflictException);

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException on unique violation from the database', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));
      mockDb.update.mockReturnValue(
        createChainableMock([], { postgresErrorCode: '23505' }),
      );

      await expect(
        service.update(1, { name: 'Updated Ninjago' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes a realm without error', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([mockRealmRow]));

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when nothing is deleted', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([]));

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Realm with id 999 not found'),
      );
    });
  });
});
