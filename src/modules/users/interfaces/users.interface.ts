export type TAuthProvider = 'apple' | 'google' | 'magic-link' | 'phone';

export interface ICreatePhoneUser {
  isPhoneVerified: boolean;
  phoneNumber: string;
  providers: TAuthProvider[];
}

export interface IFindOrCreateSsoUser {
  appleId?: string;
  avatar?: string;
  email?: string;
  googleId?: string;
  isEmailVerified?: boolean;
  name?: string;
  provider: Extract<TAuthProvider, 'apple' | 'google'>;
  providerId: string;
}
