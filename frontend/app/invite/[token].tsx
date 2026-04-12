// app/invite/[token].tsx
// Handles plateplan://invite/<token> and plateplan://invite/PP-XXXXXX deep links.
// Loads household info first, then shows a confirmation dialog before joining.

import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { useJoinHousehold } from '../../hooks/useHousehold';
import { callAPI } from '../../lib/api';
import type { PlanGenerationResult } from '../../types';

function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

type InfoState =
  | { status: 'loading' }
  | { status: 'ready'; householdName: string; householdId: string }
  | { status: 'not_found' }
  | { status: 'expired' }
  | { status: 'error'; message: string };

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const joinHousehold = useJoinHousehold();
  const [info, setInfo] = useState<InfoState>({ status: 'loading' });

  const isShortCode = /^PP-[A-Z0-9]{6}$/i.test(token ?? '');
  const joinParams = isShortCode
    ? { shortCode: token!.toUpperCase() }
    : { token: token! };

  // Load household info without joining
  useEffect(() => {
    if (!token) {
      setInfo({ status: 'not_found' });
      return;
    }
    callAPI<{ householdName: string; householdId: string }>(
      '/api/households/invite-info',
      joinParams,
    )
      .then((data) => setInfo({ status: 'ready', ...data }))
      .catch((err: Error) => {
        if (err.message.includes('expired')) {
          setInfo({ status: 'expired' });
        } else if (err.message.includes('not found') || err.message.includes('404')) {
          setInfo({ status: 'not_found' });
        } else {
          setInfo({ status: 'error', message: err.message });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleDecline() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function handleJoin() {
    const result = await joinHousehold.mutateAsync(joinParams);

    // Generate plan for this household (non-fatal)
    try {
      const planResult = await callAPI<PlanGenerationResult>('/api/plan/generate', {
        weekStart: getThisMonday(),
        householdId: result.householdId,
      });
      if (planResult?.planId) {
        await callAPI('/api/shopping/generate', { planId: planResult.planId }).catch(() => null);
      }
    } catch {
      // Non-fatal
    }

    router.replace('/(tabs)');
  }

  return (
    <View className="flex-1 bg-[#F8F9FA] px-5">
      <TouchableOpacity
        onPress={handleDecline}
        className="self-start pt-14 pb-4"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-[#2D6A4F] text-base font-medium">← Zurück</Text>
      </TouchableOpacity>

      <View className="flex-1 items-center justify-center gap-6">

        {info.status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#2D6A4F" />
            <Text className="text-base text-[#6B7280]">Einladung wird geladen…</Text>
          </>
        )}

        {info.status === 'not_found' && (
          <>
            <Text className="text-5xl">🏚️</Text>
            <Text className="text-2xl font-bold text-[#1A1A2E] text-center">
              Haushalt nicht gefunden
            </Text>
            <Text className="text-base text-[#6B7280] text-center">
              Diese Einladung ist ungültig oder existiert nicht mehr.
            </Text>
            <Button label="Schließen" onPress={handleDecline} />
          </>
        )}

        {info.status === 'expired' && (
          <>
            <Text className="text-5xl">⏰</Text>
            <Text className="text-2xl font-bold text-[#1A1A2E] text-center">
              Einladung abgelaufen
            </Text>
            <Text className="text-base text-[#6B7280] text-center">
              Bitte den Haushalts-Owner um einen neuen Code.
            </Text>
            <Button label="Schließen" onPress={handleDecline} />
          </>
        )}

        {info.status === 'error' && (
          <>
            <Text className="text-5xl">⚠️</Text>
            <Text className="text-2xl font-bold text-[#1A1A2E] text-center">
              Fehler
            </Text>
            <Text className="text-base text-[#6B7280] text-center">{info.message}</Text>
            <Button label="Schließen" onPress={handleDecline} />
          </>
        )}

        {info.status === 'ready' && (
          <>
            <Text className="text-5xl">🏠</Text>
            <View className="gap-2 items-center">
              <Text className="text-2xl font-bold text-[#1A1A2E] text-center">
                Haushalt beitreten?
              </Text>
              <Text className="text-base text-[#6B7280] text-center">
                Möchtest du dem Haushalt
              </Text>
              <Text className="text-lg font-semibold text-[#2D6A4F] text-center">
                „{info.householdName}"
              </Text>
              <Text className="text-base text-[#6B7280] text-center">
                beitreten?
              </Text>
            </View>

            {joinHousehold.isError && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full">
                <Text className="text-sm text-red-600 text-center">
                  {joinHousehold.error instanceof Error
                    ? joinHousehold.error.message
                    : 'Etwas ist schiefgelaufen.'}
                </Text>
              </View>
            )}

            {joinHousehold.isPending ? (
              <ActivityIndicator size="large" color="#2D6A4F" />
            ) : (
              <View className="w-full gap-3">
                <Button label="Ja, beitreten" onPress={handleJoin} />
                <Button label="Nein, abbrechen" variant="secondary" onPress={handleDecline} />
              </View>
            )}
          </>
        )}

      </View>
    </View>
  );
}
