import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromotionStartDate1766600000000 implements MigrationInterface {
  name = 'AddPromotionStartDate1766600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP NULL',
    );
    await queryRunner.query(
      'UPDATE "promotions" SET "start_date" = "created_at" WHERE "start_date" IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "promotions" DROP COLUMN IF EXISTS "start_date"',
    );
  }
}
