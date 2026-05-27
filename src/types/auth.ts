export type LoginRequest = {
  email: string;
  password: string;
}

export type AuthResponse = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
  permHash: string;
  permissions: string[];
  isTempPassword: boolean;
};
