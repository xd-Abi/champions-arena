interface AuthenticatedUser {
  jwt: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
