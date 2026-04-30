// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

// DTOs
import { BillingInfoDto } from './billing-info.dto';

// Enums
import { PaymentMethodEnum } from '../enums/payment-method.enum';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutRequestDto {
  @ApiProperty({ description: 'ID of the moment to purchase', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  public momentId!: string;

  @ApiProperty({
    description: 'ID of the MomentLicense (specific license with price)',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  public licenseId!: string;

  @ApiProperty({ enum: PaymentMethodEnum, example: PaymentMethodEnum.QRIS })
  @IsEnum(PaymentMethodEnum)
  @IsNotEmpty()
  public paymentMethod!: PaymentMethodEnum;

  @ApiProperty({ type: BillingInfoDto })
  @ValidateNested()
  @Type(() => BillingInfoDto)
  public billingInfo!: BillingInfoDto;

  @ApiPropertyOptional({ example: 'PROMO10', description: 'Optional promo/discount code' })
  @IsOptional()
  @IsString()
  public promoCode?: string;
}
