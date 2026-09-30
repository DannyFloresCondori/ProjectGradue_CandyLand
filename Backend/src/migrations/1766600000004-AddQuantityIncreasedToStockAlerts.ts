import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuantityIncreasedToStockAlerts1766600000004 implements MigrationInterface {
  name = 'AddQuantityIncreasedToStockAlerts1766600000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_alerts" ADD COLUMN IF NOT EXISTS "quantity_increased" INTEGER NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_alerts" DROP COLUMN IF EXISTS "quantity_increased"',
    );
  }
}