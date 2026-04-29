// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePhotographerProfilesTable1777507200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'photographer_profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          // ─── Audit Fields ───────────────────────────────
          { name: 'created_at', type: 'bigint', isNullable: true },
          { name: 'created_by', type: 'varchar', isNullable: true },
          { name: 'created_by_id', type: 'uuid', isNullable: true },
          { name: 'updated_at', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'varchar', isNullable: true },
          { name: 'updated_by_id', type: 'uuid', isNullable: true },
          { name: 'deleted_at', type: 'bigint', isNullable: true },
          { name: 'deleted_by', type: 'varchar', isNullable: true },
          { name: 'deleted_by_id', type: 'uuid', isNullable: true },
          // ─── Photographer Profile Fields ─────────────────
          { name: 'user_id', type: 'uuid', isUnique: true },
          { name: 'artist_name', type: 'varchar', length: '100' },
          { name: 'bio', type: 'text', isNullable: true },
          { name: 'location', type: 'varchar', length: '100', isNullable: true },
          { name: 'joined_as_photographer_at', type: 'bigint' },
          { name: 'is_approved', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'photographer_profiles',
      new TableIndex({
        name: 'idx_photographer_profiles_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'photographer_profiles',
      new TableIndex({
        name: 'idx_photographer_profiles_is_approved',
        columnNames: ['is_approved'],
      }),
    );

    await queryRunner.createForeignKey(
      'photographer_profiles',
      new TableForeignKey({
        name: 'fk_photographer_profiles_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('photographer_profiles', 'fk_photographer_profiles_user_id');
    await queryRunner.dropIndex('photographer_profiles', 'idx_photographer_profiles_is_approved');
    await queryRunner.dropIndex('photographer_profiles', 'idx_photographer_profiles_user_id');
    await queryRunner.dropTable('photographer_profiles');
  }
}
