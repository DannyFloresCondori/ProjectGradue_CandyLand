import { MigrationInterface, QueryRunner } from 'typeorm';

interface DuplicateName {
  normalized_name: string;
  records: { id: string; name: string }[];
}

const catalogTables = [
  { table: 'categories', label: 'categorías', index: 'IDX_categories_normalized_name' },
  { table: 'toppings', label: 'toppings', index: 'IDX_toppings_normalized_name' },
  { table: 'promotions', label: 'promociones', index: 'IDX_promotions_normalized_name' },
] as const;

export class UniqueNormalizedCatalogNames1766900000000 implements MigrationInterface {
  name = 'UniqueNormalizedCatalogNames1766900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateGroups: string[] = [];

    for (const { table, label } of catalogTables) {
      const duplicates = await queryRunner.query(`
        SELECT
          LOWER(BTRIM("name")) AS normalized_name,
          JSON_AGG(JSON_BUILD_OBJECT('id', "id"::text, 'name', "name") ORDER BY "name", "id") AS records
        FROM "${table}"
        GROUP BY LOWER(BTRIM("name"))
        HAVING COUNT(*) > 1
        ORDER BY normalized_name
      `) as DuplicateName[];

      for (const { normalized_name, records } of duplicates) {
        duplicateGroups.push(
          `${label} / ${normalized_name}: ${records.map(({ name, id }) => `${name} (${id})`).join(', ')}`,
        );
      }
    }

    if (duplicateGroups.length > 0) {
      throw new Error(
        `No se pueden crear los índices de nombres únicos. Resuelva primero estos duplicados: ${duplicateGroups.join('; ')}`,
      );
    }

    for (const { table, index } of catalogTables) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX "${index}"
        ON "${table}" (LOWER(BTRIM("name")))
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { index } of [...catalogTables].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
    }
  }
}