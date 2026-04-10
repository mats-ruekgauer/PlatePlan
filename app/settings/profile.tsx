import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import {
  SUPPORTED_LANGUAGES,
  useI18n,
} from '../../lib/i18n';
import {
  useProfile,
  useUpdateDisplayName,
} from '../../hooks/useProfile';
import type { AppLanguage } from '../../types';

export default function ProfileSettingsScreen() {
  const { language, setLanguage, t } = useI18n();
  const { data: profile, isLoading } = useProfile();
  const updateDisplayName = useUpdateDisplayName();
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  async function handleSaveName() {
    try {
      await updateDisplayName.mutateAsync(displayName.trim());
      Alert.alert(t('profile_settings.saved_title'), t('profile_settings.saved_message'));
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('profile_settings.save_failed'),
      );
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
        >
          <Text className="text-lg">←</Text>
        </Pressable>
        <View className="gap-0.5 flex-1">
          <Text className="text-2xl font-bold text-[#1A1A2E]">
            {t('profile_settings.title')}
          </Text>
          <Text className="text-sm text-[#6B7280]">
            {t('profile_settings.subtitle')}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">
          {t('profile_settings.account')}
        </Text>
        <View className="bg-white rounded-2xl p-4 gap-4">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-[#1A1A2E]">
              {t('profile_settings.display_name')}
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-[#1A1A2E]"
              placeholder={t('profile_settings.display_name_placeholder')}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-[#1A1A2E]">
              {t('profile_settings.email')}
            </Text>
            <View className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3">
              {isLoading ? (
                <ActivityIndicator color="#2D6A4F" />
              ) : (
                <Text className="text-sm text-[#6B7280]">
                  {profile?.email ?? t('common.not_set')}
                </Text>
              )}
            </View>
          </View>

          <Button
            label={t('common.save')}
            onPress={handleSaveName}
            loading={updateDisplayName.isPending}
          />
        </View>
      </View>

      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">
          {t('settings.app_language')}
        </Text>
        <Text className="text-sm text-[#6B7280] -mt-1">
          {t('common.language_applies_immediately')}
        </Text>
        <View className="flex-row gap-2">
          {SUPPORTED_LANGUAGES.map((option) => {
            const selected = language === option;
            const label =
              option === 'de' ? t('common.german') : t('common.english');

            return (
              <Pressable
                key={option}
                onPress={() => setLanguage(option as AppLanguage)}
                className={[
                  'flex-1 rounded-xl border px-4 py-3 items-center',
                  selected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">
          {t('profile_settings.security')}
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <ComingSoonRow
            label={t('profile_settings.change_email')}
            description={t('profile_settings.change_email_hint')}
          />
          <Divider />
          <ComingSoonRow
            label={t('profile_settings.change_password')}
            description={t('profile_settings.change_password_hint')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function ComingSoonRow({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const { t } = useI18n();

  return (
    <View className="px-4 py-4 gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-[#1A1A2E]">{label}</Text>
        <Text className="text-xs font-semibold text-[#9CA3AF]">{t('common.coming_soon')}</Text>
      </View>
      <Text className="text-xs text-[#6B7280]">{description}</Text>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100" />;
}
