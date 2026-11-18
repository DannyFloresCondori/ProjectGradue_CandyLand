import type { QueryRunner } from 'typeorm';
import { UniqueNormalizedCatalogNames1766900000000 } from './1766900000000-UniqueNormalizedCatalogNames';

describe('UniqueNormalizedCatalogNames migration', () => {
  it('reports all colliding records and creates no indexes when duplicates exist', async () => {
    const queryRunner = {
      query: jest.fn()
        .mockResolvedValueOnce([{
          normalized_name: 'frappes',
          records: [
            { name: 'FRAPPES', id: 'category-1' },
            { name: 'Frappes', id: 'category-2' },
          ],
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    } as unknown as QueryRunner;
    const migration = new UniqueNormalizedCatalogNames1766900000000();

    await expect(migration.up(queryRunner)).rejects.toThrow(
      'categorías / frappes: FRAPPES (category-1), Frappes (category-2)',
    );
    expect(queryRunner.query).toHaveBeenCalledTimes(3);
  });

  it('creates all unique indexes only after the preflight is clear', async () => {
    const queryRunner = {
      query: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
    } as unknown as QueryRunner;
    const migration = new UniqueNormalizedCatalogNames1766900000000();

    await migration.up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledTimes(6);
    expect(queryRunner.query.mock.calls.slice(3).map(([sql]) => sql))
      .toEqual(expect.arrayContaining([
        expect.stringContaining('IDX_categories_normalized_name'),
        expect.stringContaining('IDX_toppings_normalized_name'),
        expect.stringContaining('IDX_promotions_normalized_name'),
      ]));
  });
});