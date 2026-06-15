// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhotographerPublicDirectoryTables1778460000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "photographer_profiles"
      ADD COLUMN IF NOT EXISTS "slug" VARCHAR(140)
    `);

    await queryRunner.query(`
      UPDATE "photographer_profiles"
      SET "slug" = lower(regexp_replace(trim("artist_name"), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left("id"::text, 8)
      WHERE "slug" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "photographer_profiles"
      ALTER COLUMN "slug" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_photographer_profiles_slug"
      ON "photographer_profiles"("slug")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "photographer_packages" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "photographer_profile_id" UUID NOT NULL,
        "name" VARCHAR(120) NOT NULL,
        "price" DECIMAL(12,2) NOT NULL,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
        "duration" VARCHAR(80) NOT NULL,
        "description" TEXT,
        "includes" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" BIGINT,
        "created_by" VARCHAR,
        "created_by_id" UUID,
        "updated_at" BIGINT,
        "updated_by" VARCHAR,
        "updated_by_id" UUID,
        "deleted_at" BIGINT,
        "deleted_by" VARCHAR,
        "deleted_by_id" UUID,
        CONSTRAINT "PK_photographer_packages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_photographer_packages_profile_id"
          FOREIGN KEY ("photographer_profile_id") REFERENCES "photographer_profiles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_photographer_packages_profile_id"
      ON "photographer_packages"("photographer_profile_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_photographer_packages_active"
      ON "photographer_packages"("is_active")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "photographer_reviews" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "photographer_profile_id" UUID NOT NULL,
        "reviewer_user_id" UUID,
        "author_name" VARCHAR(120) NOT NULL,
        "context" VARCHAR(180),
        "rating" SMALLINT NOT NULL,
        "quote" TEXT NOT NULL,
        "is_published" BOOLEAN NOT NULL DEFAULT true,
        "created_at" BIGINT,
        "created_by" VARCHAR,
        "created_by_id" UUID,
        "updated_at" BIGINT,
        "updated_by" VARCHAR,
        "updated_by_id" UUID,
        "deleted_at" BIGINT,
        "deleted_by" VARCHAR,
        "deleted_by_id" UUID,
        CONSTRAINT "PK_photographer_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_photographer_reviews_profile_id"
          FOREIGN KEY ("photographer_profile_id") REFERENCES "photographer_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_photographer_reviews_user_id"
          FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_photographer_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_photographer_reviews_profile_id"
      ON "photographer_reviews"("photographer_profile_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_photographer_reviews_published"
      ON "photographer_reviews"("is_published")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_photographer_reviews_published"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_photographer_reviews_profile_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photographer_reviews"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_photographer_packages_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_photographer_packages_profile_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photographer_packages"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_photographer_profiles_slug"`);
    await queryRunner.query(`ALTER TABLE "photographer_profiles" DROP COLUMN IF EXISTS "slug"`);
  }
}
