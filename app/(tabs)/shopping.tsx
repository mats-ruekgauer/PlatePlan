import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ReceiptScanner } from '../../components/shopping/ReceiptScanner';
import { ShoppingList } from '../../components/shopping/ShoppingList';
import { ShoppingItemSkeleton } from '../../components/ui/Skeleton';
import {
  useGenerateShoppingList,
  useShoppingList,
  useToggleShoppingItem,
  useMarkListExported,
} from '../../hooks/useShoppingList';
import { useActivePlan } from '../../hooks/usePlan';
import type { GroupedShoppingList } from '../../types';

export default function ShoppingScreen() {
  const { data: plan } = useActivePlan();
  const planId = plan?.id;
  const [scannerVisible, setScannerVisible] = useState(false);

  const {
    data: list,
    isLoading,
    refetch,
    isRefetching,
  } = useShoppingList(planId);

  const generateList = useGenerateShoppingList();
  const toggleItem = useToggleShoppingItem();
  const markExported = useMarkListExported();

  // Build grouped structure from the flat items array using category field
  const grouped: GroupedShoppingList[] = React.useMemo(() => {
    if (!list?.items?.length) return [];

    // If the Edge Function already stored grouped data we'd read it directly,
    // but since we persist flat items, rebuild grouping client-side here.
    // Single shopping group when we can't determine shopping days from the list alone.
    const catMap = new Map<string, typeof list.items>();
    for (const item of list.items) {
      const cat = normaliseCat(item.category ?? 'other');
      const arr = catMap.get(cat) ?? [];
      arr.push(item);
      catMap.set(cat, arr);
    }

    const CAT_ORDER = ['Produce', 'Meat & Fish', 'Dairy', 'Pantry', 'Other'];
    const categories = Array.from(catMap.entries())
      .sort(([a], [b]) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b))
      .map(([category, items]) => ({ category, items }));

    return [
      {
        shoppingDate: list.shoppingDate ?? new Date().toISOString().split('T')[0],
        label: "This week's shop",
        categories,
      },
    ];
  }, [list]);

  const handleToggle = useCallback(
    (itemName: string, unit: string) => {
      if (!list?.id || !planId) return;
      toggleItem.mutate({ listId: list.id, planId, itemName, unit });
    },
    [list?.id, planId, toggleItem],
  );

  function handleExportToReminders() {
    if (!list?.items) return;
    const unchecked = list.items.filter((i) => !i.checked);
    if (unchecked.length === 0) {
      Alert.alert('All done!', 'All items are already checked off.');
      return;
    }
    // Apple Reminders deep-link — creates a new list import
    // x-apple-reminderkit:// is undocumented but widely used
    const titles = unchecked.map((i) => `${i.amount} ${i.unit} ${i.name}`).join('\n');
    const encoded = encodeURIComponent(titles);
    Linking.openURL(`x-apple-reminderkit://reminderslist?title=Groceries&body=${encoded}`).catch(
      () => Alert.alert('Could not open Reminders', 'Make sure the Reminders app is installed.'),
    );
    if (list.id && planId) markExported.mutate({ listId: list.id, planId });
  }

  function handleExportToNotes() {
    if (!list?.items) return;
    const unchecked = list.items.filter((i) => !i.checked);
    const lines = unchecked.map((i) => `- ${i.amount} ${i.unit} ${i.name}`).join('\n');
    const body = encodeURIComponent(`Shopping list\n\n${lines}`);
    Linking.openURL(`mobilenotes://new?body=${body}`).catch(() => {
      // Fallback: just copy to clipboard would need expo-clipboard — skip for MVP
      Alert.alert('Could not open Notes', 'Make sure the Notes app is installed.');
    });
    if (list?.id && planId) markExported.mutate({ listId: list.id, planId });
  }

  function handleGenerateList() {
    if (!planId) return;
    generateList.mutate(planId);
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-32 gap-5"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-[#1A1A2E]">Shopping</Text>
          <TouchableOpacity
            onPress={handleGenerateList}
            disabled={generateList.isPending || !planId}
            className="px-4 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70 disabled:opacity-40"
          >
            <Text className="text-sm font-semibold text-[#2D6A4F]">
              {generateList.isPending ? 'Refreshing…' : 'Refresh list'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Export actions */}
        {list && list.items.length > 0 && (
          <View className="flex-row gap-3">
            <ExportButton
              emoji="📋"
              label="Add to Reminders"
              onPress={handleExportToReminders}
            />
            <ExportButton
              emoji="📝"
              label="Export to Notes"
              onPress={handleExportToNotes}
            />
          </View>
        )}

        {/* List */}
        {isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShoppingItemSkeleton key={i} />
            ))}
          </View>
        ) : (
          <ShoppingList
            groups={grouped}
            listId={list?.id ?? ''}
            planId={planId ?? ''}
            onToggleItem={handleToggle}
          />
        )}
      </ScrollView>

      {/* Scan receipt FAB */}
      <TouchableOpacity
        onPress={() => setScannerVisible(true)}
        className="absolute bottom-8 right-5 w-14 h-14 rounded-full bg-[#2D6A4F] items-center justify-center"
        style={{
          shadowColor: '#2D6A4F',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }}
      >
        <Text className="text-2xl">📷</Text>
      </TouchableOpacity>

      {/* Receipt scanner full-screen modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerVisible(false)}
      >
        <ReceiptScanner
          onClose={() => setScannerVisible(false)}
          onSuccess={(items) => {
            setScannerVisible(false);
            if (items.length > 0) {
              Alert.alert(
                'Receipt saved',
                `${items.length} item${items.length !== 1 ? 's' : ''} added to your price history.`,
              );
            }
          }}
        />
      </Modal>
    </View>
  );
}

function ExportButton({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 flex-row items-center gap-2 bg-white rounded-xl px-3 py-3 active:opacity-70"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      }}
    >
      <Text className="text-lg">{emoji}</Text>
      <Text className="text-xs font-semibold text-[#1A1A2E] flex-1">{label}</Text>
    </TouchableOpacity>
  );
}

function normaliseCat(raw: string): string {
  const lower = raw.toLowerCase();
  if (['produce', 'vegetable', 'fruit'].includes(lower)) return 'Produce';
  if (['meat', 'fish', 'seafood', 'poultry'].includes(lower)) return 'Meat & Fish';
  if (['dairy', 'cheese', 'milk'].includes(lower)) return 'Dairy';
  if (['pantry', 'spice', 'condiment', 'grain'].includes(lower)) return 'Pantry';
  return 'Other';
}
