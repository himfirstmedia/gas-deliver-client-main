import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  // Configure navigation bar for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#000000'); // Black navigation bar
      NavigationBar.setButtonStyleAsync('light'); // White buttons on black background
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* Configure status bar to match your app theme */}
        <StatusBar 
          style="light" // White text/icons on dark background
          backgroundColor="#F50101" // Your app's red color
          translucent={false} // Ensures consistent behavior
        />
        <Stack 
          screenOptions={{ 
            headerShown: false,
            // Optional: Add animation and styling options
            animation: 'slide_from_right', // or 'fade', 'flip', etc.
            contentStyle: { backgroundColor: '#f8f9fa' }, // Match your app's background
          }} 
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}