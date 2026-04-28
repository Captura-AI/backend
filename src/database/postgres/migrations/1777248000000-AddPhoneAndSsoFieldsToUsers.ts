// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneAndSsoFieldsToUsers1777248000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "email"    DROP NOT NULL,
        ALTER COLUMN "username" DROP NOT NULL,
        ALTER COLUMN "password" DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "phone_number"       VARCHAR(20)  UNIQUE DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "name"               VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "avatar"             TEXT         DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "google_id"          VARCHAR(255) UNIQUE DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "apple_id"           VARCHAR(255) UNIQUE DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "providers"          TEXT         DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "is_email_verified"  BOOLEAN      NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "is_phone_verified"  BOOLEAN      NOT NULL DEFAULT FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "phone_number",
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "avatar",
        DROP COLUMN IF EXISTS "google_id",
        DROP COLUMN IF EXISTS "apple_id",
        DROP COLUMN IF EXISTS "providers",
        DROP COLUMN IF EXISTS "is_email_verified",
        DROP COLUMN IF EXISTS "is_phone_verified";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "email"    SET NOT NULL,
        ALTER COLUMN "username" SET NOT NULL,
        ALTER COLUMN "password" SET NOT NULL;
    `);
  }
}
