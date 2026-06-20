import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlateConfirmDto {
  @ApiProperty({ example: 'uploader-uuid' })
  @IsString()
  @IsNotEmpty()
  public uploaderId!: string;

  @ApiProperty({
    enum: ['save', 'discard'],
    example: 'save',
    description: "'save' keeps the scanned files, 'discard' deletes them and the DB records",
  })
  @IsIn(['save', 'discard'])
  public action!: 'save' | 'discard';

  @ApiPropertyOptional({
    description: "saved_photo filename returned by /plate/scan (used by 'discard')",
  })
  @IsOptional()
  @IsString()
  public savedPhotoFilename?: string;

  @ApiPropertyOptional({
    description: "saved_result_photo filename returned by /plate/scan (used by 'discard')",
  })
  @IsOptional()
  @IsString()
  public savedResultPhotoFilename?: string;
}

export class PlateConfirmResponseDto {
  @ApiProperty({ example: 'uploader-uuid' })
  public uploaderId!: string;

  @ApiProperty({ example: 'save' })
  public action!: string;

  @ApiProperty({ example: true })
  public success!: boolean;

  @ApiProperty({ example: 'Photo saved successfully.' })
  public message!: string;
}
