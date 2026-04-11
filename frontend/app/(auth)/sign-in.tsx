import { router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '../../components/ui/Button';
import { useI18n } from '../../lib/i18n';
import { signInWithEmail } from '../../lib/supabase';

type Form = {
  email: string;
  password: string;
};

export default function SignInScreen() {
  const { t } = useI18n();
  const schema = z.object({
    email: z.string().email(t('auth.enter_valid_email')),
    password: z.string().min(6, t('auth.password_min_6')),
  });

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    try {
      await signInWithEmail(data.email, data.password);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert(
        t('auth.sign_in_failed'),
        err instanceof Error ? err.message : t('auth.please_try_again'),
      );
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 px-6 justify-center gap-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-[#1A1A2E]">{t('auth.welcome_back')}</Text>
          <Text className="text-base text-[#6B7280]">{t('auth.sign_in_subtitle')}</Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-medium text-[#1A1A2E]">{t('auth.email')}</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.email && <Text className="text-xs text-red-500">{errors.email.message}</Text>}
          </View>

          <View className="gap-1">
            <Text className="text-sm font-medium text-[#1A1A2E]">{t('auth.password')}</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
                  secureTextEntry
                  autoComplete="password"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password && <Text className="text-xs text-red-500">{errors.password.message}</Text>}
          </View>
        </View>

        <Button
          label={t('auth.sign_in_button')}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />

        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-sm text-[#6B7280]">
            {t('auth.no_account')}{' '}
            <Text className="text-[#2D6A4F] font-semibold">{t('auth.sign_up')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
