// app/order-details/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  // Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Order, OrderStatus, PaymentStatus } from '../services/api';

// const { width: screenWidth } = Dimensions.get('window');

// Centralized style constants for better maintainability
const colors = {
  primary: '#F50101',
  secondary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#AF52DE',
  background: '#F8F9FA',
  cardBackground: '#fff',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  lightGray: '#F0F0F0',
  white: '#fff',
  blueLight: '#F0F9FF',
  redLight: '#FFE5E5',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
};

const fontSizes = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 24,
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load order details
  const loadOrderDetails = useCallback(async () => {
    if (!token || !id) {
      if (!token) setError('Authentication token is missing. Please log in.');
      if (!id) setError('Order ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiService.getOrderById(id, token);
      setOrder(response);
    } catch (err: any) {
      console.error('Error loading order details:', err);
      setError(err.message || 'Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  // Initial load
  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // Helper functions
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return colors.warning;
      case OrderStatus.CONFIRMED:
        return colors.success;
      case OrderStatus.ASSIGNED:
        return colors.secondary;
      case OrderStatus.IN_TRANSIT:
        return colors.info;
      case OrderStatus.DELIVERED:
        return colors.success;
      case OrderStatus.CANCELLED:
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return colors.warning;
      case PaymentStatus.PAID:
        return colors.success;
      case PaymentStatus.FAILED:
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid Date';
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const canCancelOrder = (order: Order) => {
    return order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;
  };

  const canDeleteOrder = (order: Order) => {
    return order.status === OrderStatus.CANCELLED;
  };

  const handleCancelOrder = () => {
    if (!order) return;

    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: cancelOrder,
        },
      ]
    );
  };

  const handleDeleteOrder = () => {
    if (!order) return;

    Alert.alert(
      'Delete Order',
      `Are you sure you want to permanently delete order #${order.orderNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteOrder,
        },
      ]
    );
  };

  const cancelOrder = async () => {
    if (!token || !order) {
      Alert.alert('Error', 'Missing authentication or order details to cancel.');
      return;
    }

    try {
      setActionLoading(true);
      await apiService.cancelOrder(order.id, token);
      Alert.alert('Success', 'Order cancelled successfully.', [
        { text: 'OK', onPress: loadOrderDetails },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel order. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOrder = async () => {
    if (!token || !order) {
      Alert.alert('Error', 'Missing authentication or order details to delete.');
      return;
    }

    try {
      setActionLoading(true);
      await apiService.deleteOrder(order.id, token);
      Alert.alert('Success', 'Order deleted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete order. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getOrderStatusSteps = (currentStatus: OrderStatus) => {
    const steps = [
      { status: OrderStatus.PENDING, label: 'Order Placed', icon: '📝' },
      { status: OrderStatus.CONFIRMED, label: 'Confirmed', icon: '✅' },
      { status: OrderStatus.ASSIGNED, label: 'Driver Assigned', icon: '👨‍🚗' },
      { status: OrderStatus.IN_TRANSIT, label: 'In Transit', icon: '🚚' },
      { status: OrderStatus.DELIVERED, label: 'Delivered', icon: '📦' },
    ];

    if (currentStatus === OrderStatus.CANCELLED) {
      return [{ status: OrderStatus.CANCELLED, label: 'Cancelled', icon: '❌', isActive: true, isCurrent: true }];
    }

    const currentIndex = steps.findIndex((step) => step.status === currentStatus);
    return steps.map((step, index) => ({
      ...step,
      isActive: index <= currentIndex,
      isCurrent: index === currentIndex,
    }));
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔐</Text>
          <Text style={styles.errorText}>Please log in to view order details.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={{ marginLeft: 10, marginRight: 10 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={{ marginLeft: 10, marginRight: 10 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrderDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusSteps = getOrderStatusSteps(order.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={{ marginLeft: 10, marginRight: 10 }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.orderHeaderCard}>
          <View style={styles.orderHeaderTop}>
            <View>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{formatStatus(order.status)}</Text>
              </View>
              <View
                style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(order.paymentStatus) }]}
              >
                <Text style={styles.paymentText}>{formatStatus(order.paymentStatus)}</Text>
              </View>
            </View>
          </View>

          {/* Order Status Progress */}
          {order.status !== OrderStatus.CANCELLED && (
            <View style={styles.statusProgressContainer}>
              <Text style={styles.progressTitle}>Order Progress</Text>
              <View style={styles.statusSteps}>
                {statusSteps.map((step, index) => (
                  <View key={step.status} style={styles.statusStep}>
                    <View
                      style={[
                        styles.stepIndicator,
                        step.isActive && styles.stepIndicatorActive,
                        step.isCurrent && styles.stepIndicatorCurrent,
                      ]}
                    >
                      <Text style={[styles.stepIcon, step.isActive && styles.stepIconActive]}>
                        {step.icon}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        step.isActive && styles.stepLabelActive,
                        step.isCurrent && styles.stepLabelCurrent,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {index < statusSteps.length - 1 && (
                      <View
                        style={[
                          styles.stepConnector,
                          step.isActive && styles.stepConnectorActive,
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Order Items */}
      <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Items ({order.items?.length || 0})</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.gasCylinder?.name || 'Unknown Item'}</Text>
                <Text style={styles.itemDescription}>
                  {item.gasCylinder?.description || 'No description available'}
                </Text>
                <Text style={styles.itemPrice}>
                  UGX {item.unitPrice?.toLocaleString() || '0'} × {item.quantity || '0'}
                </Text>
              </View>
              <View style={styles.itemTotal}>
                <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                <Text style={styles.itemTotalPrice}>
                  UGX {item.totalPrice?.toLocaleString() || '0'}
                </Text>
              </View>
            </View>
          ))}

          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total for Gas Cylinders</Text>
              <Text style={styles.summaryValue}>
                UGX {order.totalAmount?.toLocaleString() || '0'}
              </Text>
            </View>
            {/* Removed Delivery Fee section */}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>UGX {order.totalAmount?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        </View>
        {/* Delivery Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryIcon}>📍</Text>
              <View style={styles.deliveryContent}>
                <Text style={styles.deliveryLabel}>Delivery Address</Text>
                <Text style={styles.deliveryValue}>{order.deliveryAddress || 'Not provided'}</Text>
              </View>
            </View>

            {order.customer.phone && (
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryIcon}>📞</Text>
                <View style={styles.deliveryContent}>
                  <Text style={styles.deliveryLabel}>Contact Number</Text>
                  <Text style={styles.deliveryValue}>{order.customer.phone}</Text>
                </View>
              </View>
            )}

            {order.estimatedDeliveryTime && order.status !== OrderStatus.DELIVERED && (
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryIcon}>⏰</Text>
                <View style={styles.deliveryContent}>
                  <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
                  <Text style={styles.deliveryValue}>{formatDate(order.estimatedDeliveryTime)}</Text>
                </View>
              </View>
            )}

            {order.actualDeliveryTime && (
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryIcon}>✅</Text>
                <View style={styles.deliveryContent}>
                  <Text style={styles.deliveryLabel}>Delivered On</Text>
                  <Text style={styles.deliveryValue}>{formatDate(order.actualDeliveryTime)}</Text>
                </View>
              </View>
            )}

            {order.deliveryAddress && (
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryIcon}>📝</Text>
                <View style={styles.deliveryContent}>
                  <Text style={styles.deliveryLabel}>Delivery Notes</Text>
                  <Text style={styles.deliveryValue}>{order.specialInstructions}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Driver Information (if assigned) */}
        {order.driver && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverRow}>
                <Text style={styles.driverIcon}>👨‍🚗</Text>
                <View style={styles.driverContent}>
                  <Text style={styles.driverName}>{order.driver.firstName}</Text>
                  <Text style={styles.driverPhone}>{order.driver.phone}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {canCancelOrder(order) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelOrder}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              )}
            </TouchableOpacity>
          )}

          {canDeleteOrder(order) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteOrder}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.deleteButtonText}>🗑️ Delete Order</Text>
              )}
            </TouchableOpacity>
          )}

          {/* <TouchableOpacity
            style={[styles.actionButton, styles.reorderButton]}
            onPress={() => {
              Alert.alert('Reorder', 'Reorder functionality is not yet implemented.');
            }}
          >
            <Text style={styles.reorderButtonText}>🔄 Reorder</Text>
          </TouchableOpacity> */}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F50101',
    paddingBottom:20,
    paddingTop:20
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  // Header Styles
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 15, // A bit more vertical padding for aesthetics
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSizes.lg,
    color: colors.white,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSpacer: {
    width: 60, // To balance the back button space
  },
  scrollContainer: {
    flex: 1,
  },
  // Card Styles (shared for consistency)
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.md,
    padding: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderHeaderCard: {
    backgroundColor: colors.cardBackground,
    margin: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.md,
    padding: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Changed from 'flex-start' to 'center'
    marginBottom: spacing.lg,
    flexWrap: 'wrap', // Added to allow wrapping if content overflows
  },
  orderNumber: {
    fontSize: fontSizes.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  statusText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  paymentBadge: {
    paddingHorizontal: spacing.sm * 1.5,
    paddingVertical: spacing.sm - 2, // Slightly smaller for payment status
    borderRadius: 12,
  },
  paymentText: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Status Progress Styles
  statusProgressContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  progressTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statusSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepIndicatorActive: {
    backgroundColor: colors.primary,
  },
  stepIndicatorCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.redLight,
  },
  stepIcon: {
    fontSize: fontSizes.lg,
  },
  stepIconActive: {
    fontSize: fontSizes.xl,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  stepConnector: {
    position: 'absolute',
    top: 20, // Align with center of indicator
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: colors.border,
    zIndex: -1,
  },
  stepConnectorActive: {
    backgroundColor: colors.primary,
  },
  // Section Card (re-using the 'card' style for consistency)
  sectionCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.md,
    padding: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  // Item Row Styles
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm * 1.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemTotalPrice: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  // Order Summary Styles
  orderSummary: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Delivery Info Styles
  deliveryInfo: {
    gap: spacing.md, // Use gap for consistent spacing between rows
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryIcon: {
    fontSize: fontSizes.xl,
    marginRight: spacing.sm * 1.5,
    marginTop: 2,
  },
  deliveryContent: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  // Driver Info Styles
  driverInfo: {
    backgroundColor: colors.blueLight,
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverIcon: {
    fontSize: fontSizes.xxxl - 2, // Slightly larger icon
    marginRight: spacing.sm * 1.5,
  },
  driverContent: {
    flex: 1,
  },
  driverName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: fontSizes.md,
    color: colors.secondary,
    fontWeight: '500',
  },
  // Action Button Styles
  actionSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm * 1.5, // Consistent gap between buttons
    marginBottom: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally and vertically
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#000',
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#E04F4F', // Slightly different shade of red for delete
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  reorderButton: {
    backgroundColor: colors.secondary,
  },
  reorderButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: spacing.lg, // Add some space at the bottom of the scroll view
  },
  // Empty State / Error Styles
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
    marginHorizontal: spacing.md,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSizes.lg,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fontSizes.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl - 8,
    paddingVertical: spacing.sm * 1.5,
    borderRadius: spacing.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
});