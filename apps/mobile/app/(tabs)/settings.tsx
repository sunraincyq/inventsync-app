import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/services/api';

const API_URL_KEY = '@inventsync_api_url';
const DEFAULT_API_URL = 'http://10.0.2.2:5001';

export default function SettingsScreen() {
    const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
    const [savedUrl, setSavedUrl] = useState(DEFAULT_API_URL);
    const [testing, setTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        loadApiUrl();
    }, []);

    const loadApiUrl = async () => {
        try {
            const stored = await AsyncStorage.getItem(API_URL_KEY);
            if (stored) {
                setApiUrl(stored);
                setSavedUrl(stored);
            }
        } catch (err) {
            console.error('Failed to load API URL:', err);
        }
    };


    const saveApiUrl = async () => {
        try {
            await AsyncStorage.setItem(API_URL_KEY, apiUrl);
            // Update the running API service instance immediately
            api.setBaseUrl(apiUrl);

            setSavedUrl(apiUrl);
            Alert.alert('Saved', 'API URL has been updated successfully.');
        } catch (err) {
            Alert.alert('Error', 'Failed to save API URL');
        }
    };

    const testConnection = async () => {
        setTesting(true);
        setConnectionStatus('unknown');
        try {
            const response = await fetch(`${apiUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.status === 'ok') {
                setConnectionStatus('connected');
                Alert.alert('Success', 'API connection successful!');
            } else {
                setConnectionStatus('error');
                Alert.alert('Error', 'API responded but status was not OK');
            }
        } catch (err) {
            setConnectionStatus('error');
            Alert.alert('Connection Failed', 'Could not connect to the API. Check the URL and ensure the server is running.');
        } finally {
            setTesting(false);
        }
    };

    const resetToDefault = () => {
        setApiUrl(DEFAULT_API_URL);
    };

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.content}>
                {/* API Configuration Card */}
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <View style={styles.cardHeader}>
                        <FontAwesome name="cog" size={20} color="#2563eb" />
                        <Text style={[styles.cardTitle, isDark && styles.textLight]}>API Configuration</Text>
                    </View>

                    <Text style={[styles.description, isDark && styles.textMuted]}>
                        Configure the API server URL. Use your machine's IP address when testing on a physical device.
                    </Text>

                    <Text style={[styles.label, isDark && styles.textLight]}>API Base URL</Text>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={apiUrl}
                        onChangeText={setApiUrl}
                        placeholder="http://localhost:5001"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />

                    <View style={styles.urlHints}>
                        <Text style={[styles.hint, isDark && styles.textMuted]}>
                            • Android Emulator: http://10.0.2.2:5001
                        </Text>
                        <Text style={[styles.hint, isDark && styles.textMuted]}>
                            • iOS Simulator: http://localhost:5001
                        </Text>
                        <Text style={[styles.hint, isDark && styles.textMuted]}>
                            • Physical Device: http://YOUR_IP:5001
                        </Text>
                    </View>

                    {/* Connection Status */}
                    {connectionStatus !== 'unknown' && (
                        <View style={[
                            styles.statusBadge,
                            connectionStatus === 'connected' ? styles.statusConnected : styles.statusError
                        ]}>
                            <FontAwesome
                                name={connectionStatus === 'connected' ? 'check-circle' : 'times-circle'}
                                size={14}
                                color={connectionStatus === 'connected' ? '#22c55e' : '#ef4444'}
                            />
                            <Text style={[
                                styles.statusText,
                                { color: connectionStatus === 'connected' ? '#22c55e' : '#ef4444' }
                            ]}>
                                {connectionStatus === 'connected' ? 'Connected' : 'Connection Failed'}
                            </Text>
                        </View>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnSecondary]}
                            onPress={resetToDefault}
                        >
                            <Text style={styles.btnSecondaryText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary, testing && styles.btnDisabled]}
                            onPress={testConnection}
                            disabled={testing}
                        >
                            <FontAwesome name="wifi" size={14} color="#ffffff" />
                            <Text style={styles.btnPrimaryText}>
                                {testing ? 'Testing...' : 'Test'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {apiUrl !== savedUrl && (
                        <TouchableOpacity
                            style={[styles.saveBtn]}
                            onPress={saveApiUrl}
                        >
                            <FontAwesome name="save" size={16} color="#ffffff" />
                            <Text style={styles.btnPrimaryText}>Save Changes</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* About Card */}
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <View style={styles.cardHeader}>
                        <FontAwesome name="info-circle" size={20} color="#2563eb" />
                        <Text style={[styles.cardTitle, isDark && styles.textLight]}>About</Text>
                    </View>
                    <Text style={[styles.aboutText, isDark && styles.textMuted]}>
                        InventSync Mobile v1.0.0
                    </Text>
                    <Text style={[styles.aboutText, isDark && styles.textMuted]}>
                        Multi-Channel Inventory Management
                    </Text>
                </View>
            </View>
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
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 16,
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
        fontFamily: 'monospace',
    },
    inputDark: {
        backgroundColor: '#374151',
        borderColor: '#4b5563',
        color: '#ffffff',
    },
    urlHints: {
        marginTop: 12,
        gap: 4,
    },
    hint: {
        fontSize: 12,
        color: '#6b7280',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    statusConnected: {
        backgroundColor: '#dcfce7',
    },
    statusError: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 12,
        borderRadius: 8,
    },
    btnPrimary: {
        backgroundColor: '#2563eb',
    },
    btnSecondary: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnPrimaryText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    btnSecondaryText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#22c55e',
        padding: 14,
        borderRadius: 8,
        marginTop: 12,
    },
    aboutText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    textLight: {
        color: '#ffffff',
    },
    textMuted: {
        color: '#9ca3af',
    },
});
