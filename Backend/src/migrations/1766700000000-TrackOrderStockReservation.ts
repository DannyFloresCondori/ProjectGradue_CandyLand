import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackOrderStockReservation1766700000000 implements MigrationInterface {
  name = 'TrackOrderStockReservation1766700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stock_reserved" BOOLEAN NOT NULL DEFAULT true',
    );
    await queryRunner.query(`
      UPDATE "products" AS product
      SET "current_stock" = product."current_stock" + scheduled.quantity
      FROM (
        SELECT detail."productId", SUM(detail."quantity")::integer AS quantity
        FROM "orders_detail" AS detail
        INNER JOIN "orders" AS order_record ON order_record."id" = detail."orderId"
        WHERE order_record."type" = 'scheduled'
          AND order_record."status" IN ('pending', 'preparing', 'ready')
        GROUP BY detail."productId"
      ) AS scheduled
      WHERE product."id" = scheduled."productId"
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "stock_reserved" = false
      WHERE ("type" = 'scheduled' AND "status" IN ('pending', 'preparing', 'ready'))
         OR "status" = 'cancelled'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "products" AS product
      SET "current_stock" = product."current_stock" - scheduled.quantity
      FROM (
        SELECT detail."productId", SUM(detail."quantity")::integer AS quantity
        FROM "orders_detail" AS detail
        INNER JOIN "orders" AS order_record ON order_record."id" = detail."orderId"
        WHERE order_record."type" = 'scheduled'
          AND order_record."status" IN ('pending', 'preparing', 'ready')
        GROUP BY detail."productId"
      ) AS scheduled
      WHERE product."id" = scheduled."productId"
    `);
    await queryRunner.query('ALTER TABLE "orders" DROP COLUMN IF EXISTS "stock_reserved"');
  }
}