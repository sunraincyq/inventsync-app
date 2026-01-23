import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api } from '@/services/api';
import { useColorScheme } from './useColorScheme';

interface Category {
    id: string;
    name: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (category: Category) => void;
}

export function CategorySearchModal({ visible, onClose, onSelect }: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Category[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const response = await api.searchCategories(query.trim());
            if (response.success && response.data) {
                setResults(response.data);
            } else {
                setError(response.error || 'Failed to search categories');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, isDark && styles.containerDark]}>
                <View style={styles.header}>
                    <Text style={[styles.title, isDark && styles.textLight]}>Search Categories</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesome name="times" size={20} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={query}
                        onChangeText={setQuery}
                        placeholder="e.g. Vintage Camera"
                        placeholderTextColor="#9ca3af"
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoFocus
                    />
                    <TouchableOpacity
                        style={[styles.searchBtn, !query.trim() && styles.disabledBtn]}
                        onPress={handleSearch}
                        disabled={!query.trim() || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <FontAwesome name="search" size={16} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>

                {error && (
                    <Text style={styles.errorText}>{error}</Text>
                )}

                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.item, isDark && styles.itemDark]}
                            onPress={() => {
                                onSelect(item);
                                onClose();
                            }}
                        >
                            <Text style={[styles.itemText, isDark && styles.textLight]}>{item.name}</Text>
                            <Text style={styles.itemId}>ID: {item.id}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        !loading && query && results.length === 0 ? (
                            <Text style={styles.emptyText}>No categories found</Text>
                        ) : null
                    }
                />
            </View>
        </Modal>
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
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeBtn: {
        padding: 8,
    },
    searchBox: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
    },
    searchBoxDark: {
        backgroundColor: '#1f2937',
    },
    input: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    inputDark: {
        backgroundColor: '#374151',
        borderColor: '#4b5563',
        color: '#ffffff',
    },
    searchBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    disabledBtn: {
        opacity: 0.5,
    },
    list: {
        padding: 16,
    },
    item: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    itemDark: {
        backgroundColor: '#1f2937',
        borderColor: '#374151',
    },
    itemText: {
        fontSize: 16,
        color: '#111827',
        marginBottom: 4,
    },
    itemId: {
        fontSize: 12,
        color: '#6b7280',
    },
    textLight: {
        color: '#ffffff',
    },
    errorText: {
        color: '#ef4444',
        padding: 16,
        textAlign: 'center',
    },
    emptyText: {
        color: '#6b7280',
        padding: 16,
        textAlign: 'center',
    },
});
