import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api, EbayConnection, Listing } from '@/services/api';
import { useColorScheme } from '@/components/useColorScheme';

export default function EbayScreen() {
    const [connection, setConnection] = useState<EbayConnection | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [sandbox, setSandbox] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const fetchData = useCallback(async () => {
        try {
            const [connRes, listingsRes] = await Promise.all([
                api.getEbayConnection(),
                api.getEbayListings(),
            ]);

            if (connRes.success) {
                setConnection(connRes.data || null);
            }
            if (listingsRes.success && listingsRes.data) {
                setListings(listingsRes.data);
            }
        } catch (err) {
            console.error('Error fetching eBay data:', err);
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

    const handleConnect = async () => {
        if (!accessToken.trim()) {
            Alert.alert('Error', 'Please enter your eBay access token');
            return;
        }

        setConnecting(true);
        try {
            const response = await api.connectEbay(accessToken.trim(), sandbox);
            if (response.success && response.data) {
                setConnection(response.data);
                setAccessToken('');
                Alert.alert('Success', 'eBay connected successfully!');
            } else {
                Alert.alert('Error', response.error || 'Failed to connect to eBay');
            }
        } catch (err) {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        Alert.alert(
            'Disconnect eBay',
            'Are you sure you want to disconnect your eBay account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        const response = await api.disconnectEbay();
                        if (response.success) {
                            setConnection(null);
                            setListings([]);
                        } else {
                            Alert.alert('Error', response.error || 'Failed to disconnect');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
                <Text style={[styles.loadingText, isDark && styles.textLight]}>Loading eBay status...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, isDark && styles.containerDark]}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Connection Status */}
            <View style={[styles.card, isDark && styles.cardDark]}>
                <View style={styles.cardHeader}>
                    <FontAwesome name="link" size={20} color="#2563eb" />
                    <Text style={[styles.cardTitle, isDark && styles.textLight]}>Connection Status</Text>
                </View>

                {connection ? (
                    <View>
                        <View style={styles.statusRow}>
                            <View style={styles.connectedBadge}>
                                <FontAwesome name="check-circle" size={16} color="#22c55e" />
                                <Text style={styles.connectedText}>Connected</Text>
                            </View>
                            <Text style={[styles.storeName, isDark && styles.textMuted]}>{connection.name}</Text>
                        </View>
                        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                            <Text style={styles.disconnectText}>Disconnect</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <Text style={[styles.description, isDark && styles.textMuted]}>
                            Connect your eBay account to list products directly from this app.
                        </Text>

                        <Text style={[styles.label, isDark && styles.textLight]}>Access Token</Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={accessToken}
                            onChangeText={setAccessToken}
                            placeholder="Enter your eBay OAuth access token"
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={styles.sandboxToggle}
                            onPress={() => setSandbox(!sandbox)}
                        >
                            <FontAwesome
                                name={sandbox ? 'check-square' : 'square-o'}
                                size={20}
                                color="#2563eb"
                            />
                            <Text style={[styles.sandboxText, isDark && styles.textLight]}>Sandbox Mode</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.connectBtn, connecting && styles.btnDisabled]}
                            onPress={handleConnect}
                            disabled={connecting}
                        >
                            <Text style={styles.connectText}>
                                {connecting ? 'Connecting...' : 'Connect eBay'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Listings */}
            {connection && (
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <View style={styles.cardHeader}>
                        <FontAwesome name="list" size={20} color="#2563eb" />
                        <Text style={[styles.cardTitle, isDark && styles.textLight]}>Recent Listings</Text>
                    </View>

                    {listings.length === 0 ? (
                        <Text style={[styles.noListings, isDark && styles.textMuted]}>
                            No listings yet. Go to Products and tap a product to list it on eBay.
                        </Text>
                    ) : (
                        listings.map((listing) => (
                            <View key={listing.id} style={[styles.listingItem, isDark && styles.listingItemDark]}>
                                <View style={styles.listingInfo}>
                                    <Text style={[styles.listingTitle, isDark && styles.textLight]} numberOfLines={1}>
                                        {listing.product_title}
                                    </Text>
                                    <Text style={[styles.listingSku, isDark && styles.textMuted]}>{listing.sku}</Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    listing.status === 'active' ? styles.statusActive : styles.statusError
                                ]}>
                                    <Text style={styles.statusText}>{listing.status}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}
        </ScrollView>
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
    content: {
        padding: 16,
    },
    card: {
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
    cardDark: {
        backgroundColor: '#1f2937',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
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
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    inputDark: {
        backgroundColor: '#374151',
        borderColor: '#4b5563',
        color: '#ffffff',
    },
    sandboxToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    sandboxText: {
        fontSize: 14,
        color: '#374151',
    },
    connectBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    connectText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    connectedText: {
        color: '#22c55e',
        fontSize: 14,
        fontWeight: '500',
    },
    storeName: {
        fontSize: 14,
        color: '#6b7280',
    },
    disconnectBtn: {
        borderWidth: 1,
        borderColor: '#ef4444',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    disconnectText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '500',
    },
    noListings: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 24,
    },
    listingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    listingItemDark: {
        borderBottomColor: '#374151',
    },
    listingInfo: {
        flex: 1,
    },
    listingTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    listingSku: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusActive: {
        backgroundColor: '#dcfce7',
    },
    statusError: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
});
