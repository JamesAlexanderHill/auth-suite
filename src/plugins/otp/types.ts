export interface TBaseOtp {
  id: string;
  hashedOtp: string;
  salt: string;
  email: string;
  createdAt: Date;
  attemptCount: number;
  isValid: boolean;
  purpose: string;
}
