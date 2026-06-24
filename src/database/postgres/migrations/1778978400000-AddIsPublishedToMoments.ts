import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPublishedToMoments1778978400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "moments"
      ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "moments"
      DROP COLUMN IF EXISTS "is_published"
    `);
  }
}
