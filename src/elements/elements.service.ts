import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, ne, SQL } from 'drizzle-orm';
import { ApiSuccessResponseWithPagination } from 'src/common/interfaces/api-response.interface';
import { PaginationMeta } from 'src/common/interfaces/pagination-meta.interface';
import { rethrowIfUniqueViolation } from 'src/common/utils/postgres-unique-violation.util';
import type { Database } from 'src/database/database-connection';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import {
  characters,
  charactersToElements,
  elements,
} from 'src/database/schema';
import { CreateElementDto } from './dto/create-element.dto';
import { ElementQueryDto } from './dto/element-query.dto';
import {
  ElementDetailDto,
  ElementListItemDto,
  ElementMasterListItemDto,
} from './dto/element-response.dto';
import { UpdateElementDto } from './dto/update-element.dto';

const SORT_COLUMN_MAP = {
  name: elements.name,
};

@Injectable()
export class ElementsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async create(dto: CreateElementDto): Promise<ElementDetailDto> {
    await this.assertNameAvailable(dto.name);

    try {
      const [element] = await this.db.insert(elements).values(dto).returning();
      return this.findOne(element.id);
    } catch (error) {
      rethrowIfUniqueViolation(
        error,
        `Element with name '${dto.name}' already exists`,
      );
    }
  }

  async findAll(
    query: ElementQueryDto,
  ): Promise<ApiSuccessResponseWithPagination<ElementListItemDto[]>> {
    const {
      page = 1,
      limit = 20,
      name,
      order = 'asc',
      sortBy = 'name',
    } = query;

    const conditions: SQL[] = [];
    if (name) conditions.push(ilike(elements.name, `%${name}%`));

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMN_MAP[sortBy];
    const orderFn = order === 'desc' ? desc : asc;

    const dataQuery = this.db
      .select()
      .from(elements)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = this.db
      .select({ total: count() })
      .from(elements)
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
      })),
      meta,
    };
  }

  async findOne(id: number): Promise<ElementDetailDto> {
    const [element] = await this.db
      .select()
      .from(elements)
      .where(eq(elements.id, id))
      .limit(1);

    if (!element) {
      throw new NotFoundException(`Element with id ${id} not found`);
    }

    const masterRows = await this.db
      .select({
        characterId: characters.id,
        characterName: characters.name,
        isActive: charactersToElements.isActive,
      })
      .from(charactersToElements)
      .innerJoin(
        characters,
        eq(characters.id, charactersToElements.characterId),
      )
      .where(eq(charactersToElements.elementId, id));

    const masters: ElementMasterListItemDto[] = masterRows.map((row) => ({
      id: row.characterId,
      name: row.characterName,
      isActive: row.isActive,
    }));

    return {
      id: element.id,
      name: element.name,
      description: element.description,
      createdAt: element.createdAt,
      updatedAt: element.updatedAt,
      masters,
    };
  }

  async update(id: number, dto: UpdateElementDto): Promise<ElementDetailDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, id);
    }

    try {
      const [element] = await this.db
        .update(elements)
        .set(dto)
        .where(eq(elements.id, id))
        .returning();

      if (!element) {
        throw new NotFoundException(`Element with id ${id} not found`);
      }

      return this.findOne(id);
    } catch (error) {
      if (dto.name !== undefined) {
        rethrowIfUniqueViolation(
          error,
          `Element with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const [deleted] = await this.db
      .delete(elements)
      .where(eq(elements.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Element with id ${id} not found`);
    }
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const conditions = [eq(elements.name, name)];
    if (excludeId !== undefined) {
      conditions.push(ne(elements.id, excludeId));
    }

    const [existing] = await this.db
      .select({ id: elements.id })
      .from(elements)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Element with name '${name}' already exists`);
    }
  }
}
