export interface CreateUserDto {
  name: string;
  email: string;
  phoneNumber: string;
  is_active?: boolean;
  is_default_password?: boolean;
  OTP_number?: string;
  OTP_life_time?: string;
  last_login?: string;
  role_id: string;
}

export type Role = {
  id: string;
  name: string;
  description: string;
};