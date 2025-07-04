// app/home.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
// Import icons - use one of these based on your setup:
import { Ionicons } from '@expo/vector-icons'; // For Expo
// import Icon from 'react-native-vector-icons/Ionicons'; // For react-native-vector-icons

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#1f0303';
      case 'driver':
        return '#1f0303';
      case 'customer':
      default:
        return '#1f0303';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.nameText}>{user?.firstName} {user?.lastName}</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Text style={styles.profileTitle}>Profile Information</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || 'customer') }]}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{user?.phone}</Text>
          </View>

          {user?.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{user.address}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member since:</Text>
            <Text style={styles.infoValue}>{formatDate(user?.createdAt || '')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status:</Text>
            <Text style={[styles.infoValue, { color: user?.isActive ? '#4CAF50' : '#FF5722' }]}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Quick Actions</Text>
        
        {user?.role === 'customer' && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/place-order')}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="add-circle-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>Place New Order</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/orders')}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="list-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>View Order History</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {user?.role === 'driver' && (
          <>
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="car-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>View Available Deliveries</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="time-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>My Delivery History</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="people-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>Manage Users</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="receipt-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>View All Orders</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="analytics-outline" size={24} color="#495057" />
                <Text style={styles.actionButtonText}>Analytics Dashboard</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/edit-profile')}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="person-outline" size={24} color="#495057" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <View style={styles.logoutButtonContent}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#F50101',
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#ffff',
    marginBottom: 5,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffff',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileInfo: {
    gap: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffff',
    marginBottom: 20,
  },
  actionsCard: {
    backgroundColor: '#F50101',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(9, 1, 1, 0.9)',
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});