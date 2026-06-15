// Class Validators
import { IsEnum, IsOptional } from 'class-validator';

// DTOs
import { ListOptionDto } from '../../../common/dtos/list-options.dto';

// Enums
import { OrderStatusEnum } from '../enums/order-status.enum';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListOrdersDto extends ListOptionDto {
  @ApiPropertyOptional({ enum: OrderStatusEnum, description: 'Filter orders by status' })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  public status?: OrderStatusEnum;
}
