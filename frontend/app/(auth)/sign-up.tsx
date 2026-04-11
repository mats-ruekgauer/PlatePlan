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
import { signUpWithEmail } from '../../lib/supabase';

type Form = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpScreen() {
  const { t } = useI18n();
  const schema = z.object({
    email: z.string().email(t('auth.enter_valid_email')),
    password: z.string().min(8, t('auth.password_min_8')),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('auth.passwords_do_not_match'),
    path: ['confirmPassword'],
  });

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    try {
      await signUpWithEmail(data.email, data.password);
      router.replace('/(onboarding)/step-goals');
    } catch (err) {
      Alert.alert(
        t('auth.sign_up_failed'),
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
          <Text className="text-3xl font-bold text-[#1A1A2E]">{t('auth.create_account')}</Text>
          <Text className="text-base text-[#6B7280]">
            {t('auth.sign_up_subtitle')}
          </Text>
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
                  autoComplete="new-password"
                  placeholder={t('auth.min_8_characters')}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password && <Text className="text-xs text-red-500">{errors.password.message}</Text>}
          </View>

          <View className="gap-1">
            <Text className="text-sm font-medium text-[#1A1A2E]">{t('auth.confirm_password')}</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
                  secureTextEntry
                  autoComplete="new-password"
                  placeholder={t('auth.repeat_password')}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.confirmPassword && (
              <Text className="text-xs text-red-500">{errors.confirmPassword.message}</Text>
            )}
          </View>
        </View>

        <Button
          label={t('auth.create_account_button')}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />

        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-sm text-[#6B7280]">
            {t('auth.already_have_account')}{' '}
            <Text className="text-[#2D6A4F] font-semibold">{t('auth.sign_in')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
