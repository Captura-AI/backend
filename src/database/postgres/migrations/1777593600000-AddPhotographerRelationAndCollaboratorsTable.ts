// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class AddPhotographerRelationAndCollaboratorsTable1777593600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Add FK constraint to moments.photographer_id ────────────────────────
    await queryRunner.createForeignKey(
      'moments',
      new TableForeignKey({
        name: 'fk_moments_photographer_id',
        columnNames: ['photographer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ─── 2. Create moment_collaborators junction table ───────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'moment_collaborators',
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
          // ─── Junction Fields ─────────────────────────────
          { name: 'moment_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid' },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'moment_collaborators',
      new TableUnique({
        name: 'uq_moment_collaborators_moment_user',
        columnNames: ['moment_id', 'user_id'],
      }),
    );

    await queryRunner.createIndex(
      'moment_collaborators',
      new TableIndex({
        name: 'idx_moment_collaborators_moment_id',
        columnNames: ['moment_id'],
      }),
    );

    await queryRunner.createIndex(
      'moment_collaborators',
      new TableIndex({
        name: 'idx_moment_collaborators_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'moment_collaborators',
      new TableForeignKey({
        name: 'fk_moment_collaborators_moment_id',
        columnNames: ['moment_id'],
        referencedTableName: 'moments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'moment_collaborators',
      new TableForeignKey({
        name: 'fk_moment_collaborators_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('moment_collaborators', 'fk_moment_collaborators_user_id');
    await queryRunner.dropForeignKey('moment_collaborators', 'fk_moment_collaborators_moment_id');
    await queryRunner.dropIndex('moment_collaborators', 'idx_moment_collaborators_user_id');
    await queryRunner.dropIndex('moment_collaborators', 'idx_moment_collaborators_moment_id');
    await queryRunner.dropUniqueConstraint(
      'moment_collaborators',
      'uq_moment_collaborators_moment_user',
    );
    await queryRunner.dropTable('moment_collaborators');
    await queryRunner.dropForeignKey('moments', 'fk_moments_photographer_id');
  }
}
