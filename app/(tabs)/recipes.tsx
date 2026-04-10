import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  useCookedMeals,
  useManualRecipes,
  type CookedMealEntry,
} from '../../hooks/useCookedMeals';
import type { Recipe } from '../../types';

type RecipesTab = 'history' | 'manual';

export default function RecipesScreen() {
  const [activeTab, setActiveTab] = useState<RecipesTab>('history');
  const cookedMealsQuery = useCookedMeals();
  const manualRecipesQuery = useManualRecipes();

  const activeQuery =
    activeTab === 'history' ? cookedMealsQuery : manualRecipesQuery;

  async function handleRefresh() {
    await activeQuery.refetch();
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-28 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor="#2D6A4F"
          />
        }
      >
        <View className="gap-1">
          <Text className="text-2xl font-bold text-[#1A1A2E]">Recipes</Text>
          <Text className="text-sm text-[#6B7280]">
            Verlauf deiner gekochten Gerichte und deine eigenen Rezepte.
          </Text>
        </View>

        <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'history' ? (
          <HistoryTab
            entries={cookedMealsQuery.data ?? []}
            isLoading={cookedMealsQuery.isLoading}
          />
        ) : (
          <ManualRecipesTab
            recipes={manualRecipesQuery.data ?? []}
            isLoading={manualRecipesQuery.isLoading}
            onAddRecipe={() => router.push('/recipe/new')}
            onOpenRecipe={(recipeId) => router.push(`/recipe/${recipeId}`)}
          />
        )}
      </ScrollView>

      {activeTab === 'manual' && (
        <TouchableOpacity
          onPress={() => router.push('/recipe/new')}
          className="absolute bottom-8 right-5 h-14 w-14 rounded-full bg-[#2D6A4F] items-center justify-center active:opacity-80"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.16,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          <Text className="text-3xl text-white -mt-0.5">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function TabSwitcher({
  activeTab,
  onChange,
}: {
  activeTab: RecipesTab;
  onChange: (tab: RecipesTab) => void;
}) {
  return (
    <View className="flex-row rounded-2xl bg-white p-1">
      <TabButton
        label="Verlauf"
        selected={activeTab === 'history'}
        onPress={() => onChange('history')}
      />
      <TabButton
        label="Meine Rezepte"
        selected={activeTab === 'manual'}
        onPress={() => onChange('manual')}
      />
    </View>
  );
}

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-1 rounded-xl px-4 py-3 items-center',
        selected ? 'bg-[#D8F3DC]' : 'bg-transparent',
      ].join(' ')}
    >
      <Text
        className={[
          'text-sm font-semibold',
          selected ? 'text-[#2D6A4F]' : 'text-[#6B7280]',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HistoryTab({
  entries,
  isLoading,
}: {
  entries: CookedMealEntry[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <CardSkeletonList count={4} />;
  }

  if (!entries.length) {
    return (
      <EmptyState
        title="Noch keine Gerichte gekocht"
        description="Generiere deinen ersten Plan und markiere Gerichte als gekocht oder vorbereitet."
      />
    );
  }

  return (
    <View className="gap-3">
      {entries.map((entry) => (
        <HistoryCard
          key={entry.plannedMealId}
          entry={entry}
          onPress={() => router.push(`/recipe/${entry.recipe.id}`)}
        />
      ))}
    </View>
  );
}

function ManualRecipesTab({
  recipes,
  isLoading,
  onAddRecipe,
  onOpenRecipe,
}: {
  recipes: Recipe[];
  isLoading: boolean;
  onAddRecipe: () => void;
  onOpenRecipe: (recipeId: string) => void;
}) {
  if (isLoading) {
    return <CardSkeletonList count={3} />;
  }

  if (!recipes.length) {
    return (
      <EmptyState
        title="Noch keine eigenen Rezepte"
        description="Tippe auf +, um ein Rezept hinzuzufügen."
        actionLabel="Rezept hinzufügen"
        onAction={onAddRecipe}
      />
    );
  }

  return (
    <View className="gap-3">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          eyebrow="Manuell hinzugefügt"
          onPress={() => onOpenRecipe(recipe.id)}
        />
      ))}
    </View>
  );
}

function HistoryCard({
  entry,
  onPress,
}: {
  entry: CookedMealEntry;
  onPress: () => void;
}) {
  return (
    <RecipeCard
      recipe={entry.recipe}
      eyebrow={entry.weekLabel}
      onPress={onPress}
    />
  );
}

function RecipeCard({
  recipe,
  eyebrow,
  onPress,
}: {
  recipe: Recipe;
  eyebrow?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl bg-white p-4 gap-3 active:opacity-75"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      {eyebrow ? (
        <Text className="text-xs font-semibold uppercase tracking-wide text-[#2D6A4F]">
          {eyebrow}
        </Text>
      ) : null}

      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-1.5">
          <Text className="text-base font-semibold text-[#1A1A2E]" numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.description ? (
            <Text className="text-sm text-[#6B7280]" numberOfLines={2}>
              {recipe.description}
            </Text>
          ) : null}
        </View>
        {recipe.isSeasonal ? <Badge label="Seasonal" variant="success" /> : null}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {recipe.cuisine ? <Badge label={recipe.cuisine} variant="muted" /> : null}
        {recipe.caloriesPerServing != null ? (
          <Text className="text-xs font-semibold text-[#F59E0B]">
            {recipe.caloriesPerServing} kcal
          </Text>
        ) : null}
        {recipe.proteinPerServingG != null ? (
          <Text className="text-xs font-semibold text-[#3B82F6]">
            {recipe.proteinPerServingG}g Protein
          </Text>
        ) : null}
        {recipe.cookTimeMinutes != null ? (
          <Text className="text-xs text-[#6B7280]">⏱ {recipe.cookTimeMinutes} min</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center gap-3 rounded-3xl bg-white px-6 py-12">
      <Text className="text-base font-semibold text-[#1A1A2E]">{title}</Text>
      <Text className="text-center text-sm leading-5 text-[#6B7280]">
        {description}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          className="rounded-xl bg-[#D8F3DC] px-4 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-[#2D6A4F]">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CardSkeletonList({ count }: { count: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} height={112} borderRadius={18} />
      ))}
    </View>
  );
}
