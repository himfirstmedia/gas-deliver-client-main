import { Stack } from "expo-router";
import { AuthProvider } from '../contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            // Optional: Add animation and styling options
            animation: 'slide_from_right', // or 'fade', 'flip', etc.
            contentStyle: { backgroundColor: '#FFFFFF' }, // Match your app's background
          }} 
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}