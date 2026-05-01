// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgvectorEmbeddingToMoments1778371200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension (requires PostgreSQL pgvector extension to be installed)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Add 512-dimensional vector column for CLIP ViT-B/32 embeddings
    await queryRunner.query(`
      ALTER TABLE "moments"
      ADD COLUMN IF NOT EXISTS "embedding_vector" vector(512)
    `);

    // IVFFlat index for approximate nearest-neighbour cosine similarity search
    // lists=100 is a good default for up to ~1M rows; tune as the dataset grows
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_moments_embedding_vector"
      ON "moments"
      USING ivfflat ("embedding_vector" vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_moments_embedding_vector"`);
    await queryRunner.query(`ALTER TABLE "moments" DROP COLUMN IF EXISTS "embedding_vector"`);
  }
}
