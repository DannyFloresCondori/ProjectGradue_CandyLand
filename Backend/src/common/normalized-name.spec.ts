import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ensureNameIsAvailable, saveWithUniqueNameConstraint } from './normalized-name';

describe('normalized name helpers', () => {
  const createRepository = (existing: { id: string } | null = null) => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(existing),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn(),
    };
    return { repository: repository as unknown as Repository<any>, queryBuilder };
  };

  it('uses a trimmed case-insensitive comparison and excludes an edited record', async () => {
    const { repository, queryBuilder } = createRepository();

    await ensureNameIsAvailable(repository, 'Frappes', 'duplicate', 'item-1');

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(BTRIM(record.name)) = LOWER(BTRIM(:name))',
      { name: 'Frappes' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'record.id != :excludeId',
      { excludeId: 'item-1' },
    );
  });

  it('returns the configured conflict when a name already exists', async () => {
    const { repository } = createRepository({ id: 'existing-id' });

    await expect(ensureNameIsAvailable(repository, 'FRAPPES', 'duplicate'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a PostgreSQL unique-index race to a conflict', async () => {
    const { repository } = createRepository();
    jest.spyOn(repository, 'save').mockRejectedValue({ driverError: { code: '23505' } });

    await expect(saveWithUniqueNameConstraint(repository, { name: 'Frappes' }, 'duplicate'))
      .rejects.toMatchObject({ message: 'duplicate', status: 409 });
  });
});