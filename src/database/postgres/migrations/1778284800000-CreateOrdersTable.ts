// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1778284800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"             UUID,
        "moment_id"           UUID,
        "license_id"          UUID,
        "status"              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
        "subtotal_amount"     DECIMAL(10,2) NOT NULL DEFAULT 0,
        "service_fee"         DECIMAL(10,2) NOT NULL DEFAULT 0,
        "tax_amount"          DECIMAL(10,2) NOT NULL DEFAULT 0,
        "discount_amount"     DECIMAL(10,2) NOT NULL DEFAULT 0,
        "total_amount"        DECIMAL(10,2) NOT NULL DEFAULT 0,
        "currency"            VARCHAR(10)   NOT NULL DEFAULT 'IDR',
        "payment_method"      VARCHAR(50),
        "payment_gateway"     VARCHAR(20),
        "payment_token"       VARCHAR(500),
        "payment_reference"   VARCHAR(500),
        "payment_expired_at"  BIGINT,
        "download_token"      VARCHAR(500),
        "billing_info"        JSONB,
        "promo_code"          VARCHAR(100),
        "paid_at"             BIGINT,
        "cancelled_at"        BIGINT,
        "created_at"          BIGINT,
        "created_by"          VARCHAR,
        "created_by_id"       UUID,
        "updated_at"          BIGINT,
        "updated_by"          VARCHAR,
        "updated_by_id"       UUID,
        "deleted_at"          BIGINT,
        "deleted_by"          VARCHAR,
        "deleted_by_id"       UUID,
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_user_id"    FOREIGN KEY ("user_id")    REFERENCES "users"("id")            ON DELETE SET NULL,
        CONSTRAINT "FK_orders_moment_id"  FOREIGN KEY ("moment_id")  REFERENCES "moments"("id")          ON DELETE SET NULL,
        CONSTRAINT "FK_orders_license_id" FOREIGN KEY ("license_id") REFERENCES "moment_licenses"("id")  ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_id"   ON "orders"("user_id");
      CREATE INDEX IF NOT EXISTS "idx_orders_status"    ON "orders"("status");
      CREATE INDEX IF NOT EXISTS "idx_orders_moment_id" ON "orders"("moment_id");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_orders_download_token"
      ON "orders" ("download_token")
      WHERE "download_token" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id"           UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "order_id"     UUID          NOT NULL,
        "moment_id"    UUID,
        "license_id"   UUID,
        "quantity"     INT           NOT NULL DEFAULT 1,
        "unit_price"   DECIMAL(10,2) NOT NULL DEFAULT 0,
        "total_price"  DECIMAL(10,2) NOT NULL DEFAULT 0,
        "currency"     VARCHAR(10)   NOT NULL DEFAULT 'IDR',
        "created_at"   BIGINT,
        "created_by"   VARCHAR,
        "created_by_id" UUID,
        "updated_at"   BIGINT,
        "updated_by"   VARCHAR,
        "updated_by_id" UUID,
        "deleted_at"   BIGINT,
        "deleted_by"   VARCHAR,
        "deleted_by_id" UUID,
        CONSTRAINT "PK_order_items_id"            PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order_id"       FOREIGN KEY ("order_id")   REFERENCES "orders"("id")           ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_moment_id"      FOREIGN KEY ("moment_id")  REFERENCES "moments"("id")          ON DELETE SET NULL,
        CONSTRAINT "FK_order_items_license_id"     FOREIGN KEY ("license_id") REFERENCES "moment_licenses"("id")  ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items"("order_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_download_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_moment_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
  }
}
