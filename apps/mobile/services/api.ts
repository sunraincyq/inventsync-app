import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration and Service for InventSync Mobile

// Update this to your machine's local IP when testing on physical device
// Use 'localhost' for emulator, or your machine's IP (e.g., '192.168.1.100') for physical device
const API_BASE_URL = 'http://10.0.2.2:5001'; // 10.0.2.2 is Android emulator's localhost
const API_URL_KEY = '@inventsync_api_url';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface Product {
    id: string;
    sku: string;
    title: string;
    description: string | null;
    price: number;
    quantity: number;
    condition: string;
    brand: string | null;
    category: string | null;
    images: string[];
    created_at: string;
    updated_at: string;
}

export interface EbayConnection {
    id: string;
    marketplace: string;
    name: string;
    status: string;
    settings: string | null;
    created_at: string;
    updated_at: string;
}

export interface Listing {
    id: string;
    product_id: string;
    marketplace_connection_id: string;
    external_id: string | null;
    offer_id: string | null;
    status: string;
    listing_url: string | null;
    error_message: string | null;
    sku?: string;
    product_title?: string;
    price?: number;
}

class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    async loadBaseUrl() {
        try {
            const storedUrl = await AsyncStorage.getItem(API_URL_KEY);
            if (storedUrl) {
                this.baseUrl = storedUrl;
                console.log('Loaded API URL:', storedUrl);
            }
        } catch (error) {
            console.error('Failed to load API URL:', error);
        }
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network error. Please check your connection.' };
        }
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    }

    // Products
    async getProducts(): Promise<ApiResponse<Product[]>> {
        return this.request<Product[]>('/api/products');
    }

    async getProduct(id: string): Promise<ApiResponse<Product>> {
        return this.request<Product>(`/api/products/${id}`);
    }

    async createProduct(product: Partial<Product>): Promise<ApiResponse<Product>> {
        return this.request<Product>('/api/products', {
            method: 'POST',
            body: JSON.stringify(product),
        });
    }

    async updateProduct(id: string, product: Partial<Product>): Promise<ApiResponse<Product>> {
        return this.request<Product>(`/api/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product),
        });
    }

    async deleteProduct(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`/api/products/${id}`, {
            method: 'DELETE',
        });
    }

    // eBay
    async getEbayConnection(): Promise<ApiResponse<EbayConnection | null>> {
        return this.request<EbayConnection | null>('/api/ebay/connection');
    }

    async connectEbay(accessToken: string, sandbox: boolean = true): Promise<ApiResponse<EbayConnection>> {
        return this.request<EbayConnection>('/api/ebay/connect', {
            method: 'POST',
            body: JSON.stringify({ accessToken, sandbox }),
        });
    }

    async disconnectEbay(): Promise<ApiResponse<void>> {
        return this.request<void>('/api/ebay/disconnect', {
            method: 'POST',
        });
    }

    async listOnEbay(productId: string, categoryId: string): Promise<ApiResponse<{ listingId: string; offerId: string; listingUrl: string }>> {
        return this.request('/api/ebay/list/' + productId, {
            method: 'POST',
            body: JSON.stringify({ categoryId }),
        });
    }

    async getEbayListings(): Promise<ApiResponse<Listing[]>> {
        return this.request<Listing[]>('/api/ebay/listings');
    }

    async getProductListing(productId: string): Promise<ApiResponse<Listing | null>> {
        return this.request<Listing | null>(`/api/ebay/listings/${productId}`);
    }
}


export const api = new ApiService();
// export default api; // Removed to avoid ESM default interop issues
