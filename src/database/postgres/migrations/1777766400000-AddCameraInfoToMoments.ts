import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCameraInfoToMoments1777766400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "moments" ADD COLUMN "camera_info" VARCHAR(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "moments" DROP COLUMN "camera_info"`);
  }
}
