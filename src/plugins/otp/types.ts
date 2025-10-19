export interface TBaseOtp {
  id: string;
  hashedOtp: string;
  createdAt: Date;
  attemptCount: number;
  isValid: boolean;
  purpose: string;
}
