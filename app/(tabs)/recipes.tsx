import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { mapRecipe, supabase } from '../../lib/supabase';
import type { Recipe } from '../../types';

export default function RecipesScreen() {
  const [search, setSearch] = useState('');

  const { data: recipes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['recipes'],
    queryFn: async (): Promise<Recipe[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapRecipe);
    },
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cuisine?.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [recipes, search]);

  // Group by cuisine
  const grouped = useMemo(() => {
    const map = new Map<string, Recipe[]>();
    for (const r of filtered) {
      const key = r.cuisine ?? 'Other';
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-8 gap-5"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
      >
        <Text className="text-2xl font-bold text-[#1A1A2E]">Recipes</Text>

        {/* Search */}
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
          placeholder="Search by name, cuisine or tag…"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />

        {isLoading ? (
          <View className="gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={80} borderRadius={16} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center py-12 gap-2">
            <Text className="text-4xl">📖</Text>
            <Text className="text-base font-semibold text-[#1A1A2E]">
              {search ? 'No results' : 'No recipes yet'}
            </Text>
            <Text className="text-sm text-[#6B7280] text-center">
              {search
                ? 'Try a different search term.'
                : 'Generate your first plan to populate the recipe library.'}
            </Text>
          </View>
        ) : (
          grouped.map(([cuisine, items]) => (
            <View key={cuisine} className="gap-2">
              <Text className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide">
                {cuisine}
              </Text>
              {items.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onPress={() => router.push(`/recipe/${recipe.id}`)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function RecipeCard({
  recipe,
  onPress,
}: {
  recipe: Recipe;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 gap-2 active:opacity-75"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      }}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-base font-semibold text-[#1A1A2E] flex-1" numberOfLines={2}>
          {recipe.title}
        </Text>
        {recipe.isSeasonal && <Badge label="Seasonal" variant="success" />}
      </View>

      {recipe.description && (
        <Text className="text-sm text-[#6B7280]" numberOfLines={2}>
          {recipe.description}
        </Text>
      )}

      <View className="flex-row flex-wrap gap-2 mt-0.5">
        {recipe.caloriesPerServing != null && (
          <Text className="text-xs text-[#F59E0B] font-semibold">
            {recipe.caloriesPerServing} kcal
          </Text>
        )}
        {recipe.proteinPerServingG != null && (
          <Text className="text-xs text-[#3B82F6] font-semibold">
            {recipe.proteinPerServingG}g protein
          </Text>
        )}
        {recipe.cookTimeMinutes != null && (
          <Text className="text-xs text-[#6B7280]">⏱ {recipe.cookTimeMinutes} min</Text>
        )}
        {recipe.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} label={tag} variant="muted" />
        ))}
      </View>
    </TouchableOpacity>
  );
}
