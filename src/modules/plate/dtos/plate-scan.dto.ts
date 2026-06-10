import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlateScanResponseDto {
  @ApiProperty({ example: 'uploader-uuid' })
  public uploaderId!: string;

  @ApiProperty({ type: [String], example: ['B 1234 XYZ'] })
  public plates!: string[];

  @ApiPropertyOptional({ example: 0.87 })
  public confidence!: number | null;

  @ApiPropertyOptional({ description: 'Base64-encoded annotated JPEG (data URI)' })
  public annotatedImage!: string | null;

  @ApiPropertyOptional({ example: 'No plate text detected.' })
  public error!: string | null;
}
