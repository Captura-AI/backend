// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the user-scoped `saved_moments` and `saved_searches` tables backing
 * the buyer's /account/saved and /account/saved-searches pages.
 */
export class CreateSavedTables1778632800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_moments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "moment_id" UUID NOT NULL,
        "created_at" BIGINT,
        "created_by" VARCHAR,
        "created_by_id" UUID,
        "updated_at" BIGINT,
        "updated_by" VARCHAR,
        "updated_by_id" UUID,
        "deleted_at" BIGINT,
        "deleted_by" VARCHAR,
        "deleted_by_id" UUID,
        CONSTRAINT "PK_saved_moments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_saved_moments_user_moment" UNIQUE ("user_id", "moment_id"),
        CONSTRAINT "FK_saved_moments_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_saved_moments_moment_id"
          FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_saved_moments_user_id"
      ON "saved_moments"("user_id")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_searches" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "label" VARCHAR(180) NOT NULL,
        "summary" TEXT,
        "query" TEXT,
        "filters" JSONB,
        "result_count" INT NOT NULL DEFAULT 0,
        "created_at" BIGINT,
        "created_by" VARCHAR,
        "created_by_id" UUID,
        "updated_at" BIGINT,
        "updated_by" VARCHAR,
        "updated_by_id" UUID,
        "deleted_at" BIGINT,
        "deleted_by" VARCHAR,
        "deleted_by_id" UUID,
        CONSTRAINT "PK_saved_searches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_searches_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_saved_searches_user_id"
      ON "saved_searches"("user_id")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_saved_searches_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_searches"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_saved_moments_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_moments"`);
  }
}
