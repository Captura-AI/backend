import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApprovalStatusToPhotographerProfiles1778892000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "photographer_profiles"
        ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(20) NOT NULL DEFAULT 'pending'
    `);

    // Backfill: existing approved photographers keep their approved status
    await queryRunner.query(`
      UPDATE "photographer_profiles"
        SET "approval_status" = 'approved'
        WHERE "is_approved" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "photographer_profiles" DROP COLUMN IF EXISTS "approval_status"`,
    );
  }
}
