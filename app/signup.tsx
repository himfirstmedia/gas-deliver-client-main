import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// import { Picker } from '@react-native-picker/picker'; // Commented out as it's not being used in the provided code
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for a back arrow icon and eye icons
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext'; // Assuming AuthContext provides 'register'
import { apiService, RegisterData } from '../services/api'; // Assuming apiService and RegisterData are defined

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'customer' as 'customer' | 'driver' | 'admin',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Add state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register } = useAuth(); // Assuming useAuth hook provides a register function
  const router = useRouter();

  /**
   * Handles changes in text input fields.
   * @param field - The name of the form field.
   * @param value - The new value of the field.
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for the specific field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  /**
   * Validates the form data before submission.
   * @returns {boolean} - True if the form is valid, false otherwise.
   */
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    const { email, password, confirmPassword, firstName, lastName, phone } = formData;

    // Required field validation
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';

    // Email validation
    if (email && !isValidEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation: minimum length
    if (password && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Password strength validation: requires letters and numbers
    if (password && password.length >= 6) {
      const hasNumber = /\d/.test(password);
      const hasLetter = /[a-zA-Z]/.test(password);
      if (!hasNumber || !hasLetter) {
        newErrors.password = 'Password must contain both letters and numbers';
      }
    }

    // Confirm password validation: must match password
    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Phone validation: flexible format, accepts + and digits
    if (phone && !isValidPhone(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Name validation: only letters and spaces allowed
    if (firstName && !/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      newErrors.firstName = 'First name should only contain letters';
    }
    if (lastName && !/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      newErrors.lastName = 'Last name should only contain letters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Checks if an email address is valid.
   * @param email - The email string to validate.
   * @returns {boolean} - True if the email is valid, false otherwise.
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Checks if a phone number is valid using a flexible regex.
   * @param phone - The phone number string to validate.
   * @returns {boolean} - True if the phone number is valid, false otherwise.
   */
  const isValidPhone = (phone: string): boolean => {
    // Cleans the phone number by removing spaces, hyphens, and parentheses
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Regex for phone numbers: optional '+', then 1-9, then 7-14 digits
    const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
    return phoneRegex.test(cleanPhone);
  };

  /**
   * Handles the signup process.
   * Validates the form, calls the API service to create a user,
   * and handles success or error responses.
   */
const handleSignup = async () => {
    if (!validateForm()) {
      return; // Stop if form validation fails
    }

    try {
      setIsLoading(true); // Start loading state
      
      // Destructure formData, excluding confirmPassword as it's not sent to API
      const { confirmPassword, ...registrationData } = formData;
      
      // Clean and format data according to your API interface (RegisterData)
      const cleanedData: RegisterData = {
        email: registrationData.email.toLowerCase().trim(),
        password: registrationData.password,
        firstName: registrationData.firstName.trim(),
        lastName: registrationData.lastName.trim(),
        phone: registrationData.phone.replace(/[\s\-\(\)]/g, ''), // Clean phone number
        role: registrationData.role,
        address: registrationData.address?.trim() || undefined, // Address is optional
      };

      // Call the register endpoint from apiService instead of createUser
      const response = await apiService.register(cleanedData);
      
      console.log('User registered successfully:', response); // Log success

      // Show success alert and navigate to email verification
      Alert.alert(
        'Registration Successful', 
        'Please check your email for a 4-digit verification code.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form data after successful registration
              setFormData({
                email: '',
                password: '',
                confirmPassword: '',
                firstName: '',
                lastName: '',
                phone: '',
                role: 'customer',
                address: '',
              });
              
              // Navigate to email verification screen with email and userId
              router.push({
                pathname: '/email-verification',
                params: { 
                  email: cleanedData.email,
                  userId: response.user?.id || ''
                }
              });
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Registration error:', error); // Log the error

      let errorMessage = 'An error occurred during registration';
      
      // Custom error handling based on backend messages from your AuthController
      if (error.message) {
        switch (true) {
          case error.message.includes('Email already exists'):
            errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
            // Highlight the email field by setting an error for it
            setErrors(prev => ({ ...prev, email: 'Email already registered' }));
            break;
          case error.message.includes('Missing required fields'):
            errorMessage = 'Please fill in all required fields correctly.';
            break;
          case error.message.includes('Registration failed'):
            errorMessage = 'Unable to create your account. Please try again in a moment.';
            break;
          case error.message.includes('fetch'):
          case error.message.includes('Network'):
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case error.message.includes('500'):
            errorMessage = 'Server error. Please try again later or contact support.';
            break;
          default:
            errorMessage = error.message; // Use the raw error message if no specific handler
        }
      }
      
      // Show error alert to the user
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false); // End loading state
    }
  };
  /**
   * Navigates the user to the login screen.
   */
  const navigateToLogin = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback if there's no screen to go back to (e.g., direct access)
      router.replace('/'); // Or navigate to a specific default screen
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      // Adjust behavior based on platform to avoid keyboard obscuring inputs
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled" // Ensures taps outside text inputs don't dismiss keyboard
        showsVerticalScrollIndicator={false} // Hides the vertical scroll indicator
      >
        <View style={styles.formContainer}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack} disabled={isLoading}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {/* First Name & Last Name Row */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                placeholder="First name"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                autoCapitalize="words" // Capitalize first letter of each word
                editable={!isLoading} // Disable input when loading
                maxLength={50} // Max length for first name
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                placeholder="Last name"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                autoCapitalize="words" // Capitalize first letter of each word
                editable={!isLoading} // Disable input when loading
                maxLength={50} // Max length for last name
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address" // Optimized keyboard for email
              autoCapitalize="none" // Prevent auto-capitalization
              autoCorrect={false} // Disable auto-correction
              editable={!isLoading} // Disable input when loading
              maxLength={100} // Max length for email
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad" // Optimized keyboard for phone numbers
              editable={!isLoading} // Disable input when loading
              maxLength={20} // Max length for phone number
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Role Picker (commented out in original code) */}
          {/* <View style={styles.inputContainer}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                enabled={!isLoading}
                style={styles.picker}
              >
                <Picker.Item label="Customer" value="customer" />
                <Picker.Item label="Driver" value="driver" />
                <Picker.Item label="Admin" value="admin" />
              </Picker>
            </View>
          </View> */}

          {/* Address Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your address (optional)"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              multiline // Allow multiple lines of text
              numberOfLines={3} // Initial number of lines
              editable={!isLoading} // Disable input when loading
              maxLength={200} // Max length for address
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword} // Toggle based on showPassword state
                autoCapitalize="none" // Prevent auto-capitalization
                autoCorrect={false} // Disable auto-correction
                editable={!isLoading} // Disable input when loading
                maxLength={50} // Max length for password
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            <Text style={styles.helpText}>At least 6 characters with letters and numbers</Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword} // Toggle based on showConfirmPassword state
                autoCapitalize="none" // Prevent auto-capitalization
                autoCorrect={false} // Disable auto-correction
                editable={!isLoading} // Disable input when loading
                maxLength={50} // Max length for confirm password
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={isLoading} // Disable button when loading
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={[styles.signupButtonText, { marginLeft: 10 }]}>Creating Account...</Text>
              </View>
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
              <Text style={[styles.loginLink, isLoading && styles.disabledLink]}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// StyleSheet for component styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Dark grey background for the overall screen
    paddingBottom: 40,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center', // Center content vertically
    padding: 0,
    
  },
  formContainer: {
    backgroundColor: '#ffffff', // White background for the form card
    borderRadius: 10, // Rounded corners
    padding: 30,
    shadowColor: '#fff', // Shadow for depth
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5, // Android shadow
  },
  backButton: {
    position: 'absolute', // Position absolutely within the formContainer
    top: 15, // Adjust as needed for spacing from the top
    left: 15, // Adjust as needed for spacing from the left
    zIndex: 10, // Ensure it's above other elements
    padding: 5, // Add padding for easier tapping
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333', // Dark grey text
    marginTop: 20, // Add margin to push content down from back button
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666', // Medium grey text
  },
  row: {
    flexDirection: 'row', // Arrange children horizontally
    alignItems: 'flex-start', // Align items to the start of the row
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd', // Light grey border
    borderRadius: 8, // Rounded input corners
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9', // Very light grey background for inputs
    color: '#333', // Dark text color for better readability
  },
  inputError: {
    borderColor: '#ff6b6b', // Red border for errors
    backgroundColor: '#fff5f5', // Light red background for error inputs
  },
  textArea: {
    height: 80, // Fixed height for textarea
    textAlignVertical: 'top', // Align text to top in multiline input
  },
  // New styles for password input with eye icon
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    paddingRight: 50, // Make room for the eye icon
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333', // Dark text color for password input
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  errorText: {
    color: '#ff6b6b', // Red text for error messages
    fontSize: 14,
    marginTop: 5,
  },
  helpText: {
    color: '#666', // Grey text for help messages (changed from #000 to #666)
    fontSize: 12,
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  signupButton: {
    backgroundColor: '#db2127', // Red button background
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc', // Lighter grey for disabled button
  },
  signupButtonText: {
    color: '#ffffff', // White text on button
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#666', // Changed from #fff to #666 for better visibility on white background
  },
  loginLink: {
    fontSize: 16,
    color: '#db2127', // Red link color to match button
    fontWeight: '600',
  },
  disabledLink: {
    color: '#ccc', // Lighter grey for disabled link
  },
});