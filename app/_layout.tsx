// _layout.tsx
import { Stack } from "expo-router";
import { AuthProvider } from '../contexts/AuthContext'; // Adjust path based on your project structure

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  );
}