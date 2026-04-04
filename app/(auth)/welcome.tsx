import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';

export default function WelcomeScreen() {
  return (
    <View className="flex-1 bg-white px-6 justify-center gap-8">
      <View className="items-center gap-3">
        <Text className="text-6xl">🥗</Text>
        <Text className="text-4xl font-bold text-[#1A1A2E] text-center">PlatePlan</Text>
        <Text className="text-base text-[#6B7280] text-center">
          Your personal AI meal planner. Stop thinking about what to cook.
        </Text>
      </View>

      <View className="gap-3">
        <Button
          label="Get started"
          onPress={() => router.push('/(auth)/sign-up')}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </View>
  );
}
