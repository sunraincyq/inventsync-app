import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Modal } from 'react-native';
import { api, Product, Listing } from '@/services/api';
import { useColorScheme } from '@/components/useColorScheme';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [listingOnEbay, setListingOnEbay] = useState(false);
    const [categoryId, setCategoryId] = useState('');
    const [showEbayForm, setShowEbayForm] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [condition, setCondition] = useState('NEW');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        if (!id) return;
        try {
            const response = await api.getProduct(id);
            if (response.success && response.data) {
                const p = response.data;
                setProduct(p);
                setTitle(p.title);
                setSku(p.sku);
                setDescription(p.description || '');
                setPrice(p.price.toString());
                setQuantity(p.quantity.toString());
                setCondition(p.condition);
                setBrand(p.brand || '');
                setBrand(p.brand || '');
                setCategory(p.category || '');
                setImages(p.images || []);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (useCamera: boolean) => {
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        };

        let result;
        if (useCamera) {
            await ImagePicker.requestCameraPermissionsAsync();
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled && result.assets[0]) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!title.trim() || !price.trim()) {
            Alert.alert('Error', 'Title and price are required');
            return;
        }

        setSaving(true);
        try {
            const productData = {
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(price),
                quantity: parseInt(quantity) || 0,
                condition,
                brand: brand.trim(),
                category: category.trim(),
            };

            let response;
            // Always use FormData if editing to handle potential image changes
            // Or only if images changed? Use FormData to be safe and consistent with create
            const formData = new FormData();

            // Append standard fields
            Object.keys(productData).forEach(key => {
                formData.append(key, String(productData[key as keyof typeof productData]));
            });

            // Handle images
            // 1. Existing remote images (strings starting with http) need to be sent as JSON list
            const existingImages = images.filter(img => img.startsWith('http'));
            formData.append('images', JSON.stringify(existingImages));

            // 2. New local images (file URIs) need to be appended as files
            const newImages = images.filter(img => !img.startsWith('http'));

            newImages.forEach((uri, index) => {
                const filename = uri.split('/').pop() || `image_new_${index}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                // @ts-ignore
                formData.append('images', { uri, name: filename, type });
            });

            response = await api.updateProduct(id!, formData);

            if (response.success && response.data) {
                setProduct(response.data);
                setEditing(false);
                Alert.alert('Success', 'Product updated successfully');
            } else {
                Alert.alert('Error', response.error || 'Failed to update product');
            }
        } catch (err) {
            Alert.alert('Error', 'Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleListOnEbay = async () => {
        if (!categoryId.trim()) {
            Alert.alert('Error', 'Please enter an eBay category ID');
            return;
        }

        setListingOnEbay(true);
        try {
            const response = await api.listOnEbay(id!, categoryId.trim());
            if (response.success) {
                Alert.alert('Success', 'Product listed on eBay!', [
                    { text: 'OK', onPress: () => setShowEbayForm(false) }
                ]);
                setCategoryId('');
            } else {
                Alert.alert('Error', response.error || 'Failed to list on eBay');
            }
        } catch (err) {
            Alert.alert('Error', 'Network error');
        } finally {
            setListingOnEbay(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const response = await api.deleteProduct(id!);
                        if (response.success) {
                            router.back();
                        } else {
                            Alert.alert('Error', response.error || 'Failed to delete');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
                <Text style={[styles.errorText, isDark && styles.textLight]}>Product not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.content}>
                {/* Product Info Card */}
                <View style={[styles.card, isDark && styles.cardDark]}>
                    {editing ? (
                        <>
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
                                placeholder="Product title"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={[styles.label, isDark && styles.textLight]}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.multiline, isDark && styles.inputDark]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Product description"
                                placeholderTextColor="#9ca3af"
                                multiline
                                numberOfLines={3}
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
                                        placeholder="0"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>

                            <Text style={[styles.label, isDark && styles.textLight]}>Brand</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={brand}
                                onChangeText={setBrand}
                                placeholder="Brand name"
                                placeholderTextColor="#9ca3af"
                            />

                            <Text style={[styles.label, isDark && styles.textLight]}>Category</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={category}
                                onChangeText={setCategory}
                                placeholder="Category"
                                placeholderTextColor="#9ca3af"
                            />

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnSecondary]}
                                    onPress={() => setEditing(false)}
                                >
                                    <Text style={styles.btnSecondaryText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    <Text style={styles.btnPrimaryText}>{saving ? 'Saving...' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Product Images */}
                            {product.images && product.images.length > 0 ? (
                                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                                    {product.images.map((img, index) => (
                                        <View key={index} style={styles.imageContainer}>
                                            <Image
                                                source={{ uri: img }}
                                                style={styles.productImage}
                                                resizeMode="contain"
                                            />
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <View style={[styles.imageContainer, styles.placeholderContainer]}>
                                    <FontAwesome name="image" size={48} color="#d1d5db" />
                                </View>
                            )}
                            <Text style={[styles.productTitle, isDark && styles.textLight]}>{product.title}</Text>
                            <Text style={[styles.sku, isDark && styles.textMuted]}>SKU: {product.sku}</Text>

                            <View style={styles.priceRow}>
                                <Text style={styles.price}>${product.price.toFixed(2)}</Text>
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyText}>Qty: {product.quantity}</Text>
                                </View>
                            </View>

                            {product.description && (
                                <Text style={[styles.description, isDark && styles.textMuted]}>{product.description}</Text>
                            )}

                            <View style={styles.metaRow}>
                                {product.brand && (
                                    <View style={styles.metaItem}>
                                        <FontAwesome name="tag" size={12} color="#6b7280" />
                                        <Text style={[styles.metaText, isDark && styles.textMuted]}>{product.brand}</Text>
                                    </View>
                                )}
                                <View style={styles.metaItem}>
                                    <FontAwesome name="star" size={12} color="#6b7280" />
                                    <Text style={[styles.metaText, isDark && styles.textMuted]}>{product.condition}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]}
                                onPress={() => setEditing(true)}
                            >
                                <FontAwesome name="edit" size={16} color="#ffffff" />
                                <Text style={styles.btnPrimaryText}>Edit Product</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* eBay Listing Card */}
                {!editing && (
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <View style={styles.cardHeader}>
                            <FontAwesome name="shopping-cart" size={20} color="#2563eb" />
                            <Text style={[styles.cardTitle, isDark && styles.textLight]}>List on eBay</Text>
                        </View>

                        {showEbayForm ? (
                            <>
                                <Text style={[styles.label, isDark && styles.textLight]}>eBay Category ID</Text>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={categoryId}
                                    onChangeText={setCategoryId}
                                    placeholder="e.g., 9355"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="number-pad"
                                />
                                <Text style={[styles.hint, isDark && styles.textMuted]}>
                                    Find category IDs at eBay's category lookup
                                </Text>

                                <View style={styles.buttonRow}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnSecondary]}
                                        onPress={() => setShowEbayForm(false)}
                                    >
                                        <Text style={styles.btnSecondaryText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.btnPrimary, listingOnEbay && styles.btnDisabled]}
                                        onPress={handleListOnEbay}
                                        disabled={listingOnEbay}
                                    >
                                        <Text style={styles.btnPrimaryText}>
                                            {listingOnEbay ? 'Listing...' : 'List Now'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.btn, styles.btnEbay]}
                                onPress={() => setShowEbayForm(true)}
                            >
                                <FontAwesome name="plus" size={16} color="#ffffff" />
                                <Text style={styles.btnPrimaryText}>List on eBay</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Delete Button */}
                {!editing && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <FontAwesome name="trash" size={16} color="#ef4444" />
                        <Text style={styles.deleteText}>Delete Product</Text>
                    </TouchableOpacity>
                )}
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
    imageScroll: {
        marginBottom: 16,
        height: 250,
    },
    imageContainer: {
        width: Dimensions.get('window').width - 64, // Card padding (16*2) + Screen padding (16*2)
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        overflow: 'hidden',
    },
    placeholderContainer: {
        marginBottom: 16,
    },
    productImage: {
        width: '100%',
        height: '100%',
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
    productTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    sku: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    price: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2563eb',
    },
    qtyBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    qtyText: {
        fontSize: 14,
        color: '#4338ca',
        fontWeight: '500',
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#6b7280',
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
        minHeight: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    half: {
        flex: 1,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
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
    btnEbay: {
        backgroundColor: '#0064d2',
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
    hint: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        marginBottom: 32,
    },
    deleteText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '500',
    },
    textLight: {
        color: '#ffffff',
    },
    textMuted: {
        color: '#9ca3af',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
    },
    // Photo editing styles
    photoList: {
        marginBottom: 16,
    },
    photoContainer: {
        marginRight: 10,
        position: 'relative',
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#e5e7eb',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ef4444',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        paddingLeft: 4,
    },
    addPhotoBtn: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    // Preview Modal
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '90%',
    },
    closePreviewBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
});
