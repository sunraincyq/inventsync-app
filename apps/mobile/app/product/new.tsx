import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api } from '@/services/api';
import { useColorScheme } from '@/components/useColorScheme';

const CONDITIONS = ['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE'];

export default function NewProductScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [condition, setCondition] = useState('NEW');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }
        if (!sku.trim()) {
            Alert.alert('Error', 'SKU is required');
            return;
        }
        if (!price.trim() || isNaN(parseFloat(price))) {
            Alert.alert('Error', 'Valid price is required');
            return;
        }

        setSaving(true);
        try {
            const response = await api.createProduct({
                title: title.trim(),
                sku: sku.trim(),
                description: description.trim(),
                price: parseFloat(price),
                quantity: parseInt(quantity) || 0,
                condition,
                brand: brand.trim(),
                category: category.trim(),
                images: [],
            });

            if (response.success && response.data) {
                Alert.alert('Success', 'Product created!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Error', response.error || 'Failed to create product');
            }
        } catch (err) {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.content}>
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <Text style={[styles.label, isDark && styles.textLight]}>Title *</Text>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter product title"
                        placeholderTextColor="#9ca3af"
                    />

                    <Text style={[styles.label, isDark && styles.textLight]}>SKU *</Text>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={sku}
                        onChangeText={setSku}
                        placeholder="Unique product identifier"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="characters"
                    />

                    <Text style={[styles.label, isDark && styles.textLight]}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.multiline, isDark && styles.inputDark]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Product description"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={4}
                    />

                    <View style={styles.row}>
                        <View style={styles.half}>
                            <Text style={[styles.label, isDark && styles.textLight]}>Price *</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                        <View style={styles.half}>
                            <Text style={[styles.label, isDark && styles.textLight]}>Quantity</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="number-pad"
                                placeholder="1"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </View>

                    <Text style={[styles.label, isDark && styles.textLight]}>Condition</Text>
                    <View style={styles.conditionRow}>
                        {CONDITIONS.map((c) => (
                            <TouchableOpacity
                                key={c}
                                style={[
                                    styles.conditionBtn,
                                    condition === c && styles.conditionBtnActive,
                                    isDark && styles.conditionBtnDark,
                                ]}
                                onPress={() => setCondition(c)}
                            >
                                <Text style={[
                                    styles.conditionText,
                                    condition === c && styles.conditionTextActive,
                                ]}>
                                    {c.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, isDark && styles.textLight]}>Brand</Text>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="Brand name (optional)"
                        placeholderTextColor="#9ca3af"
                    />

                    <Text style={[styles.label, isDark && styles.textLight]}>Category</Text>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={category}
                        onChangeText={setCategory}
                        placeholder="Product category (optional)"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnSecondary]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.btnSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <FontAwesome name="check" size={16} color="#ffffff" />
                        <Text style={styles.btnPrimaryText}>{saving ? 'Creating...' : 'Create Product'}</Text>
                    </TouchableOpacity>
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
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
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
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    half: {
        flex: 1,
    },
    conditionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    conditionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#f9fafb',
    },
    conditionBtnDark: {
        backgroundColor: '#374151',
        borderColor: '#4b5563',
    },
    conditionBtnActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    conditionText: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
    },
    conditionTextActive: {
        color: '#ffffff',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 8,
    },
    btnPrimary: {
        backgroundColor: '#2563eb',
    },
    btnSecondary: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnPrimaryText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    btnSecondaryText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
    textLight: {
        color: '#ffffff',
    },
});
