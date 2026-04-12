import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import { householdKeys } from '../../hooks/useHousehold';
import { callAPI } from '../../lib/api';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useHouseholdStore } from '../../stores/householdStore';

type Mode = 'choose' | 'create' | 'join';

export default function StepHousehold() {
  const store = useOnboardingStore();
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);
  const queryClient = useQueryClient();
  const { source } = useLocalSearchParams<{ source?: 'onboarding' | 'profile' }>();

  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('My Household');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanHandled = useRef(false);

  function leaveSetup() {
    if (source === 'profile') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
      return;
    }

    router.replace('/(tabs)');
  }

  async function handleCreate() {
    if (!householdName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your household.');
      return;
    }
    setLoading(true);
    try {
      setStatusText('Creating household...');
      const result = await callAPI<{ householdId: string; shortCode: string; expiresAt: string }>(
        '/api/households',
        {
          name: householdName.trim(),
          managedMealSlots: store.managedMealSlots,
          shoppingDays: store.shoppingDays,
          batchCookDays: store.batchCookDays,
        },
      );

      setActiveHouseholdId(result.householdId);
      await queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
      store.reset();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: '/household/invite' as any, params: { id: result.householdId, source: source ?? 'onboarding' } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const raw = inviteCode.trim();
    // Accept with or without PP- prefix (user might type just the suffix)
    const shortCode = raw.toUpperCase().startsWith('PP-') ? raw.toUpperCase() : `PP-${raw.toUpperCase()}`;
    if (shortCode.length < 9) {
      Alert.alert('Code erforderlich', 'Bitte gib den vollständigen Kurz-Code ein (z.B. PP-K7M2A9).');
      return;
    }
    setLoading(true);
    try {
      setStatusText('Joining household...');
      const result = await callAPI<{ householdId: string; householdName: string }>(
        '/api/households/join',
        { shortCode },
      );

      setActiveHouseholdId(result.householdId);
      await queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
      store.reset();
      leaveSetup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function openScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Kamera-Zugriff erforderlich', 'Bitte erlaube den Kamera-Zugriff in den Einstellungen.');
        return;
      }
    }
    scanHandled.current = false;
    setScannerOpen(true);
  }

  async function handleQRScanned({ data }: { data: string }) {
    if (scanHandled.current) return;
    // Extrahiere Short-Code aus plateplan://invite/PP-XXXXXX
    const match = data.match(/PP-[A-Z0-9]{6}/i);
    if (!match) return;
    scanHandled.current = true;
    setScannerOpen(false);

    const shortCode = match[0].toUpperCase();
    setLoading(true);
    try {
      setStatusText('Joining household...');
      const result = await callAPI<{ householdId: string; householdName: string }>(
        '/api/households/join',
        { shortCode },
      );
      setActiveHouseholdId(result.householdId);
      await queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
      store.reset();
      leaveSetup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Fehler', msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center gap-4 px-5">
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text className="text-base text-[#6B7280] text-center">{statusText}</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-8"
    >
      {/* Back button — exits to previous screen or mode */}
      <TouchableOpacity
        onPress={() => {
          if (mode !== 'choose') {
            setMode('choose');
          } else {
            leaveSetup();
          }
        }}
        className="self-start"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-[#2D6A4F] text-base font-medium">← Back</Text>
      </TouchableOpacity>

      {mode === 'choose' && (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-bold text-[#1A1A2E]">Set up your household</Text>
            <Text className="text-base text-[#6B7280]">
              Meal plans are shared with your household. Create one or join an existing one.
            </Text>
          </View>
          <View className="gap-4">
            <Button label="Create a new household" onPress={() => setMode('create')} />
            <Button
              label="Join with a code or link"
              variant="secondary"
              onPress={() => setMode('join')}
            />
          </View>
        </>
      )}

      {mode === 'create' && (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-bold text-[#1A1A2E]">Create your household</Text>
            <Text className="text-base text-[#6B7280]">
              Give your household a name to get started.
            </Text>
          </View>
          <View className="gap-6">
            <View className="gap-2">
              <Text className="text-sm font-medium text-[#1A1A2E]">Household name</Text>
              <TextInput
                className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-base text-[#1A1A2E]"
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="e.g. Our Home"
                autoFocus
                maxLength={50}
              />
            </View>
            <Button label="Create household" onPress={handleCreate} />
          </View>
        </>
      )}

      {mode === 'join' && (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-bold text-[#1A1A2E]">Haushalt beitreten</Text>
            <Text className="text-base text-[#6B7280]">
              Gib den Kurz-Code ein oder scanne den QR-Code des Haushalts.
            </Text>
          </View>
          <View className="gap-6">
            <View className="gap-2">
              <Text className="text-sm font-medium text-[#1A1A2E]">Kurz-Code</Text>
              <View className="flex-row bg-white border border-[#E5E7EB] rounded-xl overflow-hidden items-center">
                <View className="px-4 py-3 border-r border-[#E5E7EB] bg-[#F3F4F6]">
                  <Text className="text-base font-bold text-[#6B7280]">PP-</Text>
                </View>
                <TextInput
                  className="flex-1 px-4 py-3 text-base text-[#1A1A2E] font-bold tracking-widest"
                  value={inviteCode}
                  onChangeText={(text) => setInviteCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="K7M2A9"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  maxLength={6}
                  keyboardType="default"
                />
              </View>
            </View>
            <Button label="Haushalt beitreten" onPress={handleJoin} />
            <Button label="QR-Code scannen" variant="secondary" onPress={openScanner} />
          </View>
        </>
      )}
    </ScrollView>

    {/* QR Scanner Modal */}
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
      <View style={StyleSheet.absoluteFill} className="bg-black">
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleQRScanned}
        />
        {/* Viewfinder overlay */}
        <View className="flex-1 items-center justify-center">
          <View className="w-64 h-64 border-2 border-white rounded-2xl" />
          <Text className="text-white text-base mt-6 text-center px-8">
            QR-Code des Haushalts in den Rahmen halten
          </Text>
        </View>
        {/* Close button */}
        <TouchableOpacity
          onPress={() => setScannerOpen(false)}
          className="absolute top-14 right-5 bg-black/50 rounded-full px-4 py-2"
        >
          <Text className="text-white text-base font-medium">Schließen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
    </>
  );
}
