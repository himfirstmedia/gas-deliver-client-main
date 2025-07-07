// app/orders.tsx
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Order, OrderStatus, PaymentStatus } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function OrdersScreen() {
  const { user, token } = useAuth();
  const router = useRouter();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

  // Load orders
  const loadOrders = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!token || !user) return;

    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await apiService.getAllOrders(token, {
        customerId: user.id.toString(),
        page: pageNum,
        limit: ITEMS_PER_PAGE,
      });

      if (append) {
        setOrders(prev => [...prev, ...response.data]);
      } else {
        setOrders(response.data);
      }

      setHasMore(response.data.length === ITEMS_PER_PAGE);
      setError('');
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
      if (pageNum === 1) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [token, user]);

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadOrders(1, false);
  }, [loadOrders]);

  // Load more handler
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadOrders(nextPage, true);
    }
  }, [loadOrders, loadingMore, hasMore, page]);

  // Helper functions
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return '#FF9500';
      case OrderStatus.CONFIRMED:
        return '#34C759';
      case OrderStatus.ASSIGNED:
        return '#007AFF';
      case OrderStatus.IN_TRANSIT:
        return '#AF52DE';
      case OrderStatus.DELIVERED:
        return '#30D158';
      case OrderStatus.CANCELLED:
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return '#FF9500';
      case PaymentStatus.PAID:
        return '#34C759';
      case PaymentStatus.FAILED:
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const canCancelOrder = (order: Order) => {
    return order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;
  };

  const canDeleteOrder = (order: Order) => {
    return order.status === OrderStatus.CANCELLED;
  };

  const handleCancelOrder = (order: Order) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.orderNumber}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelOrder(order.id),
        },
      ]
    );
  };

  const handleDeleteOrder = (order: Order) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to permanently delete order #${order.orderNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteOrder(order.id),
        },
      ]
    );
  };

  const cancelOrder = async (orderId: string) => {
    if (!token) return;

    try {
      setLoading(true);
      await apiService.cancelOrder(orderId, token);
      Alert.alert('Success', 'Order cancelled successfully');
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!token) return;

    try {
      setDeletingOrderId(orderId);
      // Assuming you have a deleteOrder method in your API service
      // If not, you'll need to add it to your apiService
      await apiService.deleteOrder(orderId, token);

      // Remove the order from local state immediately for better UX
      setOrders(prev => prev.filter(order => order.id !== orderId));
      Alert.alert('Success', 'Order deleted successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete order');
      // Refresh to restore the order if deletion failed
      onRefresh();
    } finally {
      setDeletingOrderId(null);
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={[styles.orderCard, item.status === OrderStatus.CANCELLED && styles.cancelledCard]}>
      {/* Status Banner for cancelled orders */}
      {item.status === OrderStatus.CANCELLED && (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledBannerText}>CANCELLED</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        {/* Only show status container if order is not cancelled */}
        {item.status !== OrderStatus.CANCELLED && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
            </View>
            {/* <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(item.paymentStatus) }]}>
              <Text style={styles.paymentText}>{formatStatus(item.paymentStatus)}</Text>
            </View> */}
          </View>
        )}
      </View>

      {/* Items */}
      <View style={styles.itemsContainer}>
        <Text style={styles.itemsTitle}>Items ({item.items?.length || 0}):</Text>
        {item.items?.slice(0, 2).map((orderItem, index) => (
          <View key={index} style={styles.orderItemRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {orderItem.gasCylinder?.name || 'Unknown Item'}
            </Text>
            <Text style={styles.itemQuantity}>×{orderItem.quantity}</Text>
            <Text style={styles.itemPrice}>
              UGX {orderItem.totalPrice?.toLocaleString()}
            </Text>
          </View>
        ))}
        {(item.items?.length || 0) > 2 && (
          <Text style={styles.moreItems}>
            +{(item.items?.length || 0) - 2} more items
          </Text>
        )}
      </View>

      {/* Delivery Info */}
      <View style={styles.deliveryContainer}>
        <View style={styles.deliveryRow}>
          <Text style={styles.deliveryIcon}>📍</Text>
          <Text style={styles.deliveryAddress} numberOfLines={2}>
            {item.deliveryAddress}
          </Text>
        </View>
        {item.estimatedDeliveryTime && item.status !== OrderStatus.DELIVERED && (
          <View style={styles.timeRow}>
            <Text style={styles.timeIcon}>⏰</Text>
            <Text style={styles.estimatedTime}>
              Est. Delivery: {formatDate(item.estimatedDeliveryTime)}
            </Text>
          </View>
        )}
        {item.actualDeliveryTime && (
          <View style={styles.timeRow}>
            <Text style={styles.timeIcon}>✅</Text>
            <Text style={styles.actualTime}>
              Delivered: {formatDate(item.actualDeliveryTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Total and Actions */}
      <View style={styles.orderFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>UGX {item.totalAmount?.toLocaleString()}</Text>
        </View>
        <View style={styles.actionButtons}>
          {canCancelOrder(item) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(item)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {canDeleteOrder(item) && (
            <TouchableOpacity
              style={[styles.deleteButton, deletingOrderId === item.id && styles.deletingButton]}
              onPress={() => handleDeleteOrder(item)}
              disabled={deletingOrderId === item.id}
            >
              {deletingOrderId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => {
              // Navigate to order details if you have that screen
              // const path = `/orderdetails/${item.id}` ;
              router.push({
                pathname: '/orderdetails',
                params: { id: item.id }
              });
              // Alert.alert('Order Details', 'Order details screen not implemented yet');
            }}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#F50101" />
        <Text style={styles.loadingMoreText}>Loading more orders...</Text>
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>
        You have not placed any orders yet. Start by placing your first order!
      </Text>
      <TouchableOpacity
        style={styles.placeOrderButton}
        onPress={() => router.push('/place-order')}
      >
        <Text style={styles.placeOrderButtonText}>🚀 Place Your First Order</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.errorText}>Please log in to view your orders</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={{ marginLeft: 10, marginRight: 10 }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity style={styles.newOrderButton} onPress={() => router.push('/place-order')}>
          <Text style={styles.newOrderButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <View style={styles.errorContent}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F50101" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyListContainer : styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F50101']}
              tintColor="#F50101"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F50101',
    paddingTop: 23,
    paddingBottom: 35
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,   
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#F50101',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  newOrderButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  newOrderButtonText: {
    color: '#F50101',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  errorContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    flex: 1,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#F50101',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#8E8E93',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 280,
  },
  placeOrderButton: {
    backgroundColor: '#F50101',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  placeOrderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: 'relative',
  },
  cancelledCard: {
    opacity: 0.8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  cancelledBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
  },
  cancelledBannerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  itemsContainer: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1C1C1E',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  itemName: {
    flex: 2,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  itemQuantity: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '600',
  },
  itemPrice: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    textAlign: 'right',
    fontWeight: '600',
  },
  moreItems: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  deliveryContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deliveryIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  deliveryAddress: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  actualTime: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  deletingButton: {
    backgroundColor: '#FF9999',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMoreText: {
    marginLeft: 12,
    color: '#8E8E93',
    fontSize: 14,
  },
});