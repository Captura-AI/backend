// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity } from 'typeorm';

@Entity('license_types')
export class LicenseTypeEntity extends AppBaseEntity {
  // ─── Identity ────────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Platform-wide license type name',
    example: 'Editorial',
    maxLength: 100,
  })
  @Column({ name: 'name', type: 'varchar', length: 100, unique: true })
  public name!: string;

  @ApiProperty({ nullable: true, example: 'For non-commercial editorial use only' })
  @Column({ name: 'description', type: 'text', nullable: true })
  public description!: string | null;

  @ApiProperty({ nullable: true, example: 'Credit required. Non-commercial use only.' })
  @Column({ name: 'usage_rights', type: 'text', nullable: true })
  public usageRights!: string | null;

  @ApiProperty({ default: true, description: 'Admin can deactivate to hide from photographers' })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  public isActive!: boolean;
}
