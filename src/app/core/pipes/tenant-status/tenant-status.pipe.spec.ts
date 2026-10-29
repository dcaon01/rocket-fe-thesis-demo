import { TenantStatusPipe } from './tenant-status.pipe';

describe('TenantStatusPipe', () => {
  it('create an instance', () => {
    const pipe = new TenantStatusPipe();
    expect(pipe).toBeTruthy();
  });
});
