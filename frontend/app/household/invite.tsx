// app/household/invite.tsx
// Invite view: shown after household creation or on-demand from detail screen.
// Displays QR code + short code + share button.
// Always fetches current valid invite (never rotates on open).

import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Share, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '../../components/ui/Button';
import { useCurrentInvite, useShareInvite } from '../../hooks/useHousehold';

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Abgelaufen';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `Läuft ab in ${hours}h ${minutes}min`;
  return `Läuft ab in ${minutes}min`;
}

export default function HouseholdInviteScreen() {
  const { id, source } = useLocalSearchParams<{
    id: string;
    source?: 'onboarding' | 'profile';
  }>();

  const currentInvite = useCurrentInvite(id);
  const shareInvite = useShareInvite();

  const shortCode = currentInvite.data?.shortCode ?? '';
  const expiresAt = currentInvite.data?.expiresAt ?? '';
  // QR-Code codiert plateplan://invite/<shortCode> — der Deep-Link-Handler erkennt das PP-Format
  const qrValue = shortCode ? `plateplan://invite/${shortCode}` : '';

  function handleDone() {
    if (source === 'profile') {
      router.replace('/(tabs)/profile');
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleShare() {
    if (!shortCode) return;
    await Share.share({
      message: `Tritt meinem PlatePlan-Haushalt bei!\nLink: plateplan://invite/${shortCode}\nCode: ${shortCode}`,
      url: `plateplan://invite/${shortCode}`,
    });
  }

  async function handleRefresh() {
    if (!id) return;
    await shareInvite.mutateAsync(id);
    // useCurrentInvite wird automatisch invalidiert via onSuccess in useShareInvite
  }

  const isLoading = currentInvite.isLoading || (!shortCode && !currentInvite.isError);

  return (
    <View className="flex-1 bg-[#F8F9FA] px-5 pt-14 pb-8">
      {/* Header */}
      <View className="mb-8 gap-2">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Einladen</Text>
        <Text className="text-base text-[#6B7280]">
          Teile den QR-Code oder den Kurz-Code mit deinen Mitbewohnern.
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      ) : currentInvite.isError ? (
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-base text-red-500 text-center">
            Code konnte nicht geladen werden.
          </Text>
          <Button label="Erneut versuchen" onPress={() => currentInvite.refetch()} />
        </View>
      ) : (
        <View className="flex-1 items-center gap-8">
          {/* QR Code */}
          {qrValue ? (
            <View className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm items-center">
              <QRCode
                value={qrValue}
                size={200}
                color="#1A1A2E"
                backgroundColor="white"
              />
            </View>
          ) : null}

          {/* Short Code */}
          {shortCode ? (
            <View className="items-center gap-2">
              <Text className="text-sm text-[#6B7280] font-medium uppercase tracking-widest">
                Kurz-Code
              </Text>
              <View className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-4">
                <Text className="text-3xl font-bold text-[#1A1A2E] tracking-widest">
                  {shortCode}
                </Text>
              </View>
              {expiresAt ? (
                <Text className="text-xs text-[#9CA3AF] text-center">
                  {formatTimeRemaining(expiresAt)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Actions */}
          <View className="w-full gap-3">
            <Button label="Einladung teilen" onPress={handleShare} />
            <Button
              label={shareInvite.isPending ? 'Neuer Code wird generiert…' : 'Neuen Code generieren'}
              variant="secondary"
              onPress={handleRefresh}
            />
          </View>
        </View>
      )}

      {/* Done */}
      <TouchableOpacity onPress={handleDone} className="mt-4 py-3 items-center">
        <Text className="text-base text-[#2D6A4F] font-medium">Fertig</Text>
      </TouchableOpacity>
    </View>
  );
}
