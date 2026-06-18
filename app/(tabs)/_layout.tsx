import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1565C0' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#9E9E9E',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Proyectos',
          tabBarLabel: 'Proyectos',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="fichas"
        options={{
          title: 'Mis Fichas',
          tabBarLabel: 'Fichas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📝</Text>,
          href: null,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
