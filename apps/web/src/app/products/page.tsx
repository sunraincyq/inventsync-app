'use client';

import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001';

interface Product {
    id: string;
    sku: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    condition: string;
    brand: string;
    images: string[];
}

interface EbayListing {
    status: string;
    listing_url: string | null;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [ebayConnected, setEbayConnected] = useState(false);
    const [listingModal, setListingModal] = useState<{ show: boolean; product: Product | null; loading: boolean }>({
        show: false,
        product: null,
        loading: false
    });
    const [categoryId, setCategoryId] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchProducts();
        checkEbayConnection();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products`);
            const data = await res.json();
            setProducts(data.data || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkEbayConnection = async () => {
        try {
            const res = await fetch(`${API_URL}/api/ebay/connection`);
            const data = await res.json();
            setEbayConnected(data.data?.status === 'connected');
        } catch (error) {
            console.error('Failed to check eBay connection:', error);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
            setProducts(products.filter(p => p.id !== id));
            setMessage({ type: 'success', text: 'Product deleted successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete product' });
        }
    };

    const openListingModal = (product: Product) => {
        if (!ebayConnected) {
            setMessage({ type: 'error', text: 'Please connect your eBay account first' });
            return;
        }
        setListingModal({ show: true, product, loading: false });
        setCategoryId('');
    };

    const listOnEbay = async () => {
        if (!listingModal.product || !categoryId) return;

        setListingModal({ ...listingModal, loading: true });

        try {
            const res = await fetch(`${API_URL}/api/ebay/list/${listingModal.product.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: `Listed on eBay! ${data.data.listingUrl}` });
                setListingModal({ show: false, product: null, loading: false });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to list on eBay' });
                setListingModal({ ...listingModal, loading: false });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
            setListingModal({ ...listingModal, loading: false });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                <a
                    href="/products/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                </a>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message.text}
                    <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
                </div>
            )}

            {/* eBay Connection Notice */}
            {!ebayConnected && (
                <div className="mb-4 p-4 rounded-md bg-yellow-50 text-yellow-800">
                    <a href="/ebay" className="font-medium underline">Connect your eBay account</a> to list products on eBay.
                </div>
            )}

            {products.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
                    <div className="mt-6">
                        <a
                            href="/products/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Add Product
                        </a>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                                        {product.brand && <div className="text-sm text-gray-500">{product.brand}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {product.condition}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => openListingModal(product)}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="List on eBay"
                                        >
                                            List on eBay
                                        </button>
                                        <a href={`/products/${product.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            Edit
                                        </a>
                                        <button
                                            onClick={() => deleteProduct(product.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* List on eBay Modal */}
            {listingModal.show && listingModal.product && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-lg font-semibold mb-4">List on eBay</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Listing: <strong>{listingModal.product.title}</strong>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                eBay Category ID *
                            </label>
                            <input
                                type="text"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                placeholder="e.g., 11450 (Clothing)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Find category IDs at{' '}
                                <a href="https://pages.ebay.com/sellerinformation/news/categorychanges.html" target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                                    eBay Category Reference
                                </a>
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setListingModal({ show: false, product: null, loading: false })}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                disabled={listingModal.loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={listOnEbay}
                                disabled={!categoryId || listingModal.loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {listingModal.loading ? 'Listing...' : 'List on eBay'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
