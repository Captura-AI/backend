import type { BookingStatusEnum } from '../enums/booking-status.enum';

export interface IBookingPhotographerSummary {
  artistName: string;
  id: string;
  slug: string | null;
}

export interface IBookingPackageSummary {
  currency: string;
  duration: string;
  id: string;
  name: string;
  price: number;
}

export interface IBookingUserSummary {
  avatar: string | null;
  id: string;
  name: string;
}

export interface IBookingDetail {
  agreedPrice: number | null;
  counterProposedDate: number | null;
  createdAt: number;
  currency: string;
  id: string;
  location: string | null;
  message: string | null;
  package: IBookingPackageSummary | null;
  photographer: IBookingPhotographerSummary;
  proposedDate: number;
  responseMessage: string | null;
  status: BookingStatusEnum;
  updatedAt: number;
  user: IBookingUserSummary;
}
