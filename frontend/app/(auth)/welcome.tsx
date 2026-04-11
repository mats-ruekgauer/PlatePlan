import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { useI18n } from '../../lib/i18n';

export default function WelcomeScreen() {
  const { t } = useI18n();

  return (
    <View className="flex-1 bg-white px-6 justify-center gap-8">
      <View className="items-center gap-3">
        <Text className="text-6xl">🥗</Text>
        <Text className="text-4xl font-bold text-[#1A1A2E] text-center">PlatePlan</Text>
        <Text className="text-base text-[#6B7280] text-center">
          {t('welcome.tagline')}
        </Text>
      </View>

      <View className="gap-3">
        <Button
          label={t('welcome.get_started')}
          onPress={() => router.push('/(auth)/sign-up')}
        />
        <Button
          label={t('welcome.have_account')}
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </View>
  );
}
