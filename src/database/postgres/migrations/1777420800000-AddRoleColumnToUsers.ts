// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleColumnToUsers1777420800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM('admin', 'photographer', 'user')`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" "users_role_enum" NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
