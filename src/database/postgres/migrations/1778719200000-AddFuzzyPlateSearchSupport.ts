import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFuzzyPlateSearchSupport1778719200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS fuzzystrmatch`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_moments_plate_canonical_trgm"
      ON "moments"
      USING gin (
        translate(
          regexp_replace(upper("license_plate"), '[^A-Z0-9]', '', 'g'),
          'OQIBSZG',
          '0018526'
        ) gin_trgm_ops
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_moments_plate_canonical_trgm"`);
  }
}
