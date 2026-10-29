import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  // apiUrl: '', // For local development
  apiUrl: 'https://gjlzfc82ba.execute-api.eu-north-1.amazonaws.com',
  cognito: {
    userPoolId: 'eu-north-1_BWAod3jF1',
    userPoolClientId: '686caffptra78ufdnjkgod6giq',
    region: 'eu-north-1'
  },
  intercomAppId: 'px632msh', // Test workspace of Intercom: dev chats stay out of the production metrics.
  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  integrationsEnabled: true
};
