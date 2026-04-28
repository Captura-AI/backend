// Class Transformer
import { Exclude } from 'class-transformer';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, PrimaryGeneratedColumn, BeforeUpdate, BeforeInsert } from 'typeorm';

export abstract class AppBaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  /*
   * Create, Update and Delete Date Columns
   */
  @ApiProperty()
  @Column({
    name: 'created_at',
    type: 'bigint',
    readonly: true,
    nullable: true,
  })
  public createdAt!: number;

  @ApiProperty()
  @Column({
    name: 'created_by',
    type: 'varchar',
    nullable: true,
  })
  public createdBy!: string;

  @Column({
    name: 'created_by_id',
    type: 'uuid',
    nullable: true,
  })
  @Exclude()
  public createdById!: string;

  @ApiProperty()
  @Column({
    name: 'updated_at',
    type: 'bigint',
    nullable: true,
  })
  public updatedAt!: number;

  @ApiProperty()
  @Column({
    name: 'updated_by',
    type: 'varchar',
    nullable: true,
  })
  public updatedBy!: string;

  @Column({
    name: 'updated_by_id',
    type: 'uuid',
    nullable: true,
  })
  @Exclude()
  public updatedById!: string;

  @ApiProperty()
  @Column({
    name: 'deleted_at',
    type: 'bigint',
    nullable: true,
  })
  public deletedAt: number | null = null;

  @ApiProperty()
  @Column({
    name: 'deleted_by',
    type: 'varchar',
    nullable: true,
  })
  public deletedBy!: string;

  @Column({
    name: 'deleted_by_id',
    type: 'uuid',
    nullable: true,
  })
  @Exclude()
  public deletedById!: string;

  /**
   * Hooks
   */
  @BeforeInsert()
  public setCreatedAt(): void {
    this.createdAt = Math.floor(Date.now() / 1000);
    this.updatedAt = Math.floor(Date.now() / 1000);
  }

  @BeforeUpdate()
  public setUpdatedAt(): void {
    this.updatedAt = Math.floor(Date.now() / 1000);
  }
}
