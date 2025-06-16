// services/api.ts
const API_BASE_URL = 'https://gas.bxmedia.pro/api';
// const API_BASE_URL = 'http://192.168.100.26:3000/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin';
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: 'customer' | 'driver' | 'admin';
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Updated GasCylinder interface to match backend entity
export interface GasCylinder {
  id: string;
  name: string;
  weight: number; // Weight in kg
  price: number;
  description?: string;
  brand?: string;
  stockQuantity: number;
  isAvailable: boolean;
  imageUrl?: string;
  supplier?: {
    id: string;
    name: string;
    // Add other supplier properties as needed
  };
  createdAt?: string;
  updatedAt?: string;
}

// Order item payload for creating orders
export interface OrderItemPayload {
  cylinderId: string;
  quantity: number;
}

// Create order payload
export interface CreateOrderPayload {
  customerId: string;
  items: OrderItemPayload[];
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  specialInstructions?: string;
}

// Update order payload
export interface UpdateOrderPayload {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  driverId?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
}

// Order item as returned from backend
export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  gasCylinder: GasCylinder;
}

// Order status enum to match backend
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// Payment status enum to match backend
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Order as returned from backend
export interface Order {
  id: string;
  orderNumber: string;
  customer: User;
  driver?: User;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Order query parameters
export interface OrderQueryParams {
  status?: string;
  customerId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error response interface
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Ensure proper headers are set
    const defaultHeaders: Record<string, string> = {};

    // Only set Content-Type for requests with body
    if (options.body && typeof options.body === 'string') {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`Making API request to: ${url}`);
      console.log('Request config:', config);
      console.log('Request body:', options.body);


      const response = await fetch(url, config);

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyToken(token: string): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/auth/verify', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async logout(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // User CRUD endpoints
  async getAllUsers(token: string): Promise<User[]> {
    return this.request<User[]>('/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getUserById(id: string, token: string): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createUser(userData: RegisterData): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>, token: string): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  }

  async updatePassword(id: string, passwordData: UpdatePasswordData, token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}/password`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
  }

  async deleteUser(id: string, token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getUsersByRole(role: 'customer' | 'driver' | 'admin', token: string): Promise<User[]> {
    return this.request<User[]>(`/users/role/${role}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Gas Cylinders endpoints
  async getAllGasCylinders(token?: string): Promise<GasCylinder[]> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<GasCylinder[]>('/gas-cylinders', {
      method: 'GET',
      headers,
    });
  }

  async getGasCylinderById(id: string, token?: string): Promise<GasCylinder> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<GasCylinder>(`/gas-cylinders/${id}`, {
      method: 'GET',
      headers,
    });
  }

  async createGasCylinder(cylinderData: Omit<GasCylinder, 'id' | 'createdAt' | 'updatedAt'>, token: string): Promise<GasCylinder> {
    return this.request<GasCylinder>('/gas-cylinders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cylinderData),
    });
  }

  async updateGasCylinder(id: string, cylinderData: Partial<GasCylinder>, token: string): Promise<GasCylinder> {
    return this.request<GasCylinder>(`/gas-cylinders/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cylinderData),
    });
  }

  async deleteGasCylinder(id: string, token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/gas-cylinders/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Orders endpoints
  async createOrder(orderData: CreateOrderPayload, token: string): Promise<Order> {
    // Validate the order data before sending
    console.log('Creating order with data:', orderData);

    if (!orderData.customerId) {
      throw new Error('Customer ID is required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order items are required');
    }

    if (!orderData.deliveryAddress) {
      throw new Error('Delivery address is required');
    }

    const requestBody = JSON.stringify(orderData);
    console.log('Stringified request body:', requestBody);

    return this.request<Order>('/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
  }

  async getAllOrders(token: string, params?: OrderQueryParams): Promise<PaginatedResponse<Order>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<PaginatedResponse<Order>>(`/orders${queryString}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getOrderById(id: string, token: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getOrderByNumber(orderNumber: string, token: string): Promise<Order> {
    return this.request<Order>(`/orders/number/${orderNumber}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateOrder(id: string, orderData: UpdateOrderPayload, token: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus, token: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus, token: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}/payment-status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentStatus }),
    });
  }

  async assignOrderToDriver(orderId: string, driverId: string, token: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}/assign`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ driverId }),
    });
  }

  async cancelOrder(id: string, token: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async deleteOrder(id: string, token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/orders/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Customer specific order endpoints
  async getCustomerOrders(customerId: string, token: string, params?: Omit<OrderQueryParams, 'customerId'>): Promise<PaginatedResponse<Order>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<PaginatedResponse<Order>>(`/orders/customer/${customerId}${queryString}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Driver specific order endpoints
  async getDriverOrders(driverId: string, token: string, params?: Omit<OrderQueryParams, 'driverId'>): Promise<PaginatedResponse<Order>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<PaginatedResponse<Order>>(`/orders/driver/${driverId}${queryString}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getAvailableOrders(token: string, params?: OrderQueryParams): Promise<PaginatedResponse<Order>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<PaginatedResponse<Order>>(`/orders/available${queryString}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Statistics endpoints (for admin dashboard)
  async getOrderStatistics(token: string, startDate?: string, endDate?: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const queryString = this.buildQueryString(params);
    return this.request(`/orders/statistics${queryString}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Utility method to check API health
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health', {
      method: 'GET',
    });
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for testing or multiple instances
export default ApiService;