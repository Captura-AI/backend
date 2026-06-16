// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity } from 'typeorm';

/**
 * A curated geographic area where photographers are active. Editorial content
 * (title, meta, description, hero image, best-time guidance) lives on the row;
 * the live activity stats shown to users are aggregated from real `moments` at
 * read time — see `HotspotsService`.
 */
@Entity('hotspots')
export class HotspotEntity extends AppBaseEntity {
  @ApiProperty({ description: 'URL-friendly public identifier used for routing' })
  @Column({ name: 'slug', type: 'varchar', length: 140, unique: true })
  public slug!: string;

  @ApiProperty()
  @Column({ name: 'name', type: 'varchar', length: 140 })
  public name!: string;

  @ApiProperty({ description: 'Display region label, e.g. "Jawa Barat"' })
  @Column({ name: 'region', type: 'varchar', length: 100 })
  public region!: string;

  @ApiProperty({ description: 'ISO-ish region code used by the map view' })
  @Column({ name: 'region_code', type: 'varchar', length: 10, default: 'ID' })
  public regionCode!: string;

  @ApiProperty()
  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8 })
  public latitude!: number;

  @ApiProperty()
  @Column({ name: 'longitude', type: 'decimal', precision: 11, scale: 8 })
  public longitude!: number;

  @ApiProperty({ description: 'Editorial headline (may contain inline <em>)' })
  @Column({ name: 'title', type: 'text' })
  public title!: string;

  @ApiProperty({ description: 'Editorial one-line description of the area' })
  @Column({ name: 'meta', type: 'text' })
  public meta!: string;

  @ApiProperty({ description: 'Editorial long-form description for the detail page' })
  @Column({ name: 'description', type: 'text' })
  public description!: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'hero_image_url', type: 'text', nullable: true })
  public heroImageUrl!: string | null;

  @ApiProperty({ description: 'Human label for the best shooting window, e.g. "Golden hour"' })
  @Column({ name: 'best_time_label', type: 'varchar', length: 80 })
  public bestTimeLabel!: string;

  @ApiProperty({ description: 'Best shooting window, e.g. "17:00 – 18:30"' })
  @Column({ name: 'best_time_window', type: 'varchar', length: 80 })
  public bestTimeWindow!: string;

  @ApiProperty({ isArray: true, type: String, description: 'Curated popular tags for the area' })
  @Column({ name: 'popular_tags', type: 'simple-array', nullable: true })
  public popularTags!: string[] | null;

  @ApiProperty({
    isArray: true,
    type: String,
    description: 'Normalized city/district keywords used to match real moments to this area',
  })
  @Column({ name: 'area_keywords', type: 'simple-array', nullable: true })
  public areaKeywords!: string[] | null;

  @ApiProperty({ description: 'Sort order on the map and listing' })
  @Column({ name: 'display_order', type: 'int', default: 0 })
  public displayOrder!: number;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  public isActive!: boolean;

  @ApiProperty({ default: false, description: 'Marks the hotspot focused by default on the map' })
  @Column({ name: 'is_default', type: 'boolean', default: false })
  public isDefault!: boolean;
}
