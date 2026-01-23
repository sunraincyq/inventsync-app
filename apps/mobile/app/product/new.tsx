import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { Image, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { useColorScheme } from '@/components/useColorScheme';
import { CategorySearchModal } from '@/components/CategorySearchModal';

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
    const [category, setCategory] = useState<{ id: string, name: string } | null>(null);
    const [images, setImages] = useState<string[]>([]);

    // Modals
    const [showCategorySearch, setShowCategorySearch] = useState(false);
    const [showConditionPicker, setShowConditionPicker] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const pickImage = async (useCamera: boolean) => {
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            // Aspect ratio removed to allow freeform crop
            quality: 0.8,
        };

        let result;
        if (useCamera) {
            await ImagePicker.requestCameraPermissionsAsync();
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            await ImagePicker.requestMediaLibraryPermissionsAsync();
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

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
            const productData = {
                title: title.trim(),
                sku: sku.trim(),
                description: description.trim(),
                price: parseFloat(price),
                quantity: parseInt(quantity) || 0,
                condition,
                brand: brand.trim(),
                category: category?.id || '',
            };

            // If we have images, use FormData
            let response;
            if (images.length > 0) {
                const formData = new FormData();
                // Append standard fields
                Object.keys(productData).forEach(key => {
                    formData.append(key, String(productData[key as keyof typeof productData]));
                });

                // Append images
                images.forEach((uri, index) => {
                    const filename = uri.split('/').pop() || `image_${index}.jpg`;
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;

                    // @ts-ignore
                    formData.append('images', { uri, name: filename, type });
                });

                response = await api.createProduct(formData);
            } else {
                response = await api.createProduct({
                    ...productData,
                    images: [],
                });
            }

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
            <CategorySearchModal
                visible={showCategorySearch}
                onClose={() => setShowCategorySearch(false)}
                onSelect={(cat) => setCategory(cat)}
            />

            <Modal
                visible={showConditionPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConditionPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowConditionPicker(false)}
                >
                    <View style={[styles.dropdownModal, isDark && styles.dropdownModalDark]}>
                        <FlatList
                            data={CONDITIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, isDark && styles.dropdownItemDark]}
                                    onPress={() => {
                                        setCondition(item);
                                        setShowConditionPicker(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, isDark && styles.textLight]}>
                                        {item.replace('_', ' ')}
                                    </Text>
                                    {condition === item && (
                                        <FontAwesome name="check" size={16} color="#2563eb" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={!!previewImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
            >
                <View style={styles.previewOverlay}>
                    <TouchableOpacity
                        style={styles.closePreviewBtn}
                        onPress={() => setPreviewImage(null)}
                    >
                        <FontAwesome name="times" size={24} color="#fff" />
                    </TouchableOpacity>
                    {previewImage && (
                        <Image
                            source={{ uri: previewImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <View style={styles.content}>
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <Text style={[styles.label, isDark && styles.textLight]}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.photoContainer}>
                                <TouchableOpacity onPress={() => setPreviewImage(uri)}>
                                    <Image source={{ uri }} style={styles.photo} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removePhotoBtn}
                                    onPress={() => removeImage(index)}
                                >
                                    <FontAwesome name="times" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <View style={styles.photoActions}>
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickImage(false)}>
                                <FontAwesome name="image" size={20} color="#2563eb" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickImage(true)}>
                                <FontAwesome name="camera" size={20} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

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
                    <TouchableOpacity
                        style={[styles.input, styles.dropdownTrigger, isDark && styles.inputDark]}
                        onPress={() => setShowConditionPicker(true)}
                    >
                        <Text style={[styles.inputText, isDark && styles.textLight]}>
                            {condition.replace('_', ' ')}
                        </Text>
                        <FontAwesome name="chevron-down" size={12} color="#9ca3af" />
                    </TouchableOpacity>

                    <Text style={[styles.label, isDark && styles.textLight]}>Brand</Text>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="Brand name (optional)"
                        placeholderTextColor="#9ca3af"
                    />

                    <Text style={[styles.label, isDark && styles.textLight]}>Category</Text>
                    <TouchableOpacity
                        style={[styles.input, styles.dropdownTrigger, isDark && styles.inputDark]}
                        onPress={() => setShowCategorySearch(true)}
                    >
                        <Text style={[
                            styles.inputText,
                            !category && styles.placeholderText,
                            isDark && styles.textLight
                        ]}>
                            {category ? `${category.name} (${category.id})` : "Tap to search category"}
                        </Text>
                        <FontAwesome name="search" size={12} color="#9ca3af" />
                    </TouchableOpacity>
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
    // New Styles
    photoList: {
        marginBottom: 16,
    },
    photoContainer: {
        width: 80,
        height: 80,
        marginRight: 8,
        borderRadius: 8,
        position: 'relative',
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#ef4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 8,
    },
    addPhotoBtn: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    dropdownModal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: 300,
    },
    dropdownModalDark: {
        backgroundColor: '#1f2937',
    },
    dropdownItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownItemDark: {
        borderBottomColor: '#374151',
    },
    dropdownText: {
        fontSize: 16,
        color: '#111827',
    },
    // Preview Styles
    previewOverlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    closePreviewBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
});
