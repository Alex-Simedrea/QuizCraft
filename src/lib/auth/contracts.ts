export type AuthFieldErrors = Partial<
  Record<
    "firstName" | "lastName" | "email" | "password" | "confirmPassword",
    string[]
  >
>;

export type AuthSuccessResponse = {
  success: true;
  redirectTo: string;
};

export type AuthErrorResponse = {
  success: false;
  message: string;
  fieldErrors?: AuthFieldErrors;
};

export type AuthApiResponse = AuthSuccessResponse | AuthErrorResponse;
