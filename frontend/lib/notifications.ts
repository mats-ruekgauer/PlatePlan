import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { translate } from './i18n';
import type { HydratedPlan, MealSlot, ScheduledMealNotification } from '../types';

// ─── Configure notification behaviour ────────────────────────────────────────
// Called once at app startup (e.g. in app/_layout.tsx).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Requests notification permission.
 * Returns true if granted, false otherwise.
 * Called on the onboarding step-complete screen.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const language = await getCurrentLanguage();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: translate(language, 'notifications.channel_name'),
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule notifications for a plan ───────────────────────────────────────

/**
 * Notification time per meal slot (24-hour, local time).
 * Dinner is always 20:30 per spec; others are best-effort.
 */
const NOTIFICATION_HOUR: Record<MealSlot, number> = {
  breakfast: 8,
  lunch: 13,
  dinner: 20,
  snack: 16,
};

const NOTIFICATION_MINUTE: Record<MealSlot, number> = {
  breakfast: 30,
  lunch: 0,
  dinner: 30,
  snack: 0,
};

/**
 * Schedules a post-meal rating notification for each managed meal slot in the plan.
 * Cancels any previously scheduled meal notifications before rescheduling.
 *
 * Returns the list of scheduled notification records (stored in AsyncStorage
 * by the caller if needed for cancellation).
 */
export async function schedulePlanNotifications(
  plan: HydratedPlan,
): Promise<ScheduledMealNotification[]> {
  // Cancel all existing meal-reminder notifications first
  await cancelAllMealNotifications();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  const scheduled: ScheduledMealNotification[] = [];
  const now = new Date();
  const language = await getCurrentLanguage();

  for (const day of plan.days) {
    // Calculate the absolute date for this day of the week
    const weekStart = new Date(plan.weekStart);
    const mealDate = new Date(weekStart);
    mealDate.setDate(weekStart.getDate() + day.dayOfWeek); // dayOfWeek 0=Mon offset

    for (const meal of day.meals) {
      const hour = NOTIFICATION_HOUR[meal.mealSlot];
      const minute = NOTIFICATION_MINUTE[meal.mealSlot];

      const triggerDate = new Date(mealDate);
      triggerDate.setHours(hour, minute, 0, 0);

      // Don't schedule notifications in the past
      if (triggerDate <= now) continue;

      const body = translate(language, 'notifications.feedback_body', {
        recipe: meal.recipe.title,
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: translate(language, 'notifications.feedback_title'),
          body,
          data: {
            plannedMealId: meal.id,
            screen: 'meal-detail',
          },
          // iOS: make the notification actionable
          categoryIdentifier: 'meal-feedback',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      scheduled.push({
        notificationId,
        plannedMealId: meal.id,
        recipeName: meal.recipe.title,
        scheduledFor: triggerDate.toISOString(),
      });
    }
  }

  return scheduled;
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────

/**
 * Cancels all scheduled notifications whose data contains `screen: 'meal-detail'`.
 * We tag our notifications so we don't accidentally cancel unrelated ones.
 */
export async function cancelAllMealNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const mealNotifications = scheduled.filter(
    (n) => n.content.data?.screen === 'meal-detail',
  );

  await Promise.all(
    mealNotifications.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier),
    ),
  );
}

/**
 * Cancels a single notification by its ID.
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// ─── Deep-link handling ───────────────────────────────────────────────────────

/**
 * Returns the `plannedMealId` from a received notification response, if present.
 * Use this in a `Notifications.addNotificationResponseReceivedListener` handler
 * to navigate to the correct meal detail screen.
 */
export function getMealIdFromNotificationResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data;
  if (
    data &&
    typeof data === 'object' &&
    'plannedMealId' in data &&
    typeof data.plannedMealId === 'string'
  ) {
    return data.plannedMealId;
  }
  return null;
}

// ─── iOS notification category (action buttons) ───────────────────────────────
// Registers a "Rate" quick action on the notification so the user can tap
// without opening the app. MVP: just opens the app to the meal screen.

export async function registerNotificationCategories(): Promise<void> {
  const language = await getCurrentLanguage();

  await Notifications.setNotificationCategoryAsync('meal-feedback', [
    {
      identifier: 'rate',
      buttonTitle: translate(language, 'notifications.rate_meal'),
      options: { opensAppToForeground: true },
    },
  ]);
}

async function getCurrentLanguage(): Promise<'en' | 'de'> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const value = await AsyncStorage.default.getItem('plateplan-language');
    return value === 'de' ? 'de' : 'en';
  } catch {
    return 'en';
  }
}
