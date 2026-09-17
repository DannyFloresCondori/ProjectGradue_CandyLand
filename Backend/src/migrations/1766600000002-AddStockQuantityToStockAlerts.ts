import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockQuantityToStockAlerts1766600000002 implements MigrationInterface {
  name = 'AddStockQuantityToStockAlerts1766600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_alerts" ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_alerts" DROP COLUMN IF EXISTS "stock_quantity"',
    );
  }
}
