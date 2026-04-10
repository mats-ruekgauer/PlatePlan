import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import { recipeKeys } from '../../hooks/useCookedMeals';
import {
  getCurrentUserId,
  supabase,
  type Database,
} from '../../lib/supabase';
import type { Ingredient } from '../../types';

interface IngredientDraft {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

interface StepDraft {
  id: string;
  value: string;
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyIngredient(): IngredientDraft {
  return { id: createId(), name: '', amount: '', unit: '' };
}

function emptyStep(): StepDraft {
  return { id: createId(), value: '' };
}

function parseOptionalNumber(value: string): number | null | 'invalid' {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) return 'invalid';
  return parsed;
}

export default function NewRecipeScreen() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [cookTimeMinutes, setCookTimeMinutes] = useState('');
  const [servings, setServings] = useState('1');
  const [tags, setTags] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Fehlender Titel', 'Bitte gib einen Titel für das Rezept ein.');
      return;
    }

    const parsedServings = Number(servings.trim() || '1');
    if (!Number.isInteger(parsedServings) || parsedServings < 1) {
      Alert.alert('Ungültige Portionen', 'Bitte gib mindestens 1 Portion ein.');
      return;
    }

    const parsedCookTime = parseOptionalNumber(cookTimeMinutes);
    const parsedCalories = parseOptionalNumber(calories);
    const parsedProtein = parseOptionalNumber(protein);
    const parsedCarbs = parseOptionalNumber(carbs);
    const parsedFat = parseOptionalNumber(fat);

    if (
      parsedCookTime === 'invalid' ||
      parsedCalories === 'invalid' ||
      parsedProtein === 'invalid' ||
      parsedCarbs === 'invalid' ||
      parsedFat === 'invalid'
    ) {
      Alert.alert('Ungültige Zahlen', 'Bitte prüfe Kochzeit und Makros.');
      return;
    }

    const parsedIngredients: Ingredient[] = [];
    for (const ingredient of ingredients) {
      const name = ingredient.name.trim();
      const amountText = ingredient.amount.trim();
      const unit = ingredient.unit.trim();
      const hasAnyValue = Boolean(name || amountText || unit);

      if (!hasAnyValue) continue;

      const amount = Number(amountText.replace(',', '.'));
      if (!name || !unit || !Number.isFinite(amount) || amount <= 0) {
        Alert.alert(
          'Ungültige Zutat',
          'Bitte fülle bei jeder Zutat Name, Menge und Einheit vollständig aus.',
        );
        return;
      }

      parsedIngredients.push({ name, amount, unit });
    }

    const parsedSteps = steps
      .map((step) => step.value.trim())
      .filter(Boolean);

    try {
      setIsSaving(true);
      const userId = await getCurrentUserId();
      const recipeInsert: Database['public']['Tables']['recipes']['Insert'] = {
        user_id: userId,
        title: trimmedTitle,
        description: description.trim() || null,
        ingredients: parsedIngredients,
        steps: parsedSteps,
        calories_per_serving: parsedCalories,
        protein_per_serving_g: parsedProtein,
        carbs_per_serving_g: parsedCarbs,
        fat_per_serving_g: parsedFat,
        servings: parsedServings,
        cook_time_minutes: parsedCookTime,
        cuisine: cuisine.trim() || null,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_seasonal: false,
        season: 'all',
        estimated_price_eur: null,
        source: 'manual',
      };
      const { error } = await supabase.from('recipes').insert(recipeInsert as never);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
        queryClient.invalidateQueries({ queryKey: recipeKeys.manual() }),
      ]);

      router.back();
    } catch (err) {
      Alert.alert(
        'Fehler beim Speichern',
        err instanceof Error ? err.message : 'Das Rezept konnte nicht gespeichert werden.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-12 gap-6"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full border border-gray-200 bg-white items-center justify-center"
          >
            <Text className="text-lg">‹</Text>
          </Pressable>
          <View className="flex-1 gap-0.5">
            <Text className="text-2xl font-bold text-[#1A1A2E]">Neues Rezept</Text>
            <Text className="text-sm text-[#6B7280]">
              Füge ein eigenes Rezept hinzu, damit es in künftige Pläne einfließen kann.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className="rounded-xl bg-[#D8F3DC] px-4 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-[#2D6A4F]">
            {isSaving ? 'Speichert…' : 'Speichern'}
          </Text>
        </TouchableOpacity>
      </View>

      <SectionCard title="Grunddaten">
        <LabeledInput
          label="Titel"
          value={title}
          onChangeText={setTitle}
          placeholder="z. B. Linsenbolognese"
          autoCapitalize="sentences"
        />
        <LabeledInput
          label="Beschreibung"
          value={description}
          onChangeText={setDescription}
          placeholder="Kurze Beschreibung des Gerichts"
          multiline
        />
        <LabeledInput
          label="Cuisine"
          value={cuisine}
          onChangeText={setCuisine}
          placeholder="z. B. Italienisch"
        />
        <View className="flex-row gap-3">
          <View style={{ flex: 1 }}>
            <LabeledInput
              label="Koch-Zeit (min)"
              value={cookTimeMinutes}
              onChangeText={setCookTimeMinutes}
              placeholder="30"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <LabeledInput
              label="Portionen"
              value={servings}
              onChangeText={setServings}
              placeholder="1"
              keyboardType="number-pad"
            />
          </View>
        </View>
        <LabeledInput
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder="z. B. schnell, vegetarisch, meal prep"
        />
      </SectionCard>

      <SectionCard title="Zutaten">
        <View className="gap-3">
          {ingredients.map((ingredient, index) => (
            <View key={ingredient.id} className="rounded-2xl bg-[#F8F9FA] p-3 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[#1A1A2E]">
                  Zutat {index + 1}
                </Text>
                {ingredients.length > 1 ? (
                  <TouchableOpacity
                    onPress={() =>
                      setIngredients((current) =>
                        current.filter((item) => item.id !== ingredient.id),
                      )
                    }
                  >
                    <Text className="text-sm font-semibold text-[#DC2626]">Entfernen</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <LabeledInput
                label="Name"
                value={ingredient.name}
                onChangeText={(value) =>
                  setIngredients((current) =>
                    current.map((item) =>
                      item.id === ingredient.id ? { ...item, name: value } : item,
                    ),
                  )
                }
                placeholder="z. B. rote Linsen"
              />

              <View className="flex-row gap-3">
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Menge"
                    value={ingredient.amount}
                    onChangeText={(value) =>
                      setIngredients((current) =>
                        current.map((item) =>
                          item.id === ingredient.id ? { ...item, amount: value } : item,
                        ),
                      )
                    }
                    placeholder="250"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Einheit"
                    value={ingredient.unit}
                    onChangeText={(value) =>
                      setIngredients((current) =>
                        current.map((item) =>
                          item.id === ingredient.id ? { ...item, unit: value } : item,
                        ),
                      )
                    }
                    placeholder="g"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <Button
          label="+ Zutat hinzufügen"
          variant="secondary"
          size="md"
          onPress={() => setIngredients((current) => [...current, emptyIngredient()])}
        />
      </SectionCard>

      <SectionCard title="Schritte">
        <View className="gap-3">
          {steps.map((step, index) => (
            <View key={step.id} className="rounded-2xl bg-[#F8F9FA] p-3 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[#1A1A2E]">
                  Schritt {index + 1}
                </Text>
                {steps.length > 1 ? (
                  <TouchableOpacity
                    onPress={() =>
                      setSteps((current) => current.filter((item) => item.id !== step.id))
                    }
                  >
                    <Text className="text-sm font-semibold text-[#DC2626]">Entfernen</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <LabeledInput
                label="Anweisung"
                value={step.value}
                onChangeText={(value) =>
                  setSteps((current) =>
                    current.map((item) =>
                      item.id === step.id ? { ...item, value } : item,
                    ),
                  )
                }
                placeholder="Was passiert in diesem Schritt?"
                multiline
              />
            </View>
          ))}
        </View>

        <Button
          label="+ Schritt hinzufügen"
          variant="secondary"
          size="md"
          onPress={() => setSteps((current) => [...current, emptyStep()])}
        />
      </SectionCard>

      <SectionCard title="Makros pro Portion">
        <View className="flex-row gap-3">
          <View style={{ flex: 1 }}>
            <LabeledInput
              label="kcal"
              value={calories}
              onChangeText={setCalories}
              placeholder="520"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <LabeledInput
              label="Protein (g)"
              value={protein}
              onChangeText={setProtein}
              placeholder="32"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View style={{ flex: 1 }}>
            <LabeledInput
              label="Carbs (g)"
              value={carbs}
              onChangeText={setCarbs}
              placeholder="45"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <LabeledInput
              label="Fett (g)"
              value={fat}
              onChangeText={setFat}
              placeholder="18"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </SectionCard>
    </ScrollView>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-base font-semibold text-[#1A1A2E]">{title}</Text>
      <View className="rounded-3xl bg-white p-4 gap-4">{children}</View>
    </View>
  );
}

function LabeledInput({
  label,
  multiline = false,
  ...props
}: {
  label: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-[#1A1A2E]">{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={[
          'rounded-2xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-[#1A1A2E]',
          multiline ? 'min-h-[96px]' : '',
        ].join(' ')}
      />
    </View>
  );
}
