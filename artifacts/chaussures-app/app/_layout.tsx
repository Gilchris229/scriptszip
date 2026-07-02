import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StoreProvider } from '@/context/StoreContext';
import { useColors } from '@/hooks/useColors';
import { useStockAlerts } from '@/hooks/useStockAlerts';

SplashScreen.preventAutoHideAsync();

// Register service worker for offline support on web
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

const queryClient = new QueryClient();

function StockAlertsInit() {
  const { checkAndNotify, requestPermissions } = useStockAlerts();
  useEffect(() => {
    requestPermissions().then(() => checkAndNotify());
  }, []);
  return null;
}

function ThemedStack() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Retour',
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="historique" options={{ title: 'Historique' }} />
      <Stack.Screen name="credit" options={{ title: 'Crédit (ancien)' }} />
      <Stack.Screen name="statistiques" options={{ title: 'Statistiques' }} />
      <Stack.Screen name="reglages" options={{ title: 'Réglages' }} />
      <Stack.Screen name="stock/[id]" options={{ title: 'Modifier article' }} />
      <Stack.Screen name="recu/[id]" options={{ title: 'Reçu de vente' }} />
      <Stack.Screen name="recu-credit/[id]" options={{ title: 'Reçu crédit' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <StoreProvider>
                <StockAlertsInit />
                <ThemedStack />
              </StoreProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
