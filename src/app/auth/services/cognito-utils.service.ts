import { Injectable } from "@angular/core";
import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  ICognitoUserPoolData,
} from "amazon-cognito-identity-js";
import { catchError, from, map, Observable } from "rxjs";
import { UserIdentifiers } from "../interfaces/auth-interfaces";
import { environment } from "../../../environments/environment";
import { AccountType } from "../../core/enums/account-type.enum";

/**
 * Utility service that provides helper methods for AWS Cognito operations.
 * Handles user pool initialization, session management, and token decoding.
 */
@Injectable({
  providedIn: "root",
})
export class CognitoUtilsService {
  /**
   * Creates and returns a Cognito User Pool instance using environment configuration.
   * @returns Configured CognitoUserPool instance
   */
  getUserPool(): CognitoUserPool {
    const userPoolData: ICognitoUserPoolData = {
      UserPoolId: environment.cognito.userPoolId,
      ClientId: environment.cognito.userPoolClientId,
    };
    return new CognitoUserPool(userPoolData);
  }

  /**
   * Retrieves the currently authenticated Cognito user from the user pool.
   * @returns CognitoUser instance if a user is authenticated, null otherwise
   */
  getCurrentUser(): CognitoUser | null {
    return this.getUserPool().getCurrentUser();
  }

  /**
   * Retrieves the current user's session from Cognito.
   * Validates the session and returns it if valid.
   * @returns Promise that resolves with CognitoUserSession if valid, null if no user is authenticated
   */
  async getSession(): Promise<CognitoUserSession | null> {
    const cognitoUser = this.getCurrentUser();
    if (!cognitoUser) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      cognitoUser.getSession(
        (error: Error | null, session: CognitoUserSession | null) => {
          if (error) {
            reject(error);
          } else {
            resolve(session);
          }
        },
      );
    });
  }

  /**
   * Extracts and decodes user identifiers from the Cognito access token.
   * Retrieves custom tenant attribute, user sub (subject), and Cognito groups from the JWT payload.
   * @returns Observable that emits UserIdentifiers containing tenant, sub, and groups
   * @throws Error if session is null or token decoding fails
   */
  getUserIdentifiers(): Observable<UserIdentifiers> {
    return from(this.getSession()).pipe(
      map((session) => {
        if (!session) {
          throw new Error("CognitoUserSession null");
        }
        const authToken = session.getAccessToken().decodePayload();

        const payload = authToken as {
          "custom:tenant"?: string;
          sub: string;
          "cognito:groups"?: string[];
        };
        const tenant = payload["custom:tenant"];
        const { sub } = payload;
        const groups = payload["cognito:groups"] ?? [];

        return {
          tenant: tenant ?? "",
          sub,
          groups,
          // Default to Collaborator so legacy users without an account-type group keep working
          accountType: groups.includes(AccountType.Reseller) ? AccountType.Reseller : AccountType.Collaborator,
        };
      }),
      catchError((error) => {
        console.info("Error while retrieving the session:", error);
        throw error;
      }),
    );
  }
}