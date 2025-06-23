// app/place-order.tsx - Fixed version with proper text rendering
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
import { styles } from './styles/PlaceOrderStyles';

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
  const [deliveryLat, setDeliveryLat] = useState(() => {
    const lat = user?.latitude;
    return (lat && !isNaN(lat)) ? lat.toString() : '';
  });
  const [deliveryLng, setDeliveryLng] = useState(() => {
    const lng = user?.longitude;
    return (lng && !isNaN(lng)) ? lng.toString() : '';
  });
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Map related state
  const [showMap, setShowMap] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion>(() => {
    const lat = user?.latitude;
    const lng = user?.longitude;
    return {
      latitude: (lat && !isNaN(lat)) ? lat : 0.3476, // Kampala coordinates
      longitude: (lng && !isNaN(lng)) ? lng : 32.5825,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const lat = user?.latitude;
    const lng = user?.longitude;
    return {
      latitude: (lat && !isNaN(lat)) ? lat : 0.3476,
      longitude: (lng && !isNaN(lng)) ? lng : 32.5825,
    };
  });
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Coordinate validation
  const validateCoordinates = (lat: number, lng: number): boolean => {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  // Update map region safely
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
      // Fallback to Kampala coordinates
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

  // Map loading timeout
  useEffect(() => {
    let mapTimeout: ReturnType<typeof setTimeout> | undefined;
    if (showMap && !mapError && !mapReady) {
      mapTimeout = setTimeout(() => {
        console.log('Map loading timeout');
        setMapError(true);
      }, 30000);
    }

    return () => {
      if (mapTimeout) {
        clearTimeout(mapTimeout);
      }
    };
  }, [showMap, mapError, mapReady]);

  // Location permission handling
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
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

  // Get current location
  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Location permission is required to get your current location');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      if (validateCoordinates(latitude, longitude)) {
        updateMapRegion(latitude, longitude);
        setDeliveryLat(latitude.toString());
        setDeliveryLng(longitude.toString());
        await handleReverseGeocode(latitude, longitude);
      } else {
        Alert.alert('Error', 'Invalid coordinates obtained from current location. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please ensure GPS is enabled.');
      console.error('getCurrentLocation error:', error);
    }
  };

  // Reverse geocoding
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
        ].filter(Boolean);

        const address = addressParts.join(', ').trim();
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
      setDeliveryAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    }
  };

  // Map press handler
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

  // Cart operations
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
      validateCoordinates(lat, lng) &&
      !loading;
  };

  // Place order
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

    if (!validateCoordinates(lat, lng)) {
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

  // Map error handler
  const handleMapError = (error: any) => {
    console.error('Map error:', error);
    setMapError(true);
    setTimeout(() => {
      if (showMap && mapError) {
        Alert.alert(
          'Map Unavailable',
          'The map is temporarily unavailable. You can still enter coordinates manually.',
          [{ text: 'OK' }]
        );
      }
    }, 2000);
  };

  // Safe map region updates
  const onRegionChange = (region: MapRegion) => {
    if (validateCoordinates(region.latitude, region.longitude)) {
      // Optional: Update map region state if needed
    }
  };

  // Map View Component
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
          style={StyleSheet.absoluteFillObject}
          region={mapRegion}
          onPress={onMapPress}
          onMapReady={() => {
            console.log('Map ready');
            setMapReady(true);
            setMapError(false);
          }}
          showsUserLocation={locationPermission}
          showsMyLocationButton={false}
          loadingEnabled={true}
          loadingIndicatorColor="#F50101"
          loadingBackgroundColor="#ffffff"
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={true}
          zoomEnabled={true}
          moveOnMarkerPress={false}
          onRegionChange={onRegionChange}
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

  // Render functions
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

        <MapViewComponent />

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
            <TouchableOpacity 
              style={styles.mapPickerBtn} 
              onPress={() => { 
                setShowMap(true); 
                setMapReady(false); 
                setMapError(false); 
              }}
            >
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