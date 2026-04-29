export {};

/**
 * @description Here's a way to extend the global interfaces.
 */
declare global {
  type TUserRole = 'admin' | 'photographer' | 'user';

  interface IRequestUser {
    email: string;
    id: string;
    phoneNumber?: string;
    role?: TUserRole;
    username: string;
  }

  interface IResultFilter<T = Record<string, unknown>> {
    data: T[];
    total: number;
    totalData: number;
  }

  interface IConstructBaseResponse<T> {
    data: T;
    message: string;
    statusCode: number;
  }

  interface IConstructPageMeta {
    page: number;
    size: number;
    total: number;
    totalData: number;
  }

  interface ICustomRequestHeaders extends Request {
    user: IRequestUser;
  }

  interface IValidateJWTStrategy {
    email: string;
    role?: TUserRole;
    sub: string;
    username: string;
  }
}
