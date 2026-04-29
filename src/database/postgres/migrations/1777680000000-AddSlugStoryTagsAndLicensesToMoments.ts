// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddSlugStoryTagsAndLicensesToMoments1777680000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Add new columns to moments ──────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE moments
        ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS story TEXT,
        ADD COLUMN IF NOT EXISTS tags TEXT,
        ADD COLUMN IF NOT EXISTS photographer_profile_id UUID
    `);

    await queryRunner.createIndex(
      'moments',
      new TableIndex({
        name: 'idx_moments_slug',
        columnNames: ['slug'],
        isUnique: true,
        where: 'slug IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'moments',
      new TableIndex({
        name: 'idx_moments_photographer_profile_id',
        columnNames: ['photographer_profile_id'],
      }),
    );

    // ─── 2. Backfill photographer_profile_id from existing photographer_id ───────
    await queryRunner.query(`
      UPDATE moments m
      SET photographer_profile_id = pp.id
      FROM photographer_profiles pp
      WHERE pp.user_id = m.photographer_id
        AND m.photographer_id IS NOT NULL
    `);

    // ─── 3. Add FK constraint for photographer_profile_id ────────────────────────
    await queryRunner.createForeignKey(
      'moments',
      new TableForeignKey({
        name: 'fk_moments_photographer_profile_id',
        columnNames: ['photographer_profile_id'],
        referencedTableName: 'photographer_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ─── 4. Create moment_licenses table ─────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'moment_licenses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          // ─── Audit Fields ───────────────────────────────────────
          { name: 'created_at', type: 'bigint', isNullable: true },
          { name: 'created_by', type: 'varchar', isNullable: true },
          { name: 'created_by_id', type: 'uuid', isNullable: true },
          { name: 'updated_at', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'varchar', isNullable: true },
          { name: 'updated_by_id', type: 'uuid', isNullable: true },
          { name: 'deleted_at', type: 'bigint', isNullable: true },
          { name: 'deleted_by', type: 'varchar', isNullable: true },
          { name: 'deleted_by_id', type: 'uuid', isNullable: true },
          // ─── License Fields ─────────────────────────────────────
          { name: 'moment_id', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'price', type: 'decimal', precision: 10, scale: 2 },
          { name: 'currency', type: 'varchar', length: '10', default: "'USD'" },
          { name: 'usage_rights', type: 'text', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'moment_licenses',
      new TableIndex({
        name: 'idx_moment_licenses_moment_id',
        columnNames: ['moment_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'moment_licenses',
      new TableForeignKey({
        name: 'fk_moment_licenses_moment_id',
        columnNames: ['moment_id'],
        referencedTableName: 'moments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('moment_licenses', 'fk_moment_licenses_moment_id');
    await queryRunner.dropIndex('moment_licenses', 'idx_moment_licenses_moment_id');
    await queryRunner.dropTable('moment_licenses');

    await queryRunner.dropForeignKey('moments', 'fk_moments_photographer_profile_id');
    await queryRunner.dropIndex('moments', 'idx_moments_photographer_profile_id');
    await queryRunner.dropIndex('moments', 'idx_moments_slug');

    await queryRunner.query(`
      ALTER TABLE moments
        DROP COLUMN IF EXISTS photographer_profile_id,
        DROP COLUMN IF EXISTS tags,
        DROP COLUMN IF EXISTS story,
        DROP COLUMN IF EXISTS slug
    `);
  }
}
