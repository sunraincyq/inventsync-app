'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:5001';

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        sku: '',
        title: '',
        description: '',
        price: '',
        quantity: '1',
        condition: 'NEW',
        brand: '',
        category: '',
        images: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const images = form.images
                .split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);

            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    price: parseFloat(form.price),
                    quantity: parseInt(form.quantity),
                    images
                })
            });

            const data = await res.json();

            if (data.success) {
                router.push('/products');
            } else {
                setError(data.error || 'Failed to create product');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Product</h1>

            {error && (
                <div className="mb-4 p-4 rounded-md bg-red-50 text-red-800">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                            SKU *
                        </label>
                        <input
                            type="text"
                            name="sku"
                            id="sku"
                            required
                            value={form.sku}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="PRODUCT-001"
                        />
                    </div>

                    <div>
                        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                            Brand
                        </label>
                        <input
                            type="text"
                            name="brand"
                            id="brand"
                            value={form.brand}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Brand name"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title *
                    </label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        required
                        value={form.title}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Product title"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <textarea
                        name="description"
                        id="description"
                        rows={3}
                        value={form.description}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Product description"
                    />
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                            Price *
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                name="price"
                                id="price"
                                required
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={handleChange}
                                className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                            Quantity
                        </label>
                        <input
                            type="number"
                            name="quantity"
                            id="quantity"
                            min="0"
                            value={form.quantity}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                            Condition
                        </label>
                        <select
                            name="condition"
                            id="condition"
                            value={form.condition}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="NEW">New</option>
                            <option value="LIKE_NEW">Like New</option>
                            <option value="USED_EXCELLENT">Used - Excellent</option>
                            <option value="USED_VERY_GOOD">Used - Very Good</option>
                            <option value="USED_GOOD">Used - Good</option>
                            <option value="USED_ACCEPTABLE">Used - Acceptable</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                        Image URLs (one per line)
                    </label>
                    <textarea
                        name="images"
                        id="images"
                        rows={3}
                        value={form.images}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                    />
                </div>

                <div className="flex justify-end space-x-3">
                    <a
                        href="/products"
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </a>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                        {loading ? 'Creating...' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
