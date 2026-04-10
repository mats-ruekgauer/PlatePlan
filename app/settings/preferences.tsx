import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, GestureResponderEvent, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { useOnboardingStore } from '../../stores/onboardingStore';
import type { DietaryRestriction } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIETARY_OPTIONS: { label: string; value: DietaryRestriction; emoji: string }[] = [
  { label: 'Vegetarian', value: 'vegetarian', emoji: '🥦' },
  { label: 'Vegan', value: 'vegan', emoji: '🌱' },
  { label: 'Gluten-free', value: 'gluten_free', emoji: '🌾' },
  { label: 'Lactose-free', value: 'lactose_free', emoji: '🥛' },
  { label: 'Nut-free', value: 'nut_free', emoji: '🥜' },
  { label: 'Halal', value: 'halal', emoji: '☪️' },
  { label: 'Kosher', value: 'kosher', emoji: '✡️' },
];

const CUISINE_OPTIONS = [
  { label: 'Italian', emoji: '🍝' },
  { label: 'Asian', emoji: '🍜' },
  { label: 'Mediterranean', emoji: '🫒' },
  { label: 'Mexican', emoji: '🌮' },
  { label: 'German', emoji: '🥨' },
  { label: 'Middle Eastern', emoji: '🧆' },
  { label: 'American', emoji: '🍔' },
];

const COOK_FROM_SCRATCH_EMOJIS = ['🧊', '🥡', '🍳', '👨‍🍳', '🔥'];
const COOK_FROM_SCRATCH_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F97316', '#EF4444'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditPreferences() {
  const { t } = useI18n();
  const store = useOnboardingStore();
  const [likedInput, setLikedInput] = useState('');
  const [dislikedInput, setDislikedInput] = useState('');
  const [saving, setSaving] = useState(false);
  const scratchLabels = [
    t('settings.scratch.1'),
    t('settings.scratch.2'),
    t('settings.scratch.3'),
    t('settings.scratch.4'),
    t('settings.scratch.5'),
  ];

  // Load current preferences from DB on mount and populate store
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      const row = data as {
        dietary_restrictions?: DietaryRestriction[];
        liked_ingredients?: string[];
        disliked_ingredients?: string[];
        liked_cuisines?: string[];
        seasonality_importance?: number;
        cook_from_scratch_preference?: number;
      } | null;

      if (!row) return;

      // Populate store fields that this screen manages
      store.setDietaryRestrictions(row.dietary_restrictions ?? []);
      store.setLikedIngredients(row.liked_ingredients ?? []);
      store.setDislikedIngredients(row.disliked_ingredients ?? []);
      store.setLikedCuisines(row.liked_cuisines ?? []);
      store.setSeasonalityImportance((row.seasonality_importance ?? 3) as 1 | 2 | 3 | 4 | 5);
      store.setCookFromScratchPreference((row.cook_from_scratch_preference ?? 3) as 1 | 2 | 3 | 4 | 5);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLiked() {
    const trimmed = likedInput.trim();
    if (!trimmed) return;
    store.addLikedIngredient(trimmed);
    setLikedInput('');
  }

  function addDisliked() {
    const trimmed = dislikedInput.trim();
    if (!trimmed) return;
    store.addDislikedIngredient(trimmed);
    setDislikedInput('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .update({
          dietary_restrictions: store.dietaryRestrictions,
          liked_ingredients: store.likedIngredients,
          disliked_ingredients: store.dislikedIngredients,
          liked_cuisines: store.likedCuisines,
          seasonality_importance: store.seasonalityImportance,
          cook_from_scratch_preference: store.cookFromScratchPreference,
        } as never)
        .eq('user_id', session.user.id);

      if (error) throw error;
      router.back();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('settings.save_failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      {/* Header with back button */}
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center">
          <Text className="text-lg">←</Text>
        </Pressable>
        <View className="gap-0.5 flex-1">
          <Text className="text-2xl font-bold text-[#1A1A2E]">{t('settings.title')}</Text>
          <Text className="text-sm text-[#6B7280]">{t('settings.subtitle')}</Text>
        </View>
      </View>

      {/* Dietary restrictions */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">{t('settings.dietary_restrictions')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => {
            const selected = store.dietaryRestrictions.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => store.toggleDietaryRestriction(opt.value)}
                className={[
                  'flex-row items-center gap-1.5 px-3 py-2 rounded-full border',
                  selected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <Text>{opt.emoji}</Text>
                <Text className={`text-sm font-medium ${selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'}`}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Favourite ingredients */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">{t('settings.favourite_ingredients')}</Text>
        <Text className="text-sm text-[#6B7280] -mt-1">{t('settings.favourite_ingredients_hint')}</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
            placeholder={t('settings.favourite_ingredients_placeholder')}
            value={likedInput}
            onChangeText={setLikedInput}
            onSubmitEditing={addLiked}
            returnKeyType="done"
          />
          <Pressable
            onPress={addLiked}
            className="h-12 w-12 rounded-xl bg-[#2D6A4F] items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </Pressable>
        </View>
        {store.likedIngredients.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {store.likedIngredients.map((item) => (
              <Pressable
                key={item}
                onPress={() => store.removeLikedIngredient(item)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D8F3DC] border border-[#2D6A4F]"
              >
                <Text className="text-sm text-[#2D6A4F] font-medium">{item}</Text>
                <Text className="text-xs text-[#2D6A4F]">✕</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Disliked ingredients */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">{t('settings.disliked_ingredients')}</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
            placeholder={t('settings.disliked_ingredients_placeholder')}
            value={dislikedInput}
            onChangeText={setDislikedInput}
            onSubmitEditing={addDisliked}
            returnKeyType="done"
          />
          <Pressable
            onPress={addDisliked}
            className="h-12 w-12 rounded-xl bg-[#2D6A4F] items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </Pressable>
        </View>
        {store.dislikedIngredients.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {store.dislikedIngredients.map((item) => (
              <Pressable
                key={item}
                onPress={() => store.removeDislikedIngredient(item)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 border border-red-200"
              >
                <Text className="text-sm text-red-600 font-medium">{item}</Text>
                <Text className="text-xs text-red-400">✕</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Favourite cuisines */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">{t('settings.favourite_cuisines')}</Text>
        <Text className="text-sm text-[#6B7280] -mt-1">{t('settings.favourite_cuisines_hint')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {CUISINE_OPTIONS.map((opt) => {
            const selected = store.likedCuisines.includes(opt.label);
            return (
              <Pressable
                key={opt.label}
                onPress={() => store.toggleLikedCuisine(opt.label)}
                className={[
                  'flex-row items-center gap-1.5 px-3 py-2 rounded-full border',
                  selected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <Text>{opt.emoji}</Text>
                <Text className={`text-sm font-medium ${selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'}`}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Seasonality importance */}
      <View className="gap-3">
        <View className="flex-row justify-between items-baseline">
          <Text className="text-base font-semibold text-[#1A1A2E]">{t('settings.seasonal_ingredients')}</Text>
          <Text className="text-[#2D6A4F] font-bold">
            {[
              t('settings.seasonality.none'),
              t('settings.seasonality.low'),
              t('settings.seasonality.some'),
              t('settings.seasonality.high'),
              t('settings.seasonality.always'),
            ][store.seasonalityImportance - 1]}
          </Text>
        </View>
        <Text className="text-sm text-[#6B7280] -mt-1">
          {t('settings.seasonal_ingredients_hint')}
        </Text>
        <View className="flex-row gap-1">
          {([1, 2, 3, 4, 5] as const).map((val) => (
            <Pressable
              key={val}
              onPress={() => store.setSeasonalityImportance(val)}
              className={[
                'flex-1 py-2 rounded-lg items-center',
                val <= store.seasonalityImportance
                  ? val === store.seasonalityImportance
                    ? 'bg-[#2D6A4F]'
                    : 'bg-[#52B788]'
                  : 'bg-gray-200',
              ].join(' ')}
            >
              <Text
                className={`text-sm font-bold ${
                  val <= store.seasonalityImportance ? 'text-white' : 'text-gray-400'
                }`}
              >
                {val}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Cooking from scratch */}
      <View className="gap-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-base font-semibold text-[#1A1A2E]">{t('settings.cooking_from_scratch')}</Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xl">{COOK_FROM_SCRATCH_EMOJIS[store.cookFromScratchPreference - 1]}</Text>
            <Text className="text-sm font-semibold" style={{ color: COOK_FROM_SCRATCH_COLORS[store.cookFromScratchPreference - 1] }}>
              {scratchLabels[store.cookFromScratchPreference - 1]}
            </Text>
          </View>
        </View>
        <Text className="text-sm text-[#6B7280] -mt-1">
          {t('settings.cooking_from_scratch_hint')}
        </Text>
        <ScratchSlider
          value={store.cookFromScratchPreference}
          onChange={store.setCookFromScratchPreference}
          color={COOK_FROM_SCRATCH_COLORS[store.cookFromScratchPreference - 1]}
        />
        <View className="flex-row justify-between">
          <Text className="text-xs text-[#9CA3AF]">🧊 {t('settings.convenience')}</Text>
          <Text className="text-xs text-[#9CA3AF]">🔥 {t('settings.always_scratch')}</Text>
        </View>
      </View>

      {saving ? (
        <View className="h-12 items-center justify-center">
          <ActivityIndicator color="#2D6A4F" />
        </View>
      ) : (
        <Button label={t('common.save')} onPress={handleSave} />
      )}
    </ScrollView>
  );
}

// ─── Scratch Slider ───────────────────────────────────────────────────────────

function ScratchSlider({
  value,
  onChange,
  color,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  color: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  function resolveValue(x: number): 1 | 2 | 3 | 4 | 5 {
    if (trackWidth === 0) return value;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    return (Math.round(ratio * 4) + 1) as 1 | 2 | 3 | 4 | 5;
  }

  function handleResponder(e: GestureResponderEvent) {
    onChange(resolveValue(e.nativeEvent.locationX));
  }

  const fillPct = ((value - 1) / 4) * 100;

  return (
    <View
      className="py-3 justify-center"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleResponder}
      onResponderMove={handleResponder}
    >
      {/* Track */}
      <View className="h-2 bg-gray-200 rounded-full">
        <View
          className="h-full rounded-full"
          style={{ width: `${fillPct}%`, backgroundColor: color }}
        />
      </View>
      {/* Tick marks */}
      <View className="absolute left-0 right-0 flex-row justify-between top-[19px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: i <= value - 1 ? color : '#D1D5DB' }}
          />
        ))}
      </View>
      {/* Thumb */}
      <View
        className="absolute w-6 h-6 rounded-full border-2 border-white"
        style={{
          top: 8,
          left: `${fillPct}%`,
          backgroundColor: color,
          transform: [{ translateX: -12 }],
          shadowColor: color,
          shadowOpacity: 0.4,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      />
    </View>
  );
}
