import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from './supabase';
import type { AppLanguage, MealSlot, MealStatus } from '../types';

const LANGUAGE_STORAGE_KEY = 'plateplan-language';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'de'];

const translations = {
  en: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.loading': 'Loading…',
    'common.error': 'Error',
    'common.today': 'Today',
    'common.none': 'None',
    'common.not_set': 'Not set',
    'common.refresh': 'Refresh',
    'common.language': 'Language',
    'common.language_applies_immediately': 'Applied immediately across the app',
    'common.english': 'English',
    'common.german': 'Deutsch',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.generating': 'Generating…',
    'common.saving': 'Saving…',
    'common.minutes_short': 'min',
    'common.coming_soon': 'Coming soon',
    'tabs.meal_plan': 'Meal Plan',
    'tabs.shopping': 'Shopping',
    'tabs.profile': 'Profile',
    'welcome.tagline': 'Your personal AI meal planner. Stop thinking about what to cook.',
    'welcome.get_started': 'Get started',
    'welcome.have_account': 'I already have an account',
    'auth.enter_valid_email': 'Enter a valid email',
    'auth.password_min_6': 'Password must be at least 6 characters',
    'auth.password_min_8': 'Password must be at least 8 characters',
    'auth.passwords_do_not_match': 'Passwords do not match',
    'auth.sign_in_failed': 'Sign in failed',
    'auth.sign_up_failed': 'Sign up failed',
    'auth.please_try_again': 'Please try again.',
    'auth.welcome_back': 'Welcome back',
    'auth.sign_in_subtitle': 'Sign in to your PlatePlan account.',
    'auth.create_account': 'Create account',
    'auth.sign_up_subtitle': 'Set up your PlatePlan account in seconds.',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm password',
    'auth.no_account': 'No account?',
    'auth.sign_up': 'Sign up',
    'auth.already_have_account': 'Already have an account?',
    'auth.sign_in': 'Sign in',
    'auth.create_account_button': 'Create account',
    'auth.sign_in_button': 'Sign in',
    'auth.min_8_characters': 'Min. 8 characters',
    'auth.repeat_password': 'Repeat password',
    'profile.title': 'Profile',
    'profile.your_account': 'Your account',
    'profile.account': 'Account',
    'profile.manage_profile_settings': 'Language, name and account settings',
    'profile.open_profile_settings': 'Open profile settings',
    'profile.nutrition_targets': 'Nutrition targets',
    'profile.daily_calories': 'Daily calories',
    'profile.daily_protein': 'Daily protein',
    'profile.edit_goals': 'Edit goals',
    'profile.meal_planning': 'Meal planning',
    'profile.managed_meals': 'Managed meals',
    'profile.batch_cooking': 'Batch cooking',
    'profile.cook_fresh_daily': 'Cook fresh daily',
    'profile.cook_for_days': 'Cook for {days} days',
    'profile.max_cook_time': 'Max cook time',
    'profile.edit_meal_slots': 'Edit meal slots',
    'profile.food_preferences': 'Food preferences',
    'profile.dietary_restrictions': 'Dietary restrictions',
    'profile.liked_cuisines': 'Liked cuisines',
    'profile.none_selected': 'None selected',
    'profile.edit_preferences': 'Edit preferences',
    'profile.favourite_dishes': 'Favourite dishes',
    'profile.no_favourites_yet': 'No favourites yet.',
    'profile.add_manually': '+ Add manually',
    'profile.automations': 'Automations',
    'profile.apple_reminders': 'Apple Reminders',
    'profile.export_list_when_plan_generated': 'Export shopping list when plan is generated',
    'profile.send_via_sms': 'Send via SMS',
    'profile.share_list_when_plan_generated': 'Share shopping list when plan is generated',
    'profile.contact_name': 'Contact name',
    'profile.phone_number': 'Phone number (e.g. +49123456789)',
    'profile.shopping': 'Shopping',
    'profile.shopping_days': 'Shopping days',
    'profile.edit_shopping_days': 'Edit shopping days',
    'profile.actions': 'Actions',
    'profile.regenerate_plan_title': 'Regenerate plan',
    'profile.regenerate_plan_message': "This will replace all of this week's meals. Continue?",
    'profile.regenerate': 'Regenerate',
    'profile.regenerating': 'Regenerating…',
    'profile.regenerate_this_weeks_plan': "Regenerate this week's plan",
    'profile.sign_out_title': 'Sign out',
    'profile.are_you_sure': 'Are you sure?',
    'profile.sign_out': 'Sign out',
    'profile.add_favourite_dish': 'Add favourite dish',
    'profile.dish_name': 'Dish name...',
    'profile.add': 'Add',
    'profile_settings.title': 'Profile settings',
    'profile_settings.subtitle': 'Manage your account and app language',
    'profile_settings.account': 'Account',
    'profile_settings.display_name': 'Display name',
    'profile_settings.display_name_placeholder': 'How should we call you?',
    'profile_settings.email': 'Email',
    'profile_settings.security': 'Security',
    'profile_settings.change_email': 'Change email',
    'profile_settings.change_email_hint': 'This will live here once email updates are supported.',
    'profile_settings.change_password': 'Change password',
    'profile_settings.change_password_hint': 'Password reset and update options will be added here.',
    'profile_settings.saved_title': 'Saved',
    'profile_settings.saved_message': 'Your profile was updated.',
    'profile_settings.save_failed': 'Failed to save profile settings.',
    'settings.title': 'Food preferences',
    'settings.subtitle': 'Changes apply to future meal plans',
    'settings.app_language': 'App language',
    'settings.dietary_restrictions': 'Dietary restrictions',
    'settings.favourite_ingredients': 'Favourite ingredients',
    'settings.favourite_ingredients_hint': "We'll try to include these in your meals.",
    'settings.favourite_ingredients_placeholder': 'e.g. salmon, spinach, chickpeas...',
    'settings.disliked_ingredients': 'Disliked ingredients',
    'settings.disliked_ingredients_placeholder': 'e.g. mushrooms, olives...',
    'settings.favourite_cuisines': 'Favourite cuisines',
    'settings.favourite_cuisines_hint': "Select any you enjoy — we'll prioritise these.",
    'settings.seasonal_ingredients': 'Seasonal ingredients',
    'settings.seasonal_ingredients_hint': 'How much should we favour seasonal produce?',
    'settings.cooking_from_scratch': 'Cooking from scratch',
    'settings.cooking_from_scratch_hint': 'How much do you prefer cooking from raw ingredients?',
    'settings.convenience': 'Convenience',
    'settings.always_scratch': 'Always scratch',
    'settings.save_failed': 'Failed to save preferences',
    'settings.seasonality.none': 'None',
    'settings.seasonality.low': 'Low',
    'settings.seasonality.some': 'Some',
    'settings.seasonality.high': 'High',
    'settings.seasonality.always': 'Always',
    'settings.scratch.1': 'Convenience',
    'settings.scratch.2': 'Mostly prep',
    'settings.scratch.3': 'Mix',
    'settings.scratch.4': 'Mostly scratch',
    'settings.scratch.5': 'Always scratch',
    'plan.previous_week': 'Previous week',
    'plan.no_plan_yet': 'No plan yet',
    'plan.generate_hint': 'Tap below to generate a weekly meal plan.',
    'plan.generate_plan': 'Generate plan',
    'plan.next_week': 'Next week',
    'plan.plan_next_week': 'Plan next week',
    'plan.go_to_today': 'Today',
    'plan.regenerate_plan_title': 'Regenerate plan',
    'plan.regenerate_plan_message': "This will replace this week's meals with a new AI-generated plan. Continue?",
    'plan.regenerate': 'Regenerate',
    'plan.failed_regenerate_meal': 'Failed to regenerate meal. Please try again.',
    'plan.failed_generate_plan': 'Failed to generate plan. Please try again.',
    'plan.finding_different_meal': 'Finding a different meal…',
    'shopping.no_meal_plan_yet': 'No meal plan yet',
    'shopping.generate_plan_first': 'Generate a meal plan first, then your shopping list will appear here.',
    'shopping.no_list_yet': 'No shopping list yet',
    'shopping.generate_from_plan': 'Generate a list from your current meal plan.',
    'shopping.generate_list': 'Generate shopping list',
    'shopping.refreshing': 'Refreshing…',
    'shopping.all_done': 'All done! ✓',
    'shopping.items_progress': '{checked} of {total} items',
    'shopping.banner_done': 'You have everything you need!',
    'shopping.category.produce': '🥦 Produce',
    'shopping.category.meat': '🥩 Meat & Fish',
    'shopping.category.dairy': '🥛 Dairy',
    'shopping.category.pantry': '🫙 Pantry',
    'shopping.category.spice': '🧂 Spices',
    'shopping.category.other': '📦 Other',
    'day.today': 'Today',
    'day.no_meals_planned': 'No meals planned',
    'meal_slot.breakfast': 'Breakfast',
    'meal_slot.lunch': 'Lunch',
    'meal_slot.dinner': 'Dinner',
    'meal_slot.snack': 'Snack',
    'meal_status.recommended': 'Recommended',
    'meal_status.planned': 'Planned',
    'meal_status.prepared': 'Prepared',
    'meal_status.cooked': 'Cooked',
    'meal_status.rated': 'Rated',
    'meal_status.skipped': 'Skipped',
    'meal.approve': 'Approve',
    'meal.skip': 'Skip',
    'meal.undo_skip': 'Undo skip',
    'meal.different': 'Different',
    'meal.protein': 'protein',
    'meal.batch': 'Batch',
    'meal.swapped': 'Swapped',
    'meal.not_found': 'Meal not found',
    'meal.go_back': 'Go back',
    'meal.seasonal': 'Seasonal',
    'meal.share_recipe': 'Share recipe',
    'meal.ingredients': 'Ingredients',
    'meal.instructions': 'Instructions',
    'meal.how_was_it': 'How was it?',
    'meal.taste': 'Taste',
    'meal.portion_size': 'Portion size',
    'meal.would_cook_again': 'Would you cook this again?',
    'meal.notes_optional': 'Notes (optional)',
    'meal.notes_placeholder': "Anything you'd change next time?",
    'meal.submit_feedback': 'Submit feedback',
    'meal.update_feedback': 'Update feedback',
    'meal.feedback_saved': 'Feedback saved',
    'meal.thanks_title': 'Thanks!',
    'meal.thanks_message': 'Your feedback helps improve future plans.',
    'meal.feedback_failed': 'Failed to save feedback.',
    'meal.calories': 'Calories',
    'meal.carbs': 'Carbs',
    'meal.fat': 'Fat',
    'meal.portion.too_small': 'Too small',
    'meal.portion.perfect': 'Perfect',
    'meal.portion.too_much': 'Too much',
    'notifications.channel_name': 'Meal reminders',
    'notifications.feedback_title': 'How was your meal?',
    'notifications.feedback_body': 'How was {recipe}? Tap to rate it.',
    'notifications.rate_meal': 'Rate meal',
    'weekday.short.sun': 'Sun',
    'weekday.short.mon': 'Mon',
    'weekday.short.tue': 'Tue',
    'weekday.short.wed': 'Wed',
    'weekday.short.thu': 'Thu',
    'weekday.short.fri': 'Fri',
    'weekday.short.sat': 'Sat',
  },
  de: {
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.continue': 'Weiter',
    'common.back': 'Zurück',
    'common.loading': 'Lädt…',
    'common.error': 'Fehler',
    'common.today': 'Heute',
    'common.none': 'Keine',
    'common.not_set': 'Nicht gesetzt',
    'common.refresh': 'Aktualisieren',
    'common.language': 'Sprache',
    'common.language_applies_immediately': 'Wird sofort in der App angewendet',
    'common.english': 'English',
    'common.german': 'Deutsch',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.generating': 'Wird erstellt…',
    'common.saving': 'Speichert…',
    'common.minutes_short': 'Min.',
    'common.coming_soon': 'Bald verfügbar',
    'tabs.meal_plan': 'Essensplan',
    'tabs.shopping': 'Einkauf',
    'tabs.profile': 'Profil',
    'welcome.tagline': 'Dein persönlicher KI-Essensplaner. Kein Grübeln mehr, was du kochen sollst.',
    'welcome.get_started': 'Loslegen',
    'welcome.have_account': 'Ich habe schon ein Konto',
    'auth.enter_valid_email': 'Gib eine gültige E-Mail ein',
    'auth.password_min_6': 'Das Passwort muss mindestens 6 Zeichen haben',
    'auth.password_min_8': 'Das Passwort muss mindestens 8 Zeichen haben',
    'auth.passwords_do_not_match': 'Die Passwörter stimmen nicht überein',
    'auth.sign_in_failed': 'Anmeldung fehlgeschlagen',
    'auth.sign_up_failed': 'Registrierung fehlgeschlagen',
    'auth.please_try_again': 'Bitte versuche es erneut.',
    'auth.welcome_back': 'Willkommen zurück',
    'auth.sign_in_subtitle': 'Melde dich bei deinem PlatePlan-Konto an.',
    'auth.create_account': 'Konto erstellen',
    'auth.sign_up_subtitle': 'Richte dein PlatePlan-Konto in wenigen Sekunden ein.',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.confirm_password': 'Passwort bestätigen',
    'auth.no_account': 'Noch kein Konto?',
    'auth.sign_up': 'Registrieren',
    'auth.already_have_account': 'Du hast schon ein Konto?',
    'auth.sign_in': 'Anmelden',
    'auth.create_account_button': 'Konto erstellen',
    'auth.sign_in_button': 'Anmelden',
    'auth.min_8_characters': 'Mind. 8 Zeichen',
    'auth.repeat_password': 'Passwort wiederholen',
    'profile.title': 'Profil',
    'profile.your_account': 'Dein Konto',
    'profile.account': 'Konto',
    'profile.manage_profile_settings': 'Sprache, Name und Kontoeinstellungen',
    'profile.open_profile_settings': 'Profileinstellungen öffnen',
    'profile.nutrition_targets': 'Nährwertziele',
    'profile.daily_calories': 'Kalorien pro Tag',
    'profile.daily_protein': 'Protein pro Tag',
    'profile.edit_goals': 'Ziele bearbeiten',
    'profile.meal_planning': 'Essensplanung',
    'profile.managed_meals': 'Geplante Mahlzeiten',
    'profile.batch_cooking': 'Batch Cooking',
    'profile.cook_fresh_daily': 'Täglich frisch kochen',
    'profile.cook_for_days': 'Für {days} Tage kochen',
    'profile.max_cook_time': 'Max. Kochzeit',
    'profile.edit_meal_slots': 'Mahlzeiten bearbeiten',
    'profile.food_preferences': 'Essensvorlieben',
    'profile.dietary_restrictions': 'Ernährungsregeln',
    'profile.liked_cuisines': 'Bevorzugte Küchen',
    'profile.none_selected': 'Nichts ausgewählt',
    'profile.edit_preferences': 'Vorlieben bearbeiten',
    'profile.favourite_dishes': 'Lieblingsgerichte',
    'profile.no_favourites_yet': 'Noch keine Favoriten.',
    'profile.add_manually': '+ Manuell hinzufügen',
    'profile.automations': 'Automationen',
    'profile.apple_reminders': 'Apple Erinnerungen',
    'profile.export_list_when_plan_generated': 'Einkaufsliste exportieren, wenn ein Plan erstellt wird',
    'profile.send_via_sms': 'Per SMS senden',
    'profile.share_list_when_plan_generated': 'Einkaufsliste teilen, wenn ein Plan erstellt wird',
    'profile.contact_name': 'Kontaktname',
    'profile.phone_number': 'Telefonnummer (z. B. +49123456789)',
    'profile.shopping': 'Einkauf',
    'profile.shopping_days': 'Einkaufstage',
    'profile.edit_shopping_days': 'Einkaufstage bearbeiten',
    'profile.actions': 'Aktionen',
    'profile.regenerate_plan_title': 'Plan neu erstellen',
    'profile.regenerate_plan_message': 'Dadurch werden alle Mahlzeiten dieser Woche ersetzt. Fortfahren?',
    'profile.regenerate': 'Neu erstellen',
    'profile.regenerating': 'Wird neu erstellt…',
    'profile.regenerate_this_weeks_plan': 'Plan dieser Woche neu erstellen',
    'profile.sign_out_title': 'Abmelden',
    'profile.are_you_sure': 'Bist du sicher?',
    'profile.sign_out': 'Abmelden',
    'profile.add_favourite_dish': 'Lieblingsgericht hinzufügen',
    'profile.dish_name': 'Gerichtname...',
    'profile.add': 'Hinzufügen',
    'profile_settings.title': 'Profileinstellungen',
    'profile_settings.subtitle': 'Verwalte dein Konto und die App-Sprache',
    'profile_settings.account': 'Konto',
    'profile_settings.display_name': 'Anzeigename',
    'profile_settings.display_name_placeholder': 'Wie sollen wir dich nennen?',
    'profile_settings.email': 'E-Mail',
    'profile_settings.security': 'Sicherheit',
    'profile_settings.change_email': 'E-Mail ändern',
    'profile_settings.change_email_hint': 'Sobald E-Mail-Änderungen unterstützt werden, erscheint das hier.',
    'profile_settings.change_password': 'Passwort ändern',
    'profile_settings.change_password_hint': 'Optionen zum Zurücksetzen und Ändern des Passworts kommen hier hin.',
    'profile_settings.saved_title': 'Gespeichert',
    'profile_settings.saved_message': 'Dein Profil wurde aktualisiert.',
    'profile_settings.save_failed': 'Profileinstellungen konnten nicht gespeichert werden.',
    'settings.title': 'Essensvorlieben',
    'settings.subtitle': 'Änderungen gelten für zukünftige Essenspläne',
    'settings.app_language': 'App-Sprache',
    'settings.dietary_restrictions': 'Ernährungsregeln',
    'settings.favourite_ingredients': 'Lieblingszutaten',
    'settings.favourite_ingredients_hint': 'Diese Zutaten bauen wir bevorzugt in deine Mahlzeiten ein.',
    'settings.favourite_ingredients_placeholder': 'z. B. Lachs, Spinat, Kichererbsen...',
    'settings.disliked_ingredients': 'Zutaten, die du nicht magst',
    'settings.disliked_ingredients_placeholder': 'z. B. Pilze, Oliven...',
    'settings.favourite_cuisines': 'Bevorzugte Küchen',
    'settings.favourite_cuisines_hint': 'Wähle alles aus, was du gern isst — das wird bevorzugt.',
    'settings.seasonal_ingredients': 'Saisonale Zutaten',
    'settings.seasonal_ingredients_hint': 'Wie stark sollen saisonale Produkte bevorzugt werden?',
    'settings.cooking_from_scratch': 'Von Grund auf kochen',
    'settings.cooking_from_scratch_hint': 'Wie gern kochst du mit rohen Grundzutaten?',
    'settings.convenience': 'Convenience',
    'settings.always_scratch': 'Immer frisch',
    'settings.save_failed': 'Speichern der Vorlieben fehlgeschlagen',
    'settings.seasonality.none': 'Gar nicht',
    'settings.seasonality.low': 'Wenig',
    'settings.seasonality.some': 'Etwas',
    'settings.seasonality.high': 'Stark',
    'settings.seasonality.always': 'Immer',
    'settings.scratch.1': 'Fertigprodukte',
    'settings.scratch.2': 'Meist vorbereitet',
    'settings.scratch.3': 'Gemischt',
    'settings.scratch.4': 'Meist frisch',
    'settings.scratch.5': 'Immer frisch',
    'plan.previous_week': 'Vorherige Woche',
    'plan.no_plan_yet': 'Noch kein Plan',
    'plan.generate_hint': 'Tippe unten, um einen Wochenplan zu erstellen.',
    'plan.generate_plan': 'Plan erstellen',
    'plan.next_week': 'Nächste Woche',
    'plan.plan_next_week': 'Nächste Woche planen',
    'plan.go_to_today': 'Heute',
    'plan.regenerate_plan_title': 'Plan neu erstellen',
    'plan.regenerate_plan_message': 'Dadurch wird der Wochenplan durch einen neuen KI-Plan ersetzt. Fortfahren?',
    'plan.regenerate': 'Neu erstellen',
    'plan.failed_regenerate_meal': 'Mahlzeit konnte nicht neu erstellt werden. Bitte versuche es erneut.',
    'plan.failed_generate_plan': 'Plan konnte nicht erstellt werden. Bitte versuche es erneut.',
    'plan.finding_different_meal': 'Es wird eine andere Mahlzeit gesucht…',
    'shopping.no_meal_plan_yet': 'Noch kein Essensplan',
    'shopping.generate_plan_first': 'Erstelle zuerst einen Essensplan, dann erscheint hier deine Einkaufsliste.',
    'shopping.no_list_yet': 'Noch keine Einkaufsliste',
    'shopping.generate_from_plan': 'Erstelle eine Liste aus deinem aktuellen Essensplan.',
    'shopping.generate_list': 'Einkaufsliste erstellen',
    'shopping.refreshing': 'Aktualisiert…',
    'shopping.all_done': 'Alles erledigt! ✓',
    'shopping.items_progress': '{checked} von {total} Artikeln',
    'shopping.banner_done': 'Du hast alles, was du brauchst!',
    'shopping.category.produce': '🥦 Obst & Gemüse',
    'shopping.category.meat': '🥩 Fleisch & Fisch',
    'shopping.category.dairy': '🥛 Milchprodukte',
    'shopping.category.pantry': '🫙 Vorräte',
    'shopping.category.spice': '🧂 Gewürze',
    'shopping.category.other': '📦 Sonstiges',
    'day.today': 'Heute',
    'day.no_meals_planned': 'Keine Mahlzeiten geplant',
    'meal_slot.breakfast': 'Frühstück',
    'meal_slot.lunch': 'Mittagessen',
    'meal_slot.dinner': 'Abendessen',
    'meal_slot.snack': 'Snack',
    'meal_status.recommended': 'Empfohlen',
    'meal_status.planned': 'Geplant',
    'meal_status.prepared': 'Vorbereitet',
    'meal_status.cooked': 'Gekocht',
    'meal_status.rated': 'Bewertet',
    'meal_status.skipped': 'Übersprungen',
    'meal.approve': 'Bestätigen',
    'meal.skip': 'Überspringen',
    'meal.undo_skip': 'Überspringen rückgängig',
    'meal.different': 'Andere',
    'meal.protein': 'Protein',
    'meal.batch': 'Batch',
    'meal.swapped': 'Getauscht',
    'meal.not_found': 'Mahlzeit nicht gefunden',
    'meal.go_back': 'Zurück',
    'meal.seasonal': 'Saisonal',
    'meal.share_recipe': 'Rezept teilen',
    'meal.ingredients': 'Zutaten',
    'meal.instructions': 'Zubereitung',
    'meal.how_was_it': 'Wie war es?',
    'meal.taste': 'Geschmack',
    'meal.portion_size': 'Portionsgröße',
    'meal.would_cook_again': 'Würdest du das wieder kochen?',
    'meal.notes_optional': 'Notizen (optional)',
    'meal.notes_placeholder': 'Was würdest du beim nächsten Mal ändern?',
    'meal.submit_feedback': 'Feedback senden',
    'meal.update_feedback': 'Feedback aktualisieren',
    'meal.feedback_saved': 'Feedback gespeichert',
    'meal.thanks_title': 'Danke!',
    'meal.thanks_message': 'Dein Feedback verbessert zukünftige Pläne.',
    'meal.feedback_failed': 'Feedback konnte nicht gespeichert werden.',
    'meal.calories': 'Kalorien',
    'meal.carbs': 'Kohlenh.',
    'meal.fat': 'Fett',
    'meal.portion.too_small': 'Zu wenig',
    'meal.portion.perfect': 'Perfekt',
    'meal.portion.too_much': 'Zu viel',
    'notifications.channel_name': 'Essens-Erinnerungen',
    'notifications.feedback_title': 'Wie war deine Mahlzeit?',
    'notifications.feedback_body': 'Wie war {recipe}? Tippe zum Bewerten.',
    'notifications.rate_meal': 'Mahlzeit bewerten',
    'weekday.short.sun': 'So',
    'weekday.short.mon': 'Mo',
    'weekday.short.tue': 'Di',
    'weekday.short.wed': 'Mi',
    'weekday.short.thu': 'Do',
    'weekday.short.fri': 'Fr',
    'weekday.short.sat': 'Sa',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'en' || value === 'de';
}

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const template = translations[language][key] ?? translations.en[key] ?? key;
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_match, token) => String(params[token] ?? ''));
}

export function getLocaleForLanguage(language: AppLanguage): string {
  return language === 'de' ? 'de-DE' : 'en-GB';
}

export function formatDateForLanguage(
  language: AppLanguage,
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getLocaleForLanguage(language), options).format(date);
}

export function getWeekdayName(
  language: AppLanguage,
  dayOfWeek: number,
  style: 'long' | 'short' = 'long',
): string {
  const mondayReference = new Date(Date.UTC(2024, 0, 1 + dayOfWeek, 12));
  return new Intl.DateTimeFormat(getLocaleForLanguage(language), {
    weekday: style,
    timeZone: 'UTC',
  }).format(mondayReference);
}

export function getMealSlotLabel(language: AppLanguage, slot: MealSlot): string {
  return translate(language, `meal_slot.${slot}` as TranslationKey);
}

export function getMealStatusLabel(language: AppLanguage, status: MealStatus): string {
  return translate(language, `meal_status.${status}` as TranslationKey);
}

export function getShoppingCategoryLabel(language: AppLanguage, category: string): string {
  const key = `shopping.category.${category}` as TranslationKey;
  return translations[language][key] ?? translations.en[key] ?? category;
}

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    let active = true;

    async function syncLanguage(userId?: string) {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (active && isSupportedLanguage(stored)) {
          setLanguageState(stored);
        }

        if (!userId) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          userId = session?.user?.id;
        }

        if (!userId) return;

        const { data } = await supabase
          .from('user_preferences')
          .select('preferred_language')
          .eq('user_id', userId)
          .maybeSingle();

        const preferred = (data as { preferred_language?: string } | null)?.preferred_language;
        if (active && isSupportedLanguage(preferred)) {
          setLanguageState(preferred);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, preferred);
        }
      } catch (error) {
        console.warn('[i18n] failed to sync language', error);
      }
    }

    syncLanguage();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncLanguage(session?.user?.id);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function setLanguage(nextLanguage: AppLanguage) {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: session.user.id,
          preferred_language: nextLanguage,
        } as never,
        { onConflict: 'user_id' },
      );

      if (error) {
        console.warn('[i18n] failed to persist language preference', error.message);
      }
    } catch (error) {
      console.warn('[i18n] failed to persist language preference', error);
    }
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return value;
}
