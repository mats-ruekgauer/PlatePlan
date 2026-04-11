import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';

// Matches DEFAULT_PANTRY_STAPLES in onboardingStore — used for section header ordering
const PRESET_STAPLES = [
  'olive oil',
  'salt',
  'pepper',
  'garlic',
  'onion',
  'pasta',
  'rice',
  'canned tomatoes',
  'butter',
  'eggs',
  'flour',
  'sugar',
  'soy sauce',
  'honey',
  'stock cubes',
];

export default function StepPantry() {
  const store = useOnboardingStore();
  const [customInput, setCustomInput] = useState('');

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    store.addCustomPantryStaple(trimmed);
    setCustomInput('');
  }

  // Split into preset vs. user-added for display
  const presetItems = PRESET_STAPLES;
  const customItems = store.pantryStaples.filter((s) => !PRESET_STAPLES.includes(s));

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <OnboardingProgress currentStep={5} totalSteps={7} />

      <View className="gap-1">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Pantry staples</Text>
        <Text className="text-base text-[#6B7280]">
          Uncheck anything you don't have at home. We'll include these items implicitly — they won't appear on your shopping list.
        </Text>
      </View>

      {/* Preset staples checklist */}
      <View className="bg-white rounded-2xl overflow-hidden"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}
      >
        {presetItems.map((item, idx) => {
          const checked = store.pantryStaples.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => store.togglePantryStaple(item)}
              className={[
                'flex-row items-center px-4 py-3.5 gap-3',
                idx < presetItems.length - 1 ? 'border-b border-gray-100' : '',
              ].join(' ')}
            >
              {/* Checkbox */}
              <View
                className={[
                  'w-5 h-5 rounded border-2 items-center justify-center',
                  checked ? 'bg-[#2D6A4F] border-[#2D6A4F]' : 'border-gray-300',
                ].join(' ')}
              >
                {checked && <Text className="text-white text-xs font-bold">✓</Text>}
              </View>
              <Text
                className={`text-sm capitalize ${
                  checked ? 'text-[#1A1A2E]' : 'text-[#9CA3AF] line-through'
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom items */}
      {customItems.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-[#6B7280]">Added by you</Text>
          <View className="bg-white rounded-2xl overflow-hidden"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}
          >
            {customItems.map((item, idx) => {
              const checked = store.pantryStaples.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => store.togglePantryStaple(item)}
                  className={[
                    'flex-row items-center px-4 py-3.5 gap-3',
                    idx < customItems.length - 1 ? 'border-b border-gray-100' : '',
                  ].join(' ')}
                >
                  <View
                    className={[
                      'w-5 h-5 rounded border-2 items-center justify-center',
                      checked ? 'bg-[#2D6A4F] border-[#2D6A4F]' : 'border-gray-300',
                    ].join(' ')}
                  >
                    {checked && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                  <Text className={`text-sm flex-1 capitalize ${checked ? 'text-[#1A1A2E]' : 'text-[#9CA3AF] line-through'}`}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Add custom staple */}
      <View className="gap-2">
        <Text className="text-sm font-medium text-[#1A1A2E]">Add a staple</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
            placeholder="e.g. coconut milk"
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={addCustom}
            returnKeyType="done"
          />
          <Pressable
            onPress={addCustom}
            className="h-12 w-12 rounded-xl bg-[#2D6A4F] items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </Pressable>
        </View>
      </View>

      <Button
        label="Continue"
        onPress={() => router.push('/(onboarding)/step-shopping-days')}
      />
    </ScrollView>
  );
}
