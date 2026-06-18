import { Stack } from 'expo-router';

export default function FichasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1565C0' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Fichas del proyecto' }} />
      <Stack.Screen name="nueva" options={{ title: 'Nueva ficha eléctrica', headerBackTitle: 'Fichas' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle de ficha', headerBackTitle: 'Fichas' }} />
    </Stack>
  );
}
