import type { QueryRunner } from 'typeorm';
import { UniqueNormalizedProductName1766800000000 } from './1766800000000-UniqueNormalizedProductName';

describe('UniqueNormalizedProductName migration', () => {
  it('reports existing duplicate names and stops before creating the index', async () => {
    const queryRunner = {
      query: jest.fn().mockResolvedValue([{
        normalized_name: 'frappes',
        products: [
          { name: 'FRAPPES', id: 'product-1' },
          { name: 'Frappes', id: 'product-2' },
        ],
      }]),
    } as unknown as QueryRunner;
    const migration = new UniqueNormalizedProductName1766800000000();

    await expect(migration.up(queryRunner)).rejects.toThrow(
      'frappes: FRAPPES (product-1), Frappes (product-2)',
    );
    expect(queryRunner.query).toHaveBeenCalledTimes(1);
  });

  it('creates the unique index only after confirming there are no duplicates', async () => {
    const queryRunner = {
      query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(undefined),
    } as unknown as QueryRunner;
    const migration = new UniqueNormalizedProductName1766800000000();

    await migration.up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    expect(queryRunner.query.mock.calls[1][0]).toContain('CREATE UNIQUE INDEX');
  });
});