// Decorators
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { CreateBookingDto } from '../dtos/create-booking.dto';
import { ListBookingsDto } from '../dtos/list-bookings.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';
import { ProposeTimeBookingDto } from '../dtos/propose-time-booking.dto';
import { RespondBookingDto } from '../dtos/respond-booking.dto';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { PhotographerRoleGuard } from '../../../common/guards/photographer-role.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

// Services
import { BookingsService } from '../services/bookings.service';

@Controller('bookings')
@ApiTags('Bookings')
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly _bookingsService: BookingsService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(AuthenticationJWTGuard)
  @ApiOperation({ summary: 'Create a booking request (buyer)' })
  public async create(@CurrentUser() user: IRequestUser, @Body() body: CreateBookingDto) {
    const result = await this._bookingsService.create(user.id, body);

    return { message: 'Booking created successfully', result };
  }

  @Get()
  @UseGuards(AuthenticationJWTGuard)
  @ApiOperation({
    summary: 'List my bookings — buyer sees their requests; photographer sees incoming',
  })
  public async findMyBookings(@CurrentUser() user: IRequestUser, @Query() query: ListBookingsDto) {
    const result = await this._bookingsService.findForUser(
      user.id,
      user.role as UserRoleEnum,
      query,
    );

    return { message: 'Bookings retrieved successfully', result };
  }

  @Get(':id')
  @UseGuards(AuthenticationJWTGuard)
  @ApiOperation({ summary: 'Get booking detail (booking must belong to caller)' })
  public async findOne(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._bookingsService.findOneById(
      params.id,
      user.id,
      user.role as UserRoleEnum,
    );

    return { message: 'Booking retrieved successfully', result };
  }

  @Patch(':id/accept')
  @UseGuards(PhotographerRoleGuard)
  @ApiOperation({ summary: 'Accept a booking (photographer only)' })
  public async accept(
    @CurrentUser() user: IRequestUser,
    @Param() params: ParamIdDto,
    @Body() body: RespondBookingDto,
  ) {
    const result = await this._bookingsService.accept(params.id, user.id, body);

    return { message: 'Booking accepted', result };
  }

  @Patch(':id/decline')
  @UseGuards(PhotographerRoleGuard)
  @ApiOperation({ summary: 'Decline a booking (photographer only)' })
  public async decline(
    @CurrentUser() user: IRequestUser,
    @Param() params: ParamIdDto,
    @Body() body: RespondBookingDto,
  ) {
    const result = await this._bookingsService.decline(params.id, user.id, body);

    return { message: 'Booking declined', result };
  }

  @Patch(':id/propose-time')
  @UseGuards(PhotographerRoleGuard)
  @ApiOperation({ summary: 'Propose an alternative time (photographer only)' })
  public async proposeTime(
    @CurrentUser() user: IRequestUser,
    @Param() params: ParamIdDto,
    @Body() body: ProposeTimeBookingDto,
  ) {
    const result = await this._bookingsService.proposeTime(params.id, user.id, body);

    return { message: 'Alternative time proposed', result };
  }

  @Patch(':id/cancel')
  @UseGuards(AuthenticationJWTGuard)
  @ApiOperation({ summary: 'Cancel a booking (buyer or photographer)' })
  public async cancel(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._bookingsService.cancel(
      params.id,
      user.id,
      user.role as UserRoleEnum,
    );

    return { message: 'Booking cancelled', result };
  }

  @Patch(':id/complete')
  @UseGuards(PhotographerRoleGuard)
  @ApiOperation({ summary: 'Mark booking as completed (photographer only)' })
  public async complete(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._bookingsService.complete(params.id, user.id);

    return { message: 'Booking completed', result };
  }
}
