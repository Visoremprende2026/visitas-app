// ============================================================
//  app/(admin)/_layout.js — Tabs del administrador
// ============================================================

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#E5E7EB',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', backgroundColor: '#1E3A5F' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="invitaciones" options={{
        title: 'Invitaciones',
        tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="historial" options={{
        title: 'Historial',
        tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="propietarios" options={{
        title: 'Propietarios',
        tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
