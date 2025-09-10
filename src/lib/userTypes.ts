

export type UUID = string;

export interface CreateUserDto {
  name: string;
  email: string;
  phoneNumber: string;
  role_id: UUID;
  is_active?: boolean;
  is_default_password?: boolean;
  OTP_number?: string;
  OTP_life_time?: string;
  last_login?: string;
}


export type Role = {
  id: UUID;
  name: string;
  description: string;
};


export interface ApiMessage<T = unknown> {
  message: string;
  data?: T;
}


export interface CreateUserSuccess {
  userId: UUID;
}
