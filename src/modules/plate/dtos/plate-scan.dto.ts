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

  @ApiPropertyOptional({ example: 'No plate text detected.' })
  public error!: string | null;
}
