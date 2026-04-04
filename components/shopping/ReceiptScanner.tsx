import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPhoto,
} from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { invokeFunction, uploadReceiptImage } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedReceiptItem {
  itemName: string;
  priceEur: number | null;
  supermarket: string | null;
}

interface ProcessReceiptResult {
  success: boolean;
  itemCount: number;
  items: ParsedReceiptItem[];
}

interface ReceiptScannerProps {
  onClose: () => void;
  onSuccess?: (items: ParsedReceiptItem[]) => void;
}

type ScannerState = 'camera' | 'processing' | 'result' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptScanner({ onClose, onSuccess }: ReceiptScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerState, setScannerState] = useState<ScannerState>('camera');
  const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([]);
  const [parseSuccess, setParseSuccess] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // ── Permission not yet determined ─────────────────────────────────────────
  if (!permission) {
    return <LoadingView />;
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8 gap-6">
        <Text className="text-4xl">📷</Text>
        <Text className="text-white text-xl font-bold text-center">Camera access needed</Text>
        <Text className="text-gray-400 text-sm text-center">
          PlatePlan needs camera access to scan your receipts.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="px-6 py-3 rounded-xl bg-[#2D6A4F]"
        >
          <Text className="text-white font-semibold">Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-gray-400 text-sm">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────────
  async function handleCapture() {
    if (!cameraRef.current || scannerState !== 'camera') return;

    try {
      setScannerState('processing');

      const photo: CameraCapturedPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      // Get current user ID for the storage path
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const imageUrl = await uploadReceiptImage(
        session.user.id,
        photo.uri,
        'image/jpeg',
      );

      // Call the process-receipt Edge Function
      const result = await invokeFunction<
        { receiptImageUrl: string; purchasedAt: string },
        ProcessReceiptResult
      >('process-receipt', {
        receiptImageUrl: imageUrl,
        purchasedAt: new Date().toISOString().split('T')[0],
      });

      setParsedItems(result.items ?? []);
      setParseSuccess(result.success);
      setScannerState('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process receipt';
      setErrorMessage(msg);
      setScannerState('error');
    }
  }

  if (scannerState === 'processing') {
    return <ProcessingView />;
  }

  if (scannerState === 'result') {
    return (
      <ResultView
        items={parsedItems}
        parseSuccess={parseSuccess}
        onDone={() => {
          onSuccess?.(parsedItems);
          onClose();
        }}
        onRetry={() => setScannerState('camera')}
      />
    );
  }

  if (scannerState === 'error') {
    return (
      <ErrorView
        message={errorMessage ?? 'An error occurred'}
        onRetry={() => {
          setErrorMessage(null);
          setScannerState('camera');
        }}
        onClose={onClose}
      />
    );
  }

  // Default: camera view
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        className="flex-1"
        facing="back"
      >
        {/* Viewfinder overlay */}
        <View className="flex-1 justify-between">
          {/* Top bar */}
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            >
              <Text className="text-white text-xl">✕</Text>
            </TouchableOpacity>
            <Text className="text-white font-semibold text-base">Scan receipt</Text>
            <View className="w-10" />
          </View>

          {/* Receipt guide frame */}
          <View className="items-center">
            <View
              className="border-2 border-white/60 rounded-2xl"
              style={{ width: 280, height: 380 }}
            >
              {/* Corner accents */}
              <CornerAccent position="top-left" />
              <CornerAccent position="top-right" />
              <CornerAccent position="bottom-left" />
              <CornerAccent position="bottom-right" />
            </View>
            <Text className="text-white/70 text-sm mt-4 text-center px-8">
              Position the receipt inside the frame
            </Text>
          </View>

          {/* Bottom controls */}
          <View className="items-center pb-12 gap-4">
            <Pressable
              onPress={handleCapture}
              className="w-20 h-20 rounded-full bg-white items-center justify-center active:opacity-80"
              style={{
                shadowColor: '#fff',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <View className="w-16 h-16 rounded-full bg-white border-4 border-gray-300" />
            </Pressable>
            <Text className="text-white/60 text-xs">Tap to capture</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <View className="flex-1 bg-black items-center justify-center">
      <ActivityIndicator color="#fff" />
    </View>
  );
}

function ProcessingView() {
  return (
    <View className="flex-1 bg-black items-center justify-center gap-5 px-8">
      <ActivityIndicator color="#52B788" size="large" />
      <Text className="text-white text-xl font-bold text-center">Processing receipt…</Text>
      <Text className="text-gray-400 text-sm text-center">
        Uploading and reading your receipt. This takes a few seconds.
      </Text>
    </View>
  );
}

function ResultView({
  items,
  parseSuccess,
  onDone,
  onRetry,
}: {
  items: ParsedReceiptItem[];
  parseSuccess: boolean;
  onDone: () => void;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 bg-[#F8F9FA]">
      {/* Header */}
      <View className="px-5 pt-14 pb-4 gap-2">
        <Text className="text-2xl font-bold text-[#1A1A2E]">
          {parseSuccess ? 'Receipt scanned' : 'Partial result'}
        </Text>
        {!parseSuccess && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Text className="text-sm text-amber-700">
              We couldn't read some items — they won't affect your plan.
            </Text>
          </View>
        )}
        {parseSuccess && items.length === 0 && (
          <Text className="text-sm text-[#6B7280]">No items could be parsed from this receipt.</Text>
        )}
        {items.length > 0 && (
          <Text className="text-sm text-[#6B7280]">
            Found {items.length} item{items.length !== 1 ? 's' : ''}. These have been saved to your price history.
          </Text>
        )}
      </View>

      {/* Items list */}
      {items.length > 0 && (
        <View
          className="mx-5 bg-white rounded-2xl overflow-hidden"
          style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
        >
          {items.slice(0, 20).map((item, idx) => (
            <View key={idx}>
              {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-sm text-[#1A1A2E] flex-1 capitalize" numberOfLines={1}>
                  {item.itemName}
                </Text>
                {item.priceEur != null && (
                  <Text className="text-sm font-semibold text-[#2D6A4F] ml-3">
                    €{item.priceEur.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          ))}
          {items.length > 20 && (
            <View className="px-4 py-3 border-t border-gray-100">
              <Text className="text-sm text-[#9CA3AF]">
                +{items.length - 20} more items saved
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View className="absolute bottom-10 left-5 right-5 gap-3">
        <TouchableOpacity
          onPress={onDone}
          className="h-[52px] rounded-xl bg-[#2D6A4F] items-center justify-center"
        >
          <Text className="text-white font-semibold text-base">Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRetry} className="items-center py-2">
          <Text className="text-sm text-[#6B7280]">Scan another receipt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ErrorView({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <View className="flex-1 bg-[#F8F9FA] items-center justify-center px-8 gap-6">
      <Text className="text-5xl">😕</Text>
      <Text className="text-xl font-bold text-[#1A1A2E] text-center">
        Couldn't process receipt
      </Text>
      <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full">
        <Text className="text-sm text-red-600 text-center">{message}</Text>
      </View>
      <TouchableOpacity
        onPress={onRetry}
        className="w-full h-[52px] rounded-xl bg-[#2D6A4F] items-center justify-center"
      >
        <Text className="text-white font-semibold">Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose}>
        <Text className="text-sm text-[#6B7280]">Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Corner accent for viewfinder ─────────────────────────────────────────────

type CornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function CornerAccent({ position }: { position: CornerPosition }) {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('left');

  return (
    <View
      style={{
        position: 'absolute',
        top: isTop ? -2 : undefined,
        bottom: isTop ? undefined : -2,
        left: isLeft ? -2 : undefined,
        right: isLeft ? undefined : -2,
        width: 24,
        height: 24,
        borderColor: '#52B788',
        borderTopWidth: isTop ? 3 : 0,
        borderBottomWidth: isTop ? 0 : 3,
        borderLeftWidth: isLeft ? 3 : 0,
        borderRightWidth: isLeft ? 0 : 3,
        borderTopLeftRadius: position === 'top-left' ? 8 : 0,
        borderTopRightRadius: position === 'top-right' ? 8 : 0,
        borderBottomLeftRadius: position === 'bottom-left' ? 8 : 0,
        borderBottomRightRadius: position === 'bottom-right' ? 8 : 0,
      }}
    />
  );
}
