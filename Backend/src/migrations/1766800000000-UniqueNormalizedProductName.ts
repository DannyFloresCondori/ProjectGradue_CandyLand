import { MigrationInterface, QueryRunner } from 'typeorm';

interface DuplicateProductName {
  normalized_name: string;
  products: { name: string; id: string }[];
}

export class UniqueNormalizedProductName1766800000000 implements MigrationInterface {
  name = 'UniqueNormalizedProductName1766800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await queryRunner.query(`
      SELECT
        LOWER(BTRIM("name")) AS normalized_name,
        JSON_AGG(JSON_BUILD_OBJECT('name', "name", 'id', "id"::text) ORDER BY "name", "id") AS products
      FROM "products"
      GROUP BY LOWER(BTRIM("name"))
      HAVING COUNT(*) > 1
      ORDER BY normalized_name
    `) as DuplicateProductName[];

    if (duplicates.length > 0) {
      const details = duplicates
        .map(({ normalized_name, products }) =>
          `${normalized_name}: ${products.map(({ name, id }) => `${name} (${id})`).join(', ')}`,
        )
        .join('; ');
      throw new Error(
        `No se puede crear el índice de nombres únicos de productos. Resuelva primero estos duplicados: ${details}`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_products_normalized_name"
      ON "products" (LOWER(BTRIM("name")))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_products_normalized_name"');
  }
}