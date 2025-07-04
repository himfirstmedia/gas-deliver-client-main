// app/email-verification.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { apiService } from '../services/api';

export default function EmailVerificationScreen() {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get email from navigation params
  const email = params.email as string || '';
  const userId = params.userId as string || '';

  // Refs for input focus management
  const inputRefs = useRef<(TextInput | null)[]>([]);

  /**
   * Handle input change for verification code
   */
  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handle backspace for verification code
   */
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Handle verification submission using API service
   */
  const handleVerify = async () => {
    const code = verificationCode.join('');
    
    if (code.length !== 4) {
      Alert.alert('Invalid Code', 'Please enter the complete 4-digit verification code.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call the email verification API using the API service
      await apiService.verifyEmail(code);
      
      Alert.alert(
        'Email Verified!',
        'Your email has been successfully verified. You can now log in to your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login screen with email pre-filled
              router.push({
                pathname: '/',
                params: { email, verified: 'true' }
              });
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Verification error:', error);
      
      let errorMessage = 'Verification failed. Please try again.';
      
      if (error.message) {
        switch (true) {
          case error.message.includes('Invalid token'):
            errorMessage = 'The verification code is invalid. Please check the code and try again.';
            break;
          case error.message.includes('Token expired'):
            errorMessage = 'The verification code has expired. Please request a new one.';
            break;
          case error.message.includes('Token required'):
            errorMessage = 'Please enter the verification code.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      Alert.alert('Verification Failed', errorMessage);
      
      // Clear the code inputs on error
      setVerificationCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
      
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle resend verification code using API service
   */
  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please go back and try signing up again.');
      return;
    }

    try {
      setIsResending(true);
      
      // Call the resend verification API using the API service
      await apiService.resendVerification(email);
      
      Alert.alert(
        'Code Sent',
        'A new verification code has been sent to your email address.'
      );
      
      // Clear existing code
      setVerificationCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
      
    } catch (error: any) {
      console.error('Resend error:', error);
      
      let errorMessage = 'Failed to resend verification code. Please try again.';
      
      if (error.message) {
        switch (true) {
          case error.message.includes('User not found or already verified'):
            errorMessage = 'This email is already verified or does not exist.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      Alert.alert('Resend Failed', errorMessage);
      
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Navigate back to signup
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Navigate to login
   */
  const navigateToLogin = () => {
    router.push('/');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack} disabled={isLoading}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {/* Email Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={64} color="#db2127" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 4-digit verification code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* Verification Code Inputs */}
        <View style={styles.codeContainer}>
          {verificationCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={styles.codeInput}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              editable={!isLoading}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, isLoading && styles.disabledButton]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={[styles.verifyButtonText, { marginLeft: 10 }]}>Verifying...</Text>
            </View>
          ) : (
            <Text style={styles.verifyButtonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity 
            onPress={handleResendCode} 
            disabled={isLoading || isResending}
          >
            <Text style={[styles.resendLink, (isLoading || isResending) && styles.disabledLink]}>
              {isResending ? 'Sending...' : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already verified? </Text>
          <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
            <Text style={[styles.loginLink, isLoading && styles.disabledLink]}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <Text style={styles.helpText}>
          Check your spam folder if you don't see the email. The verification code expires in 24 hours.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  formContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: '#db2127',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#ffffff',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  verifyButton: {
    backgroundColor: '#db2127',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    minWidth: 200,
    shadowColor: '#db2127',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 16,
    color: '#666',
  },
  resendLink: {
    fontSize: 16,
    color: '#db2127',
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#db2127',
    fontWeight: '600',
  },
  disabledLink: {
    color: '#cccccc',
  },
  helpText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});