import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockUpdatedAtToStockAlerts1766600000003 implements MigrationInterface {
  name = 'AddStockUpdatedAtToStockAlerts1766600000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_alerts" ADD COLUMN IF NOT EXISTS "stock_updated_at" TIMESTAMP NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "stock_alerts" DROP COLUMN IF EXISTS "stock_updated_at"',
    );
  }
}