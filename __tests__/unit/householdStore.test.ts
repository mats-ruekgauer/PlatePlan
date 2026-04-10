jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

import { useHouseholdStore } from '../../stores/householdStore';

function getStore() {
  return useHouseholdStore.getState();
}

describe('householdStore', () => {
  beforeEach(() => {
    useHouseholdStore.setState({
      activeHouseholdId: null,
      pendingInviteToken: null,
    });
  });

  it('starts with null activeHouseholdId', () => {
    expect(getStore().activeHouseholdId).toBeNull();
  });

  it('starts with null pendingInviteToken', () => {
    expect(getStore().pendingInviteToken).toBeNull();
  });

  it('setActiveHouseholdId updates the id', () => {
    getStore().setActiveHouseholdId('hh-123');
    expect(getStore().activeHouseholdId).toBe('hh-123');
  });

  it('setPendingInviteToken stores the token', () => {
    getStore().setPendingInviteToken('tok-abc');
    expect(getStore().pendingInviteToken).toBe('tok-abc');
  });

  it('setPendingInviteToken can clear the token', () => {
    getStore().setPendingInviteToken('tok-abc');
    getStore().setPendingInviteToken(null);
    expect(getStore().pendingInviteToken).toBeNull();
  });
});
