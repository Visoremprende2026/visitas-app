// ============================================================
//  app/_layout.js — Layout raiz con AuthProvider
// ============================================================

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../hooks/useAuth';
import * as Notifications from 'expo-notifications';

// Configurar como se muestran las notificaciones cuando la app esta abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
