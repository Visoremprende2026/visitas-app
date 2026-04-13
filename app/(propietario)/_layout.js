// ============================================================
//  app/(propietario)/_layout.js — Tabs del propietario
// ============================================================

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PropietarioLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#E5E7EB',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', backgroundColor: '#1E3A5F' },
        headerStyle: { backgroundColor: '#1E3A5F' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },


      }}
    >
      <Tabs.Screen
        name="visitas"
        options={{
          title: 'Mis visitas',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nueva"
        options={{
          title: 'Nueva visita',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recibidas"
        options={{
          title: 'Recibidas',
          tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Mi cuenta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
