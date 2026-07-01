import React from 'react';
import { Platform, StyleSheet, useColorScheme, View, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStockAlerts } from '@/hooks/useStockAlerts';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Accueil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="achats">
        <Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
        <Label>Achats</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ventes">
        <Icon sf={{ default: 'bag', selected: 'bag.fill' }} />
        <Label>Ventes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stock">
        <Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} />
        <Label>Stock</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="credits">
        <Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        <Label>Crédit</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plus">
        <Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
        <Label>Plus</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function StockTabIcon({ color, isIOS }: { color: string; isIOS: boolean }) {
  const { getLowStockCount } = useStockAlerts();
  const count = getLowStockCount();
  return (
    <View style={{ position: 'relative' }}>
      {isIOS
        ? <SymbolView name="shippingbox" tintColor={color} size={22} />
        : <Ionicons name="cube-outline" size={20} color={color} />}
      {count > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -6,
          backgroundColor: '#ef4444', borderRadius: 7,
          minWidth: 14, height: 14,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 2,
        }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="house" tintColor={color} size={22} />
              : <Ionicons name="home-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="achats"
        options={{
          title: 'Achats',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="cart" tintColor={color} size={22} />
              : <Ionicons name="cart-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ventes"
        options={{
          title: 'Ventes',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="bag" tintColor={color} size={22} />
              : <Ionicons name="bag-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color }) => <StockTabIcon color={color} isIOS={isIOS} />,
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: 'Crédit',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="creditcard" tintColor={color} size={22} />
              : <Ionicons name="card-outline" size={20} color={color} />,
          tabBarActiveTintColor: '#f97316',
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="square.grid.2x2" tintColor={color} size={22} />
              : <Ionicons name="grid-outline" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
