// Class Transformer
import { Exclude } from 'class-transformer';

// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity } from 'typeorm';

@Entity('users')
export class UsersEntity extends AppBaseEntity {
  @ApiProperty({ nullable: true })
  @Column({ name: 'username', type: 'varchar', length: 100, nullable: true })
  public username!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'email', type: 'varchar', length: 100, nullable: true, unique: true })
  public email!: string | null;

  @Exclude()
  @Column({ name: 'password', type: 'varchar', length: 100, nullable: true })
  public password!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true, unique: true })
  public phoneNumber!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'name', type: 'varchar', length: 100, nullable: true })
  public name!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'avatar', type: 'text', nullable: true })
  public avatar!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true, unique: true })
  public googleId!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'apple_id', type: 'varchar', length: 255, nullable: true, unique: true })
  public appleId!: string | null;

  @ApiProperty({ type: [String] })
  @Column({ name: 'providers', type: 'simple-array', nullable: true })
  public providers: string[] = [];

  @ApiProperty({ default: false })
  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  public isEmailVerified!: boolean;

  @ApiProperty({ default: false })
  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  public isPhoneVerified!: boolean;
}
