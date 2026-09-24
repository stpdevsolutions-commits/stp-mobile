import { Stack } from 'expo-router';

export default function CalculadoraLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1565C0' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Calculadora de materiales' }} />
      <Stack.Screen name="[id]" options={{ title: 'Calcular', headerBackTitle: 'Calculadora' }} />
    </Stack>
  );
}
