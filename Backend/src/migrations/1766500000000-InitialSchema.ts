import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1766500000000 implements MigrationInterface {
    name = 'InitialSchema1766500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crea el esquema completo en una base de datos nueva. Si las tablas ya existen
        // (bases creadas antes de esta migración), no realiza cambios.
        if (await queryRunner.hasTable('users')) return;
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(25) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(20) NOT NULL, "description" character varying(150), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(20) NOT NULL, "email" character varying(255), "phone" character varying(20), "password" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "roleId" uuid, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."sales_payment_method_enum" AS ENUM('in_qr', 'in_efective'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."sales_status_enum" AS ENUM('delivered', 'canceled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."sales_type_enum" AS ENUM('local', 'delivery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "total" numeric(10,2) NOT NULL DEFAULT '0', "payment_method" "public"."sales_payment_method_enum" NOT NULL DEFAULT 'in_efective', "status" "public"."sales_status_enum" NOT NULL DEFAULT 'delivered', "type" "public"."sales_type_enum" NOT NULL DEFAULT 'local', "reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "order_id" uuid, "clientId" uuid, CONSTRAINT "REL_1631a193003bfc4297c61ba38b" UNIQUE ("order_id"), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_SALES_ORDER_ID" ON "sales" ("order_id") `);
        await queryRunner.query(`CREATE TABLE "clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(120) NOT NULL, "direction" character varying(155), "ci" character varying(20), "phone" character varying(15), "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5f9a41ade405c31d93dcbd6743e" UNIQUE ("ci"), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."orders_type_enum" AS ENUM('delivery', 'scheduled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'delivered', 'cancelled', 'preparing', 'ready'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."orders_type_enum" NOT NULL DEFAULT 'delivery', "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "delivery_address" text, "scheduled_at" TIMESTAMP, "delivery_date" TIMESTAMP, "programed" boolean NOT NULL DEFAULT false, "total" numeric(10,2) NOT NULL DEFAULT '0', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "clientId" uuid, "userId" uuid NOT NULL, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders_detail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "priceUnique" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "discountApplied" numeric(10,2) NOT NULL DEFAULT '0', "finalPrice" numeric(10,2) NOT NULL DEFAULT '0', "toppings" jsonb DEFAULT '[]', "order_date" TIMESTAMP NOT NULL DEFAULT now(), "productId" uuid, "orderId" uuid NOT NULL, CONSTRAINT "PK_893f1d90444c486c31023ff1d8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "toppings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(80) NOT NULL, "description" character varying(255), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_697602a95a94fabc76c83b85392" UNIQUE ("name"), CONSTRAINT "PK_6a1c9185d307454dfadc29f3019" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_toppings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid, "topping_id" uuid, CONSTRAINT "UQ_285fc5c652b7081e8719214c82a" UNIQUE ("product_id", "topping_id"), CONSTRAINT "PK_54cf4d4ce079438d2863f09fcaa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."promotions_type_enum" AS ENUM('discount', 'buy_one_get_one'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
        await queryRunner.query(`CREATE TABLE "promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "description" character varying(150), "type" "public"."promotions_type_enum" NOT NULL DEFAULT 'buy_one_get_one', "is_active" boolean NOT NULL DEFAULT true, "value" numeric(10,2) DEFAULT '0', "start_date" TIMESTAMP, "end_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c1860010d8ccb782e747f0947e8" UNIQUE ("name"), CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stock_alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "current_stock" integer NOT NULL DEFAULT '0', "minimum_stock" integer NOT NULL DEFAULT '0', "stock_quantity" integer NOT NULL DEFAULT '0', "quantity_increased" integer NOT NULL DEFAULT '0', "is_resolved" boolean NOT NULL DEFAULT false, "alert_message" character varying(150) NOT NULL, "alerted_at" TIMESTAMP NOT NULL DEFAULT now(), "stock_updated_at" TIMESTAMP, "resolved_at" TIMESTAMP, "productId" uuid, CONSTRAINT "PK_3c3bb550b3bf192460bffe3a55b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" character varying(255), "price" numeric(10,2) NOT NULL DEFAULT '0', "current_stock" integer NOT NULL DEFAULT '0', "minimum_stock" integer NOT NULL DEFAULT '0', "image" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "categoryId" uuid, "promotionId" uuid, CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sale_details" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "priceUnique" numeric(10,2) NOT NULL, "discountApplied" numeric(10,2) NOT NULL DEFAULT '0', "finalPrice" numeric(10,2) NOT NULL DEFAULT '0', "subtotal" numeric(10,2) NOT NULL, "toppings" jsonb DEFAULT '[]', "productId" uuid, "saleId" uuid, CONSTRAINT "PK_a8e8b6d243f38e3587378d401f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_52ff6cd9431cc7687c76f935938" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_1631a193003bfc4297c61ba38ba" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_c0ae0d7fce67f97394e3a250a33" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_1457f286d91f271313fded23e53" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders_detail" ADD CONSTRAINT "FK_ad9d5547c0ea6fc807e3954c5b2" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders_detail" ADD CONSTRAINT "FK_cd077a930dde58cfd231806a0bc" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_toppings" ADD CONSTRAINT "FK_b160ceab82be216433318ec11b1" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_toppings" ADD CONSTRAINT "FK_4f3b924df385561784db316689c" FOREIGN KEY ("topping_id") REFERENCES "toppings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_alerts" ADD CONSTRAINT "FK_36ed3d3e893b4e2c20d541be68b" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_5e39540b1cb0cac2f77e51fe69f" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_details" ADD CONSTRAINT "FK_3359bf44dc92a82a768f8f6bc37" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_details" ADD CONSTRAINT "FK_d7fef51a6c57924613bdb3980cd" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale_details" DROP CONSTRAINT "FK_d7fef51a6c57924613bdb3980cd"`);
        await queryRunner.query(`ALTER TABLE "sale_details" DROP CONSTRAINT "FK_3359bf44dc92a82a768f8f6bc37"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_5e39540b1cb0cac2f77e51fe69f"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "stock_alerts" DROP CONSTRAINT "FK_36ed3d3e893b4e2c20d541be68b"`);
        await queryRunner.query(`ALTER TABLE "product_toppings" DROP CONSTRAINT "FK_4f3b924df385561784db316689c"`);
        await queryRunner.query(`ALTER TABLE "product_toppings" DROP CONSTRAINT "FK_b160ceab82be216433318ec11b1"`);
        await queryRunner.query(`ALTER TABLE "orders_detail" DROP CONSTRAINT "FK_cd077a930dde58cfd231806a0bc"`);
        await queryRunner.query(`ALTER TABLE "orders_detail" DROP CONSTRAINT "FK_ad9d5547c0ea6fc807e3954c5b2"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_1457f286d91f271313fded23e53"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_c0ae0d7fce67f97394e3a250a33"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_1631a193003bfc4297c61ba38ba"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_52ff6cd9431cc7687c76f935938"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"`);
        await queryRunner.query(`DROP TABLE "sale_details"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "stock_alerts"`);
        await queryRunner.query(`DROP TABLE "promotions"`);
        await queryRunner.query(`DROP TYPE "public"."promotions_type_enum"`);
        await queryRunner.query(`DROP TABLE "product_toppings"`);
        await queryRunner.query(`DROP TABLE "toppings"`);
        await queryRunner.query(`DROP TABLE "orders_detail"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_type_enum"`);
        await queryRunner.query(`DROP TABLE "clients"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_SALES_ORDER_ID"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP TYPE "public"."sales_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sales_payment_method_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
