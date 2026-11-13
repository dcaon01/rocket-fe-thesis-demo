import { CognitoUserStatusPipe } from './cognito-user-status.pipe';

describe('CognitoUserStatusPipe', () => {
  it('create an instance', () => {
    const pipe = new CognitoUserStatusPipe();
    expect(pipe).toBeTruthy();
  });
});
