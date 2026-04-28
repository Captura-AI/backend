export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** @deprecated Use IAuthTokens instead */
export type ILogin = IAuthTokens;
