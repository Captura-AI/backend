// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Interfaces
import type { IExplorerFilter } from '../interfaces/public-saved.interface';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

/**
 * A saved Explorer query: free-text plus the active filter chips, kept so the
 * buyer can rerun it later. `resultCount` is a snapshot captured at save time,
 * not a live count.
 */
@Entity('saved_searches')
export class SavedSearchEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to users.id (owner of the saved search)' })
  @Column({ name: 'user_id', type: 'uuid' })
  public userId!: string;

  @ManyToOne(() => UsersEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user?: UsersEntity;

  @ApiProperty()
  @Column({ name: 'label', type: 'varchar', length: 180 })
  public label!: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'summary', type: 'text', nullable: true })
  public summary!: string | null;

  @ApiProperty({ nullable: true, description: 'Free-text query string' })
  @Column({ name: 'query', type: 'text', nullable: true })
  public query!: string | null;

  @ApiProperty({ nullable: true, description: 'Active filter chips captured from Explorer' })
  @Column({ name: 'filters', type: 'jsonb', nullable: true })
  public filters!: IExplorerFilter[] | null;

  @ApiProperty({ description: 'Snapshot of the result count at save time' })
  @Column({ name: 'result_count', type: 'int', default: 0 })
  public resultCount!: number;
}
