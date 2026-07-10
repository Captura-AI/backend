// Enums
import { BookingStatusEnum } from '../enums/booking-status.enum';

// NestJS Libraries
import { BadRequestException } from '@nestjs/common';

// ─── Status Transition Map ────────────────────────────────────────────────────
// Defines which target status is reachable from each source status,
// keyed by action (accept / decline / propose-time / cancel / complete).
export const VALID_TRANSITIONS: Record<string, BookingStatusEnum[]> = {
  [BookingStatusEnum.PENDING]: [
    BookingStatusEnum.ACCEPTED,
    BookingStatusEnum.DECLINED,
    BookingStatusEnum.PENDING, // propose-time keeps status PENDING
    BookingStatusEnum.CANCELLED,
  ],
  [BookingStatusEnum.ACCEPTED]: [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED],
  [BookingStatusEnum.DECLINED]: [],
  [BookingStatusEnum.COMPLETED]: [],
  [BookingStatusEnum.CANCELLED]: [],
};

export function assertTransitionAllowed(from: BookingStatusEnum, to: BookingStatusEnum): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];

  if (!allowed.includes(to)) {
    throw new BadRequestException(`Cannot transition booking from '${from}' to '${to}'.`);
  }
}
