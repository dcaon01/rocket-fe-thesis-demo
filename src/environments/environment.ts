import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  apiUrl: '',
  cognito: {
    userPoolId: '',
    userPoolClientId: '',
    region: ''
  },
  intercomAppId: '',
  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  integrationsEnabled: true
};
