import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://iafj4t7450.execute-api.eu-north-1.amazonaws.com',
  cognito: {
    userPoolId: 'eu-north-1_nkoduSOYM',
    userPoolClientId: '3ek1c70r41h12266nvq0jd3f5r',
    region: 'eu-north-1'
  },
  intercomAppId: 'knnzg3li',
  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  integrationsEnabled: true
};
