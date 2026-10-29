import { ChallengeName, CognitoUserSession } from 'amazon-cognito-identity-js';
import { ConfirmPasswordEnum, ForgotPasswordEnum, ResetPasswordEnum, SignInEnum, SignUpEnum } from '../enums/auth-enums';
import { AccountType } from '../../core/enums/account-type.enum';

export interface ChallengeResult {
  challengeName: ChallengeName;
  challengeParameters: Record<string, string>;
}

export interface CognitoSignInResult {
  type: SignInEnum,
  result?: CognitoUserSession | ChallengeResult | Error;
}

export interface CognitoSignUpResult {
  type: SignUpEnum,
  result?: Error;

}

export interface CognitoForgotPasswordResult {
  type: ForgotPasswordEnum,
  result?: Error;
}

export interface CognitoResetPasswordResult {
  type: ResetPasswordEnum,
  result?: CognitoUserSession | ChallengeResult | Error;
}

export interface CognitoConfirmPasswordResult {
  type: ConfirmPasswordEnum,
  result?: string | Error;
}

export interface UserIdentifiers {
  tenant: string;
  sub: string;
  groups: string[];
  accountType?: AccountType;
}