// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class CreateMomentsTable1777334400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "moments_vehicle_type_enum" AS ENUM('bicycle', 'bus', 'car', 'motorcycle', 'other', 'truck')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'moments',
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
          // ─── Media ──────────────────────────────────────
          { name: 'image_url', type: 'text', isNullable: true },
          { name: 'thumbnail_url', type: 'text', isNullable: true },
          // ─── Capture Info ────────────────────────────────
          { name: 'captured_at', type: 'bigint', isNullable: true },
          { name: 'caption', type: 'text', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          // ─── Location ────────────────────────────────────
          { name: 'city', type: 'varchar', length: '100', isNullable: true },
          { name: 'district', type: 'varchar', length: '100', isNullable: true },
          { name: 'latitude', type: 'decimal', precision: 10, scale: 8, isNullable: true },
          { name: 'longitude', type: 'decimal', precision: 11, scale: 8, isNullable: true },
          // ─── Photographer ────────────────────────────────
          { name: 'photographer_id', type: 'uuid', isNullable: true },
          // ─── Vehicle ─────────────────────────────────────
          {
            name: 'vehicle_type',
            type: 'enum',
            enum: ['bicycle', 'bus', 'car', 'motorcycle', 'other', 'truck'],
            enumName: 'moments_vehicle_type_enum',
            isNullable: true,
          },
          { name: 'license_plate', type: 'varchar', length: '20', isNullable: true },
          // ─── Metadata & AI Placeholders ──────────────────
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'ai_analysis', type: 'jsonb', isNullable: true },
          { name: 'embedding', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'moments',
      new TableIndex({ name: 'idx_moments_captured_at', columnNames: ['captured_at'] }),
    );

    await queryRunner.createIndex(
      'moments',
      new TableIndex({ name: 'idx_moments_city', columnNames: ['city'] }),
    );

    await queryRunner.createIndex(
      'moments',
      new TableIndex({ name: 'idx_moments_vehicle_type', columnNames: ['vehicle_type'] }),
    );

    await queryRunner.createIndex(
      'moments',
      new TableIndex({ name: 'idx_moments_photographer_id', columnNames: ['photographer_id'] }),
    );

    await queryRunner.createIndex(
      'moments',
      new TableIndex({ name: 'idx_moments_deleted_at', columnNames: ['deleted_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('moments', 'idx_moments_deleted_at');
    await queryRunner.dropIndex('moments', 'idx_moments_photographer_id');
    await queryRunner.dropIndex('moments', 'idx_moments_vehicle_type');
    await queryRunner.dropIndex('moments', 'idx_moments_city');
    await queryRunner.dropIndex('moments', 'idx_moments_captured_at');
    await queryRunner.dropTable('moments');
    await queryRunner.query(`DROP TYPE IF EXISTS "moments_vehicle_type_enum"`);
  }
}
