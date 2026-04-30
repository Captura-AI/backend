// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLicenseTypesAndRefactorMomentLicenses1778025600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "license_types" (
        "id"            UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"    BIGINT,
        "created_by"    VARCHAR,
        "created_by_id" UUID,
        "updated_at"    BIGINT,
        "updated_by"    VARCHAR,
        "updated_by_id" UUID,
        "deleted_at"    BIGINT,
        "deleted_by"    VARCHAR,
        "deleted_by_id" UUID,
        "name"          VARCHAR(100)  NOT NULL,
        "description"   TEXT,
        "usage_rights"  TEXT,
        "is_active"     BOOLEAN       NOT NULL DEFAULT true,
        CONSTRAINT "PK_license_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_license_types_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`ALTER TABLE "moment_licenses" ADD COLUMN "license_type_id" UUID NULL`);

    await queryRunner.query(`
      ALTER TABLE "moment_licenses"
        ADD CONSTRAINT "FK_moment_licenses_license_type"
        FOREIGN KEY ("license_type_id")
        REFERENCES "license_types" ("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TABLE "moment_licenses" DROP COLUMN IF EXISTS "name"`);
    await queryRunner.query(`ALTER TABLE "moment_licenses" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "moment_licenses" DROP COLUMN IF EXISTS "usage_rights"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "moment_licenses" ADD COLUMN "name" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "moment_licenses" ADD COLUMN "description" TEXT`);
    await queryRunner.query(`ALTER TABLE "moment_licenses" ADD COLUMN "usage_rights" TEXT`);

    await queryRunner.query(
      `ALTER TABLE "moment_licenses" DROP CONSTRAINT IF EXISTS "FK_moment_licenses_license_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "moment_licenses" DROP COLUMN IF EXISTS "license_type_id"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "license_types"`);
  }
}
