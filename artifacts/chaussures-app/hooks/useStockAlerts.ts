import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useStore } from '@/context/StoreContext';

const LOW_STOCK_THRESHOLD = 3;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useStockAlerts() {
  const { getStockList } = useStore();

  const getLowStockItems = useCallback(() => {
    return getStockList().filter(
      item => item.quantiteRestante > 0 && item.quantiteRestante <= LOW_STOCK_THRESHOLD
    );
  }, [getStockList]);

  const getLowStockCount = useCallback(() => {
    return getLowStockItems().length;
  }, [getLowStockItems]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  const sendLowStockNotification = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const lowItems = getLowStockItems();
    if (lowItems.length === 0) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Stock faible',
        body: `${lowItems.length} article${lowItems.length > 1 ? 's' : ''} sont presque épuisés. Pensez à réapprovisionner.`,
      },
      trigger: null,
    });
  }, [getLowStockItems, requestPermissions]);

  const checkAndNotify = useCallback(async () => {
    await sendLowStockNotification();
  }, [sendLowStockNotification]);

  return {
    getLowStockItems,
    getLowStockCount,
    checkAndNotify,
    requestPermissions,
    LOW_STOCK_THRESHOLD,
  };
}
