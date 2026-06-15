import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlateSearchSupportToMoments1778112000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Trigram similarity powers the "close enough" plate matching.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Columns are also auto-created by synchronize in dev; IF NOT EXISTS keeps
    // this migration safe to run in either case (and authoritative in prod).
    await queryRunner.query(
      `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "motor_type" VARCHAR(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "color" VARCHAR(50) NULL`,
    );

    // GIN trigram index on the normalized plate (uppercased, non-alphanumerics
    // stripped) so fuzzy lookups stay fast. Must match the query-side expression.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_moments_plate_trgm"
         ON "moments"
         USING gin (regexp_replace(upper("license_plate"), '[^A-Z0-9]', '', 'g') gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_moments_plate_trgm"`);
    await queryRunner.query(`ALTER TABLE "moments" DROP COLUMN IF EXISTS "color"`);
    await queryRunner.query(`ALTER TABLE "moments" DROP COLUMN IF EXISTS "motor_type"`);
    // pg_trgm extension is left in place; it may be used by other objects.
  }
}
