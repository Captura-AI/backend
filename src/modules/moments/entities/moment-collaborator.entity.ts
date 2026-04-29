// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { MomentEntity } from './moments.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('moment_collaborators')
export class MomentCollaboratorEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to moments.id' })
  @Column({ name: 'moment_id', type: 'uuid' })
  public momentId!: string;

  @ApiProperty({ description: 'FK to users.id' })
  @Column({ name: 'user_id', type: 'uuid' })
  public userId!: string;

  @ManyToOne(() => MomentEntity, (moment) => moment.collaborators, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'moment_id' })
  public moment?: MomentEntity;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  public user?: UsersEntity;
}
