import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockDbCrud } from 'test/common/mock-db.type';
import { createChainableMock } from 'test/helpers/chainable-mock';
import { DATABASE_CONNECTION } from '../database/database.module';
import { WeaponsService } from './weapons.service';

describe('WeaponsService', () => {
  let service: WeaponsService;
  let mockDb: MockDbCrud;

  const mockWeaponRow = {
    id: 1,
    name: 'Sword of Fire',
    type: 'Sword',
    isArtifact: false,
    description: "Kai's sword",
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  type WeaponDbRow = Omit<typeof mockWeaponRow, 'isArtifact'> & {
    isArtifact: boolean | number;
  };

  function mockFindOneQueries(
    weapon: WeaponDbRow = mockWeaponRow,
    wielders: unknown[] = [],
  ): void {
    mockDb.select
      .mockReturnValueOnce(createChainableMock([weapon]))
      .mockReturnValueOnce(createChainableMock(wielders));
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
        WeaponsService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = moduleRef.get(WeaponsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns data and pagination meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChainableMock([mockWeaponRow]))
        .mockReturnValueOnce(createChainableMock([{ total: 1 }]));

      const result = await service.findAll({
        page: 1,
        limit: 20,
        order: 'asc',
      });

      expect(result.data).toEqual([
        {
          id: mockWeaponRow.id,
          name: mockWeaponRow.name,
          type: mockWeaponRow.type,
          isArtifact: mockWeaponRow.isArtifact,
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
    it('returns a mapped detail with empty wielders', async () => {
      mockFindOneQueries();

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: mockWeaponRow.id,
        name: mockWeaponRow.name,
        type: mockWeaponRow.type,
        isArtifact: mockWeaponRow.isArtifact,
        description: mockWeaponRow.description,
        createdAt: mockWeaponRow.createdAt,
        updatedAt: mockWeaponRow.updatedAt,
        wielders: [],
      });
    });

    it('throws NotFoundException when the weapon does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChainableMock([]));

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Weapon with id 999 not found'),
      );
    });

    it('maps wielders correctly', async () => {
      mockFindOneQueries(mockWeaponRow, [{ id: 1, name: 'Kai' }]);

      const result = await service.findOne(1);

      expect(result.wielders).toEqual([{ id: 1, name: 'Kai' }]);
    });

    it('coerces isArtifact to boolean', async () => {
      mockFindOneQueries({ ...mockWeaponRow, isArtifact: 1 });

      const result = await service.findOne(1);

      expect(result.isArtifact).toBe(true);
    });
  });

  describe('create', () => {
    it('inserts a new weapon and returns the detail', async () => {
      mockDb.insert.mockReturnValue(createChainableMock([mockWeaponRow]));
      mockFindOneQueries();

      const result = await service.create({
        name: 'Sword of Fire',
        type: 'Sword',
        description: "Kai's sword",
      });

      expect(result.name).toBe('Sword of Fire');
      expect(result.wielders).toEqual([]);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates a weapon and returns the detail', async () => {
      const updatedRow = { ...mockWeaponRow, isArtifact: true };
      mockDb.update.mockReturnValue(createChainableMock([updatedRow]));
      mockFindOneQueries(updatedRow);

      const result = await service.update(1, { isArtifact: true });

      expect(result.isArtifact).toBe(true);
    });

    it('throws NotFoundException when the weapon does not exist', async () => {
      mockDb.update.mockReturnValue(createChainableMock([]));

      await expect(
        service.update(999, { name: 'Updated Sword' }),
      ).rejects.toThrow(new NotFoundException('Weapon with id 999 not found'));
    });
  });

  describe('remove', () => {
    it('deletes a weapon without error', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([mockWeaponRow]));

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when nothing is deleted', async () => {
      mockDb.delete.mockReturnValue(createChainableMock([]));

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Weapon with id 999 not found'),
      );
    });
  });
});
