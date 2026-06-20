import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MotorDetectionDto {
  @ApiProperty({ example: 'Sport' })
  public motorType!: string;

  @ApiProperty({ example: 0.92 })
  public motorTypeConfidence!: number;

  @ApiPropertyOptional({ example: 'Hitam' })
  public color!: string | null;

  @ApiPropertyOptional({ example: 0.88 })
  public colorConfidence!: number | null;

  @ApiPropertyOptional({
    example: 'B 1234 XYZ',
    description: 'Plate read from this motorcycle, if any',
  })
  public plate!: string | null;

  @ApiPropertyOptional({ example: 0.87 })
  public plateConfidence!: number | null;
}

export class PlateScanResponseDto {
  @ApiProperty({ example: 'uploader-uuid' })
  public uploaderId!: string;

  @ApiProperty({ type: [String], example: ['B 1234 XYZ'] })
  public plates!: string[];

  @ApiPropertyOptional({ example: 0.87 })
  public confidence!: number | null;

  @ApiProperty({
    type: [MotorDetectionDto],
    description: 'Detected motorcycles with body style and color',
  })
  public motors!: MotorDetectionDto[];

  @ApiPropertyOptional({ description: 'Base64-encoded annotated JPEG (data URI)' })
  public annotatedImage!: string | null;

  @ApiPropertyOptional({
    description: 'Saved original photo filename — pass to /plate/confirm to discard',
  })
  public savedPhoto!: string | null;

  @ApiPropertyOptional({
    description: 'Saved annotated photo filename — pass to /plate/confirm to discard',
  })
  public savedResultPhoto!: string | null;

  @ApiPropertyOptional({ example: 'No plate text detected.' })
  public error!: string | null;
}
