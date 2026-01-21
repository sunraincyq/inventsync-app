import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api, Product, Listing } from '@/services/api';
import { useColorScheme } from '@/components/useColorScheme';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [productsRes, listingsRes] = await Promise.all([
        api.getProducts(),
        api.getEbayListings(),
      ]);

      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data);
      } else {
        setError(productsRes.error || 'Failed to load products');
      }

      if (listingsRes.success && listingsRes.data) {
        // Create a map of product_id -> listing for quick lookup
        const listingsMap: Record<string, Listing> = {};
        listingsRes.data.forEach((listing) => {
          listingsMap[listing.product_id] = listing;
        });
        setListings(listingsMap);
      }
    } catch (err) {
      setError('Network error. Is the API running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const response = await api.deleteProduct(product.id);
            if (response.success) {
              setProducts(products.filter(p => p.id !== product.id));
            } else {
              Alert.alert('Error', response.error || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const getListingBadge = (productId: string) => {
    const listing = listings[productId];
    if (!listing) return null;

    const isActive = listing.status === 'active';
    return (
      <View style={[styles.listingBadge, isActive ? styles.badgeActive : styles.badgePending]}>
        <FontAwesome name="shopping-cart" size={10} color={isActive ? '#22c55e' : '#f59e0b'} />
        <Text style={[styles.badgeText, { color: isActive ? '#22c55e' : '#f59e0b' }]}>
          {isActive ? 'Listed' : listing.status}
        </Text>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productCard, isDark && styles.productCardDark]}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View style={styles.productInfo}>
        <View style={styles.titleRow}>
          <Text style={[styles.productTitle, isDark && styles.textLight]} numberOfLines={1}>
            {item.title}
          </Text>
          {getListingBadge(item.id)}
        </View>
        <Text style={[styles.productSku, isDark && styles.textMuted]}>SKU: {item.sku}</Text>
        <View style={styles.productMeta}>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          <Text style={[styles.productQty, isDark && styles.textMuted]}>Qty: {item.quantity}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <FontAwesome name="trash" size={18} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
        <Text style={[styles.loadingText, isDark && styles.textLight]}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {error ? (
        <View style={[styles.center, styles.errorContainer]}>
          <FontAwesome name="exclamation-triangle" size={48} color="#f59e0b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={products.length > 0 ? (
            <View style={[styles.statsContainer, isDark && styles.statsContainerDark]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDark && styles.textLight]}>{products.length}</Text>
                <Text style={[styles.statLabel, isDark && styles.textMuted]}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDark && styles.textLight]}>
                  ${products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(0)}
                </Text>
                <Text style={[styles.statLabel, isDark && styles.textMuted]}>Value</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#22c55e' }]}>
                  {Object.keys(listings).length}
                </Text>
                <Text style={[styles.statLabel, isDark && styles.textMuted]}>Listed</Text>
              </View>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="inbox" size={48} color="#9ca3af" />
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>No products yet</Text>
              <Text style={[styles.emptySubtext, isDark && styles.textMuted]}>
                Tap the + button to add your first product
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/product/new')}
      >
        <FontAwesome name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productCardDark: {
    backgroundColor: '#1f2937',
  },
  productInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  listingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  productQty: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteBtn: {
    padding: 12,
  },
  textLight: {
    color: '#ffffff',
  },
  textMuted: {
    color: '#9ca3af',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 16,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsContainerDark: {
    backgroundColor: '#1f2937',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
});
