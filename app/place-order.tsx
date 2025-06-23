// app/place-order.tsx - Enhanced with map location picker
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../contexts/AuthContext';
import { apiService, CreateOrderPayload, GasCylinder } from '../services/api';

interface CartItem extends GasCylinder {
  quantity: number;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function PlaceOrderScreen() {
  const { user, token } = useAuth();
  const router = useRouter();

  // State
  const [cylinders, setCylinders] = useState<GasCylinder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [deliveryLat, setDeliveryLat] = useState(user?.latitude?.toString() || '');
  const [deliveryLng, setDeliveryLng] = useState(user?.longitude?.toString() || '');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Map related state
  const [showMap, setShowMap] = useState(false);
  // FIX 1: CRITICAL: MapView region with invalid coordinates
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: (user?.latitude && !isNaN(user.latitude)) ? user.latitude : 0.3476, // Default to Kampala coordinates
    longitude: (user?.longitude && !isNaN(user.longitude)) ? user.longitude : 32.5825,
    latitudeDelta: 0.0922, // Ensure these are always set
    longitudeDelta: 0.0421, // Ensure these are always set
  });
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: (user?.latitude && !isNaN(user.latitude)) ? user.latitude : 0.3476,
    longitude: (user?.longitude && !isNaN(user.longitude)) ? user.longitude : 32.5825,
  });
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapError, setMapError] = useState(false); // Added mapError state
  const [mapReady, setMapReady] = useState(false); // For map loading indicator

  // FIX 3: CRITICAL: Invalid coordinate validation
  const validateCoordinates = (lat: number, lng: number): boolean => {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      // lat !== 0 && // Removed this condition to allow valid 0 coordinates
      // lng !== 0    // Removed this condition to allow valid 0 coordinates
      true // Always return true here unless specific invalid cases are needed.
    );
  };

  // FIX 3: Helper to update map region safely
  const updateMapRegion = (latitude: number, longitude: number) => {
    if (validateCoordinates(latitude, longitude)) {
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setSelectedLocation({ latitude, longitude });
    } else {
      console.warn('Invalid coordinates provided to updateMapRegion:', latitude, longitude);
      // Fallback to Kampala coordinates if provided coordinates are invalid
      setMapRegion({
        latitude: 0.3476,
        longitude: 32.5825,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setSelectedLocation({
        latitude: 0.3476,
        longitude: 32.5825,
      });
    }
  };


  // Load gas cylinders
  useEffect(() => {
    loadCylinders();
    requestLocationPermission();
  }, []);

  // FIX 9: ADDITIONAL: Add map loading timeout
useEffect(() => {
  let mapTimeout: ReturnType<typeof setTimeout> | undefined;
  if (showMap && !mapError && !mapReady) {
    mapTimeout = setTimeout(() => {
      console.log('Map loading timeout');
      setMapError(true);
    }, 30000); // 30 second timeout
  }

  return () => {
    if (mapTimeout) {
      clearTimeout(mapTimeout);
    }
  };
}, [showMap, mapError, mapReady]);

  // FIX 4: CRITICAL: Location permission handling (improved)
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            // Removed 'timeout' and 'maximumAge' as they are not valid LocationOptions.
            // Relying on the default behavior and the existing try-catch for error handling.
          });

          const { latitude, longitude } = location.coords;

          if (validateCoordinates(latitude, longitude)) {
            updateMapRegion(latitude, longitude);

            // Auto-fill coordinates if not already set
            if (!deliveryLat || !deliveryLng) {
              setDeliveryLat(latitude.toString());
              setDeliveryLng(longitude.toString());
            }
          } else {
            console.warn('Invalid coordinates from getCurrentPositionAsync:', latitude, longitude);
          }
        } catch (locationError) {
          console.log('Failed to get current location:', locationError);
          // Don't crash, just use default or existing coordinates
        }
      }
    } catch (error) {
      console.log('Location permission error:', error);
      setLocationPermission(false);
    }
  };

  const loadCylinders = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await apiService.getAllGasCylinders(token);
      setCylinders(data.filter(c => c.isAvailable && c.stockQuantity > 0));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load gas cylinders');
    } finally {
      setLoading(false);
    }
  };

  // Map functions
  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Location permission is required to get your current location');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        // Removed 'timeout' and 'maximumAge'
      });
      const { latitude, longitude } = location.coords;

      if (validateCoordinates(latitude, longitude)) {
        updateMapRegion(latitude, longitude);
        setDeliveryLat(latitude.toString());
        setDeliveryLng(longitude.toString());

        // Reverse geocoding to get address
        await handleReverseGeocode(latitude, longitude);
      } else {
        Alert.alert('Error', 'Invalid coordinates obtained from current location. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please ensure GPS is enabled.');
      console.error('getCurrentLocation error:', error);
    }
  };

  // FIX 5: CRITICAL: Reverse geocoding error handling
  const handleReverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const result = results[0];
        const addressParts = [
          result.name,
          result.street,
          result.city,
          result.region,
          result.postalCode,
          result.country
        ].filter(Boolean); // Filter out null/undefined/empty values

        const address = addressParts.join(', ').trim(); // Use comma and space for better readability
        if (address && address.length > 0) {
          setDeliveryAddress(address);
        } else {
          setDeliveryAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        }
      } else {
        setDeliveryAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
      // Don't crash, just continue without address update
      setDeliveryAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    }
  };


  // FIX 6: CRITICAL: Map press handler with validation
  const onMapPress = async (event: any) => {
    try {
      const { coordinate } = event.nativeEvent;

      if (!coordinate || !validateCoordinates(coordinate.latitude, coordinate.longitude)) {
        console.warn('Invalid map press coordinates');
        Alert.alert('Invalid Selection', 'Please tap on a valid location on the map.');
        return;
      }

      setSelectedLocation(coordinate);
      setDeliveryLat(coordinate.latitude.toString());
      setDeliveryLng(coordinate.longitude.toString());

      // Handle reverse geocoding safely
      await handleReverseGeocode(coordinate.latitude, coordinate.longitude);
    } catch (error) {
      console.error('Map press error:', error);
      Alert.alert('Map Interaction Error', 'An error occurred while selecting location on map.');
    }
  };

  const confirmLocation = () => {
    setShowMap(false);
    Alert.alert(
      'Location Selected',
      `Coordinates: ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`,
      [{ text: 'OK' }]
    );
  };

  // Cart operations (keeping existing functions)
  const addToCart = (cylinder: GasCylinder) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === cylinder.id);
      if (existing) {
        if (existing.quantity >= cylinder.stockQuantity) {
          Alert.alert('Stock Limit', `Only ${cylinder.stockQuantity} available`);
          return prev;
        }
        return prev.map(item =>
          item.id === cylinder.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...cylinder, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === id) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) return null;
            if (newQuantity > item.stockQuantity) {
              Alert.alert('Stock Limit', `Only ${item.stockQuantity} available`);
              return item;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  // Validation
  const canPlaceOrder = () => {
    const lat = parseFloat(deliveryLat);
    const lng = parseFloat(deliveryLng);
    return cart.length > 0 &&
      deliveryAddress.trim() &&
      validateCoordinates(lat, lng) && // Use the new validation function
      !loading;
  };

  // Place order (keeping existing function)
  const placeOrder = async () => {
    if (!user || !token) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    if (!canPlaceOrder()) {
      Alert.alert('Incomplete Order', 'Please fill all required fields and add items');
      return;
    }

    const lat = parseFloat(deliveryLat);
    const lng = parseFloat(deliveryLng);

    if (!validateCoordinates(lat, lng)) { // Use the new validation function
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude');
      return;
    }

    setLoading(true);
    try {
      const orderData: CreateOrderPayload = {
        customerId: user.id.toString(),
        items: cart.map(item => ({
          cylinderId: item.id.toString(),
          quantity: Number(item.quantity),
        })),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLatitude: Number(lat),
        deliveryLongitude: Number(lng),
      };

      if (instructions.trim()) {
        orderData.specialInstructions = instructions.trim();
      }

      const response = await apiService.createOrder(orderData, token);

      Alert.alert(
        'Order Placed!',
        `Order #${response.orderNumber} placed successfully!\nTotal: UGX ${response.totalAmount.toLocaleString()}`,
        [
          { text: 'View Orders', onPress: () => router.push('/orders') },
          {
            text: 'New Order',
            onPress: () => {
              setCart([]);
              setInstructions('');
              loadCylinders();
            }
          }
        ]
      );
    } catch (err: any) {
      console.error('Order placement error:', err);
      Alert.alert('Order Failed', err.message || 'Please try again');
      if (err.message?.includes('stock')) {
        loadCylinders();
      }
    } finally {
      setLoading(false);
    }
  };

  // FIX 7: CRITICAL: Enhanced error handler
  const handleMapError = (error: any) => {
    console.error('Map error:', error);
    setMapError(true);
    // Don't show alert immediately, let user continue
    setTimeout(() => {
      if (showMap && mapError) { // Only show if map is still active and error persists
        Alert.alert(
          'Map Unavailable',
          'The map is temporarily unavailable. You can still enter coordinates manually.',
          [{ text: 'OK' }]
        );
      }
    }, 2000);
  };

  // FIX 8: CRITICAL: Safe map region updates
  const onRegionChange = (region: MapRegion) => {
    // Validate region before updating
    if (validateCoordinates(region.latitude, region.longitude)) {
      // Optional: Update map region state if needed, but not strictly necessary unless you want
      // the map to visually reflect the center after user drag without confirming.
      // For this app's purpose (tapping to select), keeping it focused on selectedLocation is fine.
      // If you uncomment below, consider using onRegionChangeComplete for better UX.
      // setMapRegion(region);
    }
  };


  // FIX 2: CRITICAL: Missing error boundaries for MapView (enhanced MapViewComponent)
  const MapViewComponent = () => {
    if (mapError) {
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#666', textAlign: 'center', margin: 20 }}>
            Map temporarily unavailable.{'\n'}Please enter coordinates manually below.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.map}>
        {!mapReady && (
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
            <ActivityIndicator size="large" color="#F50101" />
            <Text style={{ marginTop: 10, color: '#666' }}>Loading map...</Text>
          </View>
        )}
        <MapView
          style={StyleSheet.absoluteFillObject} // Changed to absoluteFillObject for better layout
          region={mapRegion}
          onPress={onMapPress}
          onMapReady={() => {
            console.log('Map ready');
            setMapReady(true);
            setMapError(false); // Clear any previous map error if map loads successfully
          }}
          // Removed 'onError' prop as it is not supported by MapView directly.
          // Error handling for map loading is now managed via `onMapReady` and a timeout mechanism.
          showsUserLocation={locationPermission}
          showsMyLocationButton={false}
          loadingEnabled={true}
          loadingIndicatorColor="#F50101"
          loadingBackgroundColor="#ffffff"
          // Add these crash prevention props
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={true}
          zoomEnabled={true}
          moveOnMarkerPress={false}
          onRegionChange={onRegionChange} // Added onRegionChange
          mapType="standard"
        >
          <Marker
            coordinate={selectedLocation}
            title="Delivery Location"
            description="Tap anywhere on the map to change location"
          />
        </MapView>
      </View>
    );
  };

  // Manual Coordinate Inputs Component
  const CoordinateInputs = () => (
    <View style={styles.row}>
      <View style={[styles.inputGroup, styles.halfInputGroup]}>
        <Text style={styles.inputLabel}>
          Latitude <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0.0000"
          placeholderTextColor="#999"
          value={deliveryLat}
          onChangeText={setDeliveryLat}
          keyboardType="numeric"
          editable={!loading}
        />
      </View>
      <View style={[styles.inputGroup, styles.halfInputGroup]}>
        <Text style={styles.inputLabel}>
          Longitude <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0.0000"
          placeholderTextColor="#999"
          value={deliveryLng}
          onChangeText={setDeliveryLng}
          keyboardType="numeric"
          editable={!loading}
        />
      </View>
    </View>
  );


  // Render functions (keeping existing ones)
  const renderCylinder = ({ item }: { item: GasCylinder }) => (
    <View style={styles.cylinderCard}>
      {item.imageUrl && (
        <View style={styles.cylinderImageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cylinderImage}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={styles.cylinderInfo}>
        <Text style={styles.cylinderName}>{item.name}</Text>
        <Text style={styles.cylinderDetails}>
          {item.weight}kg • {item.brand} • Stock: {item.stockQuantity}
        </Text>
        <Text style={styles.cylinderPrice}>UGX {item.price.toLocaleString()}</Text>
        {item.description && (
          <Text style={styles.cylinderDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.addBtn, loading && styles.disabledBtn]}
        onPress={() => addToCart(item)}
        disabled={loading}
      >
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      {item.imageUrl && (
        <View style={styles.cartImageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cartImage}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={styles.cartInfo}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartPrice}>UGX {item.price.toLocaleString()} each</Text>
        <View style={styles.quantityControlsContainer}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, -1)}
              disabled={loading}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, item.quantity >= item.stockQuantity && styles.disabledBtn]}
              onPress={() => updateQuantity(item.id, 1)}
              disabled={loading || item.quantity >= item.stockQuantity}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.itemTotalNew}>
            UGX {(item.price * item.quantity).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to place an order</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/')}>
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Map Modal
  if (showMap) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setShowMap(false)} style={styles.mapCloseBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.mapTitle}>Select Delivery Location</Text>
          <TouchableOpacity onPress={getCurrentLocation} style={styles.mapLocationBtn}>
            <Ionicons name="location" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <MapViewComponent /> {/* Replaced direct MapView with component */}

        <View style={styles.mapFooter}>
          <Text style={styles.coordinatesText}>
            Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
          <TouchableOpacity style={styles.confirmLocationBtn} onPress={confirmLocation}>
            <Text style={styles.confirmLocationText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Place New Order',
          headerTitleStyle: {
            color: '#fff',
            fontSize: 20,
            fontWeight: 'bold',
          },
          headerStyle: {
            backgroundColor: '#F50101',
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10, marginRight: 10 }}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadCylinders} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Available Cylinders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Gas Cylinders</Text>
            {loading && cylinders.length === 0 ? (
              <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
            ) : (
              <FlatList
                data={cylinders}
                renderItem={renderCylinder}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No gas cylinders available</Text>
                }
              />
            )}
          </View>

          {/* Cart */}
          {cart.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Order ({cart.length} items)</Text>
              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Delivery Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Details</Text>

            {/* Map Location Picker Button */}
            <TouchableOpacity style={styles.mapPickerBtn} onPress={() => { setShowMap(true); setMapReady(false); setMapError(false); }}>
              <Ionicons name="location-outline" size={24} color="#F50101" />
              <Text style={styles.mapPickerText}>Select Location on Map</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Manual Coordinate Input */}
            <CoordinateInputs />

            {/* Delivery Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Delivery Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full delivery address"
                placeholderTextColor="#999"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            {/* Special Instructions */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Special Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special delivery instructions (optional)"
                placeholderTextColor="#999"
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={3}
                editable={!loading}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Order Summary */}
          {cart.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>UGX {subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>UGX {total.toLocaleString()}</Text>
              </View>
            </View>
          )}

          {/* Place Order Button */}
          <TouchableOpacity
            style={[styles.orderBtn, !canPlaceOrder() && styles.disabledBtn]}
            onPress={placeOrder}
            disabled={!canPlaceOrder()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.orderBtnText}>
                Place Order - UGX {total.toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom:40
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#d63384',
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#d63384',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 1,
  },
  summarySection: {
    backgroundColor: '#231f20',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  loader: {
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  cylinderCard: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  cylinderImageContainer: {
    marginRight: 12,
  },
  cylinderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cylinderInfo: {
    flex: 1,
    marginRight: 15,
  },
  cylinderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  cylinderDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cylinderPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F50101',
    marginBottom: 4,
  },
  cylinderDesc: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  addBtn: {
    backgroundColor: '#F50101',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartImageContainer: {
    marginRight: 10,
  },
  cartImage: {
    width: 45,
    height: 45,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  cartPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  quantityControlsContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qtyBtn: {
    backgroundColor: '#F50101',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 25,
    textAlign: 'center',
    color: '#333',
  },
  itemTotalNew: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
    marginTop: 5,
    color: '#333',
  },
  // Map Picker Button
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  mapPickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  // Map Modal Styles
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  mapHeader: {
    backgroundColor: '#F50101',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 50,
  },
  mapCloseBtn: {
    padding: 5,
  },
  mapTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapLocationBtn: {
    padding: 5,
  },
  map: {
    flex: 1,
  },
  mapFooter: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  confirmLocationBtn: {
    backgroundColor: '#F50101',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Form Styles
  inputGroup: {
    marginBottom: 20,
  },
  halfInputGroup: {
    width: '47%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#d63384',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
    minHeight: 45,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#ffff',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffff',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#2196f3',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F50101',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F50101',
  },
  orderBtn: {
    backgroundColor: '#F50101',
    margin: 15,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  bottomSpace: {
    height: 30, // To give some space at the bottom of the scroll view
  },
});