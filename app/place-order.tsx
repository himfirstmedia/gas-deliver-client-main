// app/place-order.tsx - With visible labels
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService, CreateOrderPayload, GasCylinder } from '../services/api';

interface CartItem extends GasCylinder {
  quantity: number;
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

  const DELIVERY_FEE = 5000;

  // Load gas cylinders
  useEffect(() => {
    loadCylinders();
  }, []);

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
  const total = subtotal + DELIVERY_FEE;

  // Validation
  const canPlaceOrder = () => {
    return cart.length > 0 && 
           deliveryAddress.trim() && 
           deliveryLat && 
           deliveryLng && 
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
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude');
      return;
    }

    setLoading(true);
    try {
      // Ensure all fields are properly formatted
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

      // Only add special instructions if they exist
      if (instructions.trim()) {
        orderData.specialInstructions = instructions.trim();
      }

      console.log('Final order data being sent:', JSON.stringify(orderData, null, 2));
      console.log('User object:', user);
      console.log('Token exists:', !!token);
      
      const response = await apiService.createOrder(orderData, token);
      
      Alert.alert(
        'Order Placed!',
        `Order #${response.orderNumber} placed successfully!\nTotal: UGX ${response.totalAmount.toLocaleString()}`,
        [
          { text: 'View Orders', onPress: () => router.push('/home') },
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

  const renderCylinder = ({ item }: { item: GasCylinder }) => (
    <View style={styles.cylinderCard}>
      {/* Cylinder Image */}
      {item.imageUrl && (
        <View style={styles.cylinderImageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cylinderImage}
            resizeMode="cover"
            onError={() => console.log('Failed to load image:', item.imageUrl)}
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
    {/* Cart Item Image */}
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
      
      {/* Quantity Controls and Item Total */}
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
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Place Order</Text>
        <Text style={styles.subtitle}>Select gas cylinders and delivery details</Text>
      </View>

      {/* Error Display */}
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
        
        {/* Delivery Address with Label */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Delivery Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full delivery address"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
            editable={!loading}
          />
        </View>

        {/* Coordinates Row with Labels */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfInputGroup]}>
            <Text style={styles.inputLabel}>
              Latitude <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.3476"
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
              placeholder="32.5825"
              value={deliveryLng}
              onChangeText={setDeliveryLng}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
        </View>

        {/* Special Instructions with Label */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Special Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special delivery instructions (optional)"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
            editable={!loading}
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee:</Text>
            <Text style={styles.summaryValue}>UGX {DELIVERY_FEE.toLocaleString()}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    marginBottom: 10,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#e3f2fd',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  },
  cylinderDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cylinderPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007bff',
    marginBottom: 4,
  },
  cylinderDesc: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  addBtn: {
    backgroundColor: '#28a745',
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
    alignItems: 'flex-start', // Align items to the start for better layout with new lines
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
    flex: 1, // Allow cart info to take available space
  },
  cartName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  cartPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8, // Add some space below price
  },
  quantityControlsContainer: { // New style for the container holding quantity controls and total
    width: '100%', // Take full width
    alignItems: 'flex-start', // Align to start
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Space between buttons and total
  },
  qtyBtn: {
    backgroundColor: '#007bff',
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
  },
  itemTotalNew: { // New style for the item total
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left', // Align to left since it's on a new line
    marginTop: 5, // Space from quantity controls
  },
  inputGroup: {
    marginBottom: 15,
  },
  halfInputGroup: {
    width: '47%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
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
    color: '#1976d2',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  orderBtn: {
    backgroundColor: '#007bff',
    margin: 15,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  orderBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  bottomSpace: {
    height: 20,
  },
});