// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity('photographer_profiles')
export class PhotographerProfileEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to users.id' })
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  public userId!: string;

  @OneToOne(() => UsersEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  public user?: UsersEntity;

  @ApiProperty()
  @Column({ name: 'artist_name', type: 'varchar', length: 100 })
  public artistName!: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'bio', type: 'text', nullable: true })
  public bio!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'location', type: 'varchar', length: 100, nullable: true })
  public location!: string | null;

  @ApiProperty({ description: 'Unix timestamp when user became a photographer' })
  @Column({ name: 'joined_as_photographer_at', type: 'bigint' })
  public joinedAsPhotographerAt!: number;

  @ApiProperty({ default: true })
  @Column({ name: 'is_approved', type: 'boolean', default: true })
  public isApproved!: boolean;
}
