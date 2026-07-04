import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, SQL } from 'drizzle-orm';
import { ApiSuccessResponseWithPagination } from 'src/common/interfaces/api-response.interface';
import { PaginationMeta } from 'src/common/interfaces/pagination-meta.interface';
import type { Database } from 'src/database/database-connection';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import { characters, charactersToWeapons, weapons } from 'src/database/schema';
import { CreateWeaponDto } from './dto/create-weapon.dto';
import { UpdateWeaponDto } from './dto/update-weapon.dto';
import { WeaponQueryDto } from './dto/weapon-query.dto';
import { WeaponDetailDto, WeaponListItemDto } from './dto/weapon-response.dto';

const SORT_COLUMN_MAP = {
  name: weapons.name,
  type: weapons.type,
  isArtifact: weapons.isArtifact,
};

@Injectable()
export class WeaponsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async create(dto: CreateWeaponDto): Promise<WeaponDetailDto> {
    const [weapon] = await this.db.insert(weapons).values(dto).returning();
    return this.findOne(weapon.id);
  }

  async findAll(
    query: WeaponQueryDto,
  ): Promise<ApiSuccessResponseWithPagination<WeaponListItemDto[]>> {
    const {
      page = 1,
      limit = 20,
      name,
      type,
      isArtifact,
      sortBy = 'name',
      order = 'asc',
    } = query;

    const conditions: SQL[] = [];
    if (name) conditions.push(ilike(weapons.name, `%${name}%`));
    if (type) conditions.push(ilike(weapons.type, `%${type}%`));
    if (isArtifact !== undefined) {
      conditions.push(eq(weapons.isArtifact, isArtifact));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMN_MAP[sortBy];
    const orderFn = order === 'desc' ? desc : asc;

    const dataQuery = this.db
      .select()
      .from(weapons)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = this.db
      .select({ total: count() })
      .from(weapons)
      .where(whereClause);

    const [rows, [{ total }]] = await Promise.all([dataQuery, countQuery]);

    const meta: PaginationMeta = {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    };

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        isArtifact: !!row.isArtifact,
      })),
      meta,
    };
  }

  async findOne(id: number): Promise<WeaponDetailDto> {
    const [weapon] = await this.db
      .select()
      .from(weapons)
      .where(eq(weapons.id, id))
      .limit(1);

    if (!weapon) {
      throw new NotFoundException(`Weapon with id ${id} not found`);
    }

    const wielders = await this.db
      .select({
        id: characters.id,
        name: characters.name,
      })
      .from(charactersToWeapons)
      .innerJoin(characters, eq(characters.id, charactersToWeapons.characterId))
      .where(eq(charactersToWeapons.weaponId, id));

    return {
      id: weapon.id,
      name: weapon.name,
      type: weapon.type,
      isArtifact: !!weapon.isArtifact,
      description: weapon.description,
      createdAt: weapon.createdAt,
      updatedAt: weapon.updatedAt,
      wielders,
    };
  }

  async update(id: number, dto: UpdateWeaponDto): Promise<WeaponDetailDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const [weapon] = await this.db
      .update(weapons)
      .set(dto)
      .where(eq(weapons.id, id))
      .returning();

    if (!weapon) {
      throw new NotFoundException(`Weapon with id ${id} not found`);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const [deleted] = await this.db
      .delete(weapons)
      .where(eq(weapons.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Weapon with id ${id} not found`);
    }
  }
}
