import { sharedContracts } from './shared-contracts.js';

describe('sharedContracts', () => {
  it('should work', () => {
    expect(sharedContracts()).toEqual('shared-contracts');
  });
});
