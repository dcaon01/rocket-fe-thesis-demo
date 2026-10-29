// Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  // API and Cognito of the AWS account that hosts the demo.
  apiUrl: 'https://az6062f6ii.execute-api.eu-west-1.amazonaws.com',
  cognito: {
    userPoolId: 'eu-west-1_TwIyx3UUt',
    userPoolClientId: '1vtv0hun14r7qihi86fg77va9q',
    region: 'eu-west-1'
  },
  intercomAppId: '',
  integrationsEnabled: false
};
