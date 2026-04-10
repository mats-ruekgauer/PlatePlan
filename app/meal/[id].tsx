import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Badge } from '../../components/ui/Badge';
import { IngredientPriceBreakdown } from '../../components/recipe/IngredientPriceBreakdown';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { StarRating } from '../../components/ui/StarRating';
import { useMealFeedback, useSubmitFeedback } from '../../hooks/useFeedback';
import { usePlannedMeal } from '../../hooks/usePlan';
import { useIsFavorite, useToggleFavorite } from '../../hooks/useFavorites';
import { getMealSlotLabel, useI18n } from '../../lib/i18n';
import { shareRecipe } from '../../lib/sharing';
import { colors } from '../../constants/theme';
import type { Recipe } from '../../types';

// ─── Feedback form schema ─────────────────────────────────────────────────────

const feedbackSchema = z.object({
  tasteRating: z.number().int().min(1).max(5).nullable(),
  portionRating: z.number().int().min(1).max(5).nullable(),
  wouldRepeat: z.boolean().nullable(),
  notes: z.string().max(1000).optional(),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MealDetailScreen() {
  const { language, t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: meal, isLoading } = usePlannedMeal(id);
  const { data: existingFeedback } = useMealFeedback(id);
  const submitFeedback = useSubmitFeedback();
  const toggleFavorite = useToggleFavorite();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      tasteRating: null,
      portionRating: null,
      wouldRepeat: null,
      notes: '',
    },
  });

  // Pre-populate form if feedback already exists
  useEffect(() => {
    if (existingFeedback) {
      reset({
        tasteRating: existingFeedback.tasteRating,
        portionRating: existingFeedback.portionRating,
        wouldRepeat: existingFeedback.wouldRepeat,
        notes: existingFeedback.notes ?? '',
      });
      setFeedbackSubmitted(true);
    }
  }, [existingFeedback, reset]);

  function onSubmitFeedback(data: FeedbackForm) {
    if (!meal) return;
    submitFeedback.mutate(
      {
        plannedMealId: meal.id,
        recipeId: meal.recipe.id,
        tasteRating: data.tasteRating,
        portionRating: data.portionRating,
        wouldRepeat: data.wouldRepeat,
        notes: data.notes ?? null,
      },
      {
        onSuccess: () => {
          setFeedbackSubmitted(true);
          Alert.alert(t('meal.thanks_title'), t('meal.thanks_message'));
        },
        onError: (err) => {
          Alert.alert(t('common.error'), err instanceof Error ? err.message : t('meal.feedback_failed'));
        },
      },
    );
  }

  if (isLoading) {
    return <MealDetailSkeleton />;
  }

  if (!meal) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F9FA] gap-3">
        <Text className="text-4xl">😕</Text>
        <Text className="text-base font-semibold text-[#1A1A2E]">{t('meal.not_found')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-[#2D6A4F] font-medium">{t('meal.go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { recipe } = meal;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const isFavorite = useIsFavorite(recipe.id);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-[#F8F9FA]"
        contentContainerClassName="pb-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-4 pt-14 pb-4 gap-3">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-9 h-9 rounded-xl bg-white items-center justify-center active:opacity-70"
              style={{ shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
            >
              <Text className="text-lg">‹</Text>
            </TouchableOpacity>
            <Badge
              label={getMealSlotLabel(language, meal.mealSlot)}
              variant="default"
            />
            <View className="flex-1" />
            <TouchableOpacity
              onPress={() => toggleFavorite.mutate(recipe.id)}
              hitSlop={8}
              className="w-9 h-9 rounded-xl bg-white items-center justify-center active:opacity-70"
              style={{ shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
            >
              <Text className="text-lg">{isFavorite ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-2xl font-bold text-[#1A1A2E]">{recipe.title}</Text>

          {recipe.description && (
            <Text className="text-base text-[#6B7280]">{recipe.description}</Text>
          )}

          {/* Macro bar */}
          <MacroBar recipe={recipe} />

          {/* Meta badges */}
          <View className="flex-row flex-wrap gap-2">
            {recipe.cookTimeMinutes != null && (
              <Badge label={`⏱ ${recipe.cookTimeMinutes} min`} variant="muted" />
            )}
            {recipe.cuisine && (
              <Badge label={recipe.cuisine} variant="muted" />
            )}
            {recipe.isSeasonal && (
              <Badge label={t('meal.seasonal')} variant="success" dot />
            )}
            {recipe.tags.map((tag) => (
              <Badge key={tag} label={tag} variant="muted" />
            ))}
          </View>

          {/* Share button */}
          <TouchableOpacity
            onPress={() => shareRecipe(recipe)}
            className="flex-row items-center gap-2 self-start px-4 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70"
          >
            <Text className="text-sm">📤</Text>
            <Text className="text-sm font-semibold text-[#2D6A4F]">{t('meal.share_recipe')}</Text>
          </TouchableOpacity>
        </View>

        <Divider />

        {/* Ingredients */}
        <Section title={t('meal.ingredients')}>
          <View
            className="bg-white rounded-2xl overflow-hidden"
            style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
          >
            {recipe.ingredients.map((ing, idx) => (
              <View key={`${ing.name}-${idx}`}>
                {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
                <View className="flex-row items-center justify-between px-4 py-3">
                  <Text className="text-sm font-medium text-[#1A1A2E] capitalize flex-1">
                    {ing.name}
                  </Text>
                  <Text className="text-sm text-[#6B7280]">
                    {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Divider />

        <View className="px-4 py-5">
          <IngredientPriceBreakdown
            ingredients={recipe.ingredients}
            labels={getIngredientPriceLabels(language)}
          />
        </View>

        <Divider />

        {/* Steps */}
        <Section title={t('meal.instructions')}>
          <View className="gap-3">
            {recipe.steps.map((step, idx) => (
              <View
                key={idx}
                className="flex-row gap-3 bg-white rounded-2xl p-4"
                style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
              >
                <View className="w-7 h-7 rounded-full bg-[#2D6A4F] items-center justify-center flex-shrink-0 mt-0.5">
                  <Text className="text-xs font-bold text-white">{idx + 1}</Text>
                </View>
                <Text className="text-sm text-[#1A1A2E] flex-1 leading-5">{step}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Divider />

        {/* Feedback */}
        <Section title={t('meal.how_was_it')}>
          <View className="gap-5">
            {/* Taste rating */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#1A1A2E]">{t('meal.taste')}</Text>
              <Controller
                control={control}
                name="tasteRating"
                render={({ field: { value, onChange } }) => (
                  <StarRating
                    value={value ?? 0}
                    onChange={onChange}
                    size={36}
                    readonly={feedbackSubmitted && !isDirty}
                  />
                )}
              />
            </View>

            {/* Portion rating */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#1A1A2E]">{t('meal.portion_size')}</Text>
              <Controller
                control={control}
                name="portionRating"
                render={({ field: { value, onChange } }) => (
                  <PortionPicker
                    value={value}
                    onChange={onChange}
                    readonly={feedbackSubmitted && !isDirty}
                  />
                )}
              />
            </View>

            {/* Would repeat */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#1A1A2E]">{t('meal.would_cook_again')}</Text>
              <Controller
                control={control}
                name="wouldRepeat"
                render={({ field: { value, onChange } }) => (
                  <View className="flex-row gap-3">
                    {([true, false] as const).map((opt) => (
                      <Pressable
                        key={String(opt)}
                        onPress={() => onChange(opt)}
                        disabled={feedbackSubmitted && !isDirty}
                        className={[
                          'flex-1 py-3 rounded-xl border-2 items-center',
                          value === opt
                            ? opt
                              ? 'border-[#2D6A4F] bg-[#D8F3DC]'
                              : 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-white',
                        ].join(' ')}
                      >
                        <Text className="text-xl">{opt ? '👍' : '👎'}</Text>
                        <Text
                          className={`text-xs font-semibold mt-1 ${
                            value === opt
                              ? opt
                                ? 'text-[#2D6A4F]'
                                : 'text-red-500'
                              : 'text-[#9CA3AF]'
                          }`}
                        >
                          {opt ? t('common.yes') : t('common.no')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Notes */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#1A1A2E]">{t('meal.notes_optional')}</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E] min-h-[80px]"
                    multiline
                    textAlignVertical="top"
                    placeholder={t('meal.notes_placeholder')}
                    value={value ?? ''}
                    onChangeText={onChange}
                    editable={!(feedbackSubmitted && !isDirty)}
                  />
                )}
              />
            </View>

            {/* Submit */}
            {(!feedbackSubmitted || isDirty) && (
              <TouchableOpacity
                onPress={handleSubmit(onSubmitFeedback)}
                disabled={submitFeedback.isPending}
                className="h-[52px] rounded-xl bg-[#2D6A4F] items-center justify-center active:opacity-80"
              >
                <Text className="text-white font-semibold text-base">
                  {submitFeedback.isPending
                    ? t('common.saving')
                    : feedbackSubmitted
                    ? t('meal.update_feedback')
                    : t('meal.submit_feedback')}
                </Text>
              </TouchableOpacity>
            )}

            {feedbackSubmitted && !isDirty && (
              <View className="flex-row items-center justify-center gap-2 py-2">
                <Text className="text-sm text-[#2D6A4F]">✓ {t('meal.feedback_saved')}</Text>
              </View>
            )}
          </View>
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({ recipe }: { recipe: Recipe }) {
  const { t } = useI18n();
  const kcal = recipe.caloriesPerServing ?? 0;
  const p = recipe.proteinPerServingG ?? 0;
  const c = recipe.carbsPerServingG ?? 0;
  const f = recipe.fatPerServingG ?? 0;
  const totalKcalFromMacros = p * 4 + c * 4 + f * 9 || 1;

  return (
    <View className="gap-2">
      <View className="flex-row justify-between">
        <MacroLabel color={colors.calorie} label={t('meal.calories')} value={`${kcal}`} unit="kcal" />
        <MacroLabel color={colors.protein} label={t('meal.protein')} value={`${p}`} unit="g" />
        <MacroLabel color={colors.carbs} label={t('meal.carbs')} value={`${c}`} unit="g" />
        <MacroLabel color={colors.fat} label={t('meal.fat')} value={`${f}`} unit="g" />
      </View>
      <ProgressBar
        segments={[
          { fraction: (p * 4) / totalKcalFromMacros, color: colors.protein },
          { fraction: (c * 4) / totalKcalFromMacros, color: colors.carbs },
          { fraction: (f * 9) / totalKcalFromMacros, color: colors.fat },
        ]}
        height={8}
        animated
      />
    </View>
  );
}

function MacroLabel({
  color,
  label,
  value,
  unit,
}: {
  color: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View className="items-center gap-0.5">
      <Text className="text-xs text-[#9CA3AF]">{label}</Text>
      <Text className="text-base font-bold" style={{ color }}>
        {value}
        <Text className="text-xs font-normal text-[#9CA3AF]"> {unit}</Text>
      </Text>
    </View>
  );
}

// ─── PortionPicker ────────────────────────────────────────────────────────────

function PortionPicker({
  value,
  onChange,
  readonly,
}: {
  value: number | null;
  onChange: (v: number) => void;
  readonly: boolean;
}) {
  const { t } = useI18n();
  const portionOptions = [
    { value: 1, label: t('meal.portion.too_small'), emoji: '😐' },
    { value: 3, label: t('meal.portion.perfect'), emoji: '😊' },
    { value: 5, label: t('meal.portion.too_much'), emoji: '😅' },
  ];

  return (
    <View className="flex-row gap-3">
      {portionOptions.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          disabled={readonly}
          className={[
            'flex-1 py-3 rounded-xl border-2 items-center gap-1',
            value === opt.value
              ? 'border-[#2D6A4F] bg-[#D8F3DC]'
              : 'border-gray-200 bg-white',
          ].join(' ')}
        >
          <Text className="text-xl">{opt.emoji}</Text>
          <Text
            className={`text-xs font-semibold ${
              value === opt.value ? 'text-[#2D6A4F]' : 'text-[#9CA3AF]'
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="px-4 py-5 gap-3">
      <Text className="text-lg font-bold text-[#1A1A2E]">{title}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View className="h-2 bg-[#F8F9FA]" />;
}

function getIngredientPriceLabels(language: string) {
  if (language === 'de') {
    return {
      title: 'Preisaufschlüsselung',
      subtitle: 'Basierend auf zuletzt gescannten passenden Kassenbons.',
      total: 'Gematchte Zutaten',
      matched: 'mit Preis',
      unmatched: 'ohne Match',
      noMatchesTitle: 'Noch keine Zutatenpreise gefunden',
      noMatchesBody:
        'Scanne ein paar Kassenbons, damit PlatePlan passende Preise einzelnen Zutaten zuordnen kann.',
      noPrice: 'Kein Match',
      basedOn: 'Basierend auf',
    };
  }

  return {
    title: 'Cost breakdown',
    subtitle: 'Based on the latest matching scanned receipt items.',
    total: 'Matched ingredients',
    matched: 'priced',
    unmatched: 'unmatched',
    noMatchesTitle: 'No ingredient prices found yet',
    noMatchesBody:
      'Scan a few receipts so PlatePlan can match ingredient names to your price history.',
    noPrice: 'No match',
    basedOn: 'Based on',
  };
}

function MealDetailSkeleton() {
  return (
    <View className="flex-1 bg-[#F8F9FA] px-4 pt-14 gap-4">
      <Skeleton width={120} height={14} borderRadius={6} />
      <Skeleton width="80%" height={28} borderRadius={8} />
      <Skeleton width="100%" height={60} borderRadius={12} />
      <Skeleton width="100%" height={120} borderRadius={16} />
      <Skeleton width="100%" height={200} borderRadius={16} />
    </View>
  );
}
