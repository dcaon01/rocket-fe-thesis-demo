import { SyncStatePipe } from './sync-state.pipe';

describe('SyncStatePipe', () => {
  it('create an instance', () => {
    const pipe = new SyncStatePipe();
    expect(pipe).toBeTruthy();
  });
});
