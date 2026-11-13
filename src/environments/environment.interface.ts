export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
}

export interface Environment {
  production: boolean;
  apiUrl?: string;
  cognito: CognitoConfig;
  tenant?: string;
  intercomAppId: string;
  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the app talks to the external integrations (Stripe, Sibill, HubSpot, Intercom, Mixpanel, Sentry). */
  integrationsEnabled: boolean;
}