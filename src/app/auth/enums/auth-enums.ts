export enum SignInEnum {
  SUCCESS,
  FAIL,
  NEW_PASSWORD_REQUIRED,
  MFA_REQUIRED,
  TOTP_REQUIRED
}

export enum SignUpEnum {
  SUCCESS,
  FAIL,
}

export enum ForgotPasswordEnum {
  SUCCESS,
  FAIL,
  INPUT_VERIFICATION_CODE
}

export enum ConfirmPasswordEnum {
  SUCCESS,
  FAIL,
}

export enum ResetPasswordEnum {
  SUCCESS,
  FAIL,
}

export enum AuthenticateStateEnum {
  SIGN_IN,
  SIGN_UP,
  CONFIRM_SIGN_UP,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
}

export enum AuthenticateErrorEnum {
  USERNAME_EXISTS_EXCEPTION = "UsernameExistsException",
  USER_NOT_CONFIRMED_EXCEPTION = "UserNotConfirmedException",
  PASSWORD_RESET_REQUIRED_EXCEPTION = "PasswordResetRequiredException",
  CODE_MISMATCH_EXCEPTION = "CodeMismatchException",
  EXPIRED_CODE_EXCEPTION = "ExpiredCodeException",
  LIMIT_EXCEEDED_EXCEPTION = "LimitExceededException",
}