import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsTable1778805600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id"                       UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"               BIGINT,
        "created_by"               VARCHAR,
        "created_by_id"            UUID,
        "updated_at"               BIGINT,
        "updated_by"               VARCHAR,
        "updated_by_id"            UUID,
        "deleted_at"               BIGINT,
        "deleted_by"               VARCHAR,
        "deleted_by_id"            UUID,
        "user_id"                  UUID          NOT NULL,
        "photographer_profile_id"  UUID          NOT NULL,
        "package_id"               UUID,
        "status"                   VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "proposed_date"            BIGINT        NOT NULL,
        "location"                 VARCHAR(200),
        "message"                  TEXT,
        "response_message"         TEXT,
        "counter_proposed_date"    BIGINT,
        "agreed_price"             DECIMAL(12,2),
        "currency"                 VARCHAR(10)   NOT NULL DEFAULT 'IDR',
        CONSTRAINT "pk_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_bookings_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_bookings_photographer_profile"
          FOREIGN KEY ("photographer_profile_id") REFERENCES "photographer_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_bookings_package"
          FOREIGN KEY ("package_id") REFERENCES "photographer_packages"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_user_id" ON "bookings" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_photographer_profile_id" ON "bookings" ("photographer_profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_photographer_profile_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
  }
}
