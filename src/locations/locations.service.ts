import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, exists, ilike, SQL } from 'drizzle-orm';
import { ApiSuccessResponseWithPagination } from 'src/common/interfaces/api-response.interface';
import { PaginationMeta } from 'src/common/interfaces/pagination-meta.interface';
import type { Database } from 'src/database/database-connection';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import {
  locations,
  locationsToSeasons,
  realms,
  seasons,
} from 'src/database/schema';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import {
  LocationDetailDto,
  LocationListItemDto,
} from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

const SORT_COLUMN_MAP = {
  name: locations.name,
};

@Injectable()
export class LocationsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async create(dto: CreateLocationDto): Promise<LocationDetailDto> {
    if (dto.realmId != null) {
      await this.assertRealmExists(dto.realmId);
    }

    const [location] = await this.db.insert(locations).values(dto).returning();
    return this.findOne(location.id);
  }

  async findAll(
    query: LocationQueryDto,
  ): Promise<ApiSuccessResponseWithPagination<LocationListItemDto[]>> {
    const {
      page = 1,
      limit = 20,
      name,
      order = 'asc',
      sortBy = 'name',
      realmId,
      seasonId,
    } = query;

    const conditions: SQL[] = [];
    if (name) conditions.push(ilike(locations.name, `%${name}%`));
    if (realmId !== undefined) {
      conditions.push(eq(locations.realmId, realmId));
    }
    if (seasonId !== undefined) {
      conditions.push(
        exists(
          this.db
            .select({ id: locationsToSeasons.locationId })
            .from(locationsToSeasons)
            .where(
              and(
                eq(locationsToSeasons.locationId, locations.id),
                eq(locationsToSeasons.seasonId, seasonId),
              ),
            ),
        ),
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMN_MAP[sortBy as keyof typeof SORT_COLUMN_MAP];
    const orderFn = order === 'desc' ? desc : asc;

    const dataQuery = this.db
      .select()
      .from(locations)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = this.db
      .select({ total: count() })
      .from(locations)
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
        realmId: row.realmId,
        description: row.description,
      })),
      meta,
    };
  }

  async findOne(id: number): Promise<LocationDetailDto> {
    const [location] = await this.db
      .select({
        id: locations.id,
        name: locations.name,
        realmId: locations.realmId,
        description: locations.description,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
        realmName: realms.name,
      })
      .from(locations)
      .leftJoin(realms, eq(realms.id, locations.realmId))
      .where(eq(locations.id, id))
      .limit(1);

    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }

    const seasonRows = await this.db
      .select({
        id: seasons.id,
        number: seasons.number,
        title: seasons.title,
      })
      .from(locationsToSeasons)
      .innerJoin(seasons, eq(seasons.id, locationsToSeasons.seasonId))
      .where(eq(locationsToSeasons.locationId, id));

    return {
      id: location.id,
      name: location.name,
      realmId: location.realmId,
      description: location.description,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      realm:
        location.realmId && location.realmName
          ? { id: location.realmId, name: location.realmName }
          : null,
      seasons: seasonRows,
    };
  }

  async update(id: number, dto: UpdateLocationDto): Promise<LocationDetailDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (dto.realmId != null) {
      await this.assertRealmExists(dto.realmId);
    }

    const [location] = await this.db
      .update(locations)
      .set(dto)
      .where(eq(locations.id, id))
      .returning();

    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const [deleted] = await this.db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }
  }

  private async assertRealmExists(realmId: number): Promise<void> {
    const [realm] = await this.db
      .select({ id: realms.id })
      .from(realms)
      .where(eq(realms.id, realmId))
      .limit(1);

    if (!realm) {
      throw new BadRequestException(`Realm with id ${realmId} not found`);
    }
  }
}
