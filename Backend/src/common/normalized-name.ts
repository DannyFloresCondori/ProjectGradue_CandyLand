import { ConflictException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';

export async function ensureNameIsAvailable<T extends ObjectLiteral>(
  repository: Repository<T>,
  name: string,
  errorMessage: string,
  excludeId?: string,
): Promise<void> {
  const query = repository
    .createQueryBuilder('record')
    .select('record.id')
    .where('LOWER(BTRIM(record.name)) = LOWER(BTRIM(:name))', { name });

  if (excludeId) {
    query.andWhere('record.id != :excludeId', { excludeId });
  }

  if (await query.getOne()) {
    throw new ConflictException(errorMessage);
  }
}

export async function saveWithUniqueNameConstraint<T extends ObjectLiteral>(
  repository: Repository<T>,
  entity: T,
  errorMessage: string,
): Promise<T> {
  try {
    return await repository.save(entity);
  } catch (error) {
    const databaseError = error as { code?: string; driverError?: { code?: string } };
    if (databaseError.code === '23505' || databaseError.driverError?.code === '23505') {
      throw new ConflictException(errorMessage);
    }
    throw error;
  }
}