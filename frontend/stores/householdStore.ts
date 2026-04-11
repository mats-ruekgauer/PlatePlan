import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface HouseholdState {
  activeHouseholdId: string | null;
  pendingInviteToken: string | null;
}

interface HouseholdActions {
  setActiveHouseholdId: (id: string | null) => void;
  setPendingInviteToken: (token: string | null) => void;
}

export const useHouseholdStore = create<HouseholdState & HouseholdActions>()(
  persist(
    (set) => ({
      activeHouseholdId: null,
      pendingInviteToken: null,
      setActiveHouseholdId: (activeHouseholdId) => set({ activeHouseholdId }),
      setPendingInviteToken: (pendingInviteToken) => set({ pendingInviteToken }),
    }),
    {
      name: 'plateplan-household',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
