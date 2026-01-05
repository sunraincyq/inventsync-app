'use client';

import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001';

interface EbayConnection {
    id: string;
    marketplace: string;
    name: string;
    status: string;
    created_at: string;
}

interface Listing {
    id: string;
    sku: string;
    product_title: string;
    status: string;
    listing_url: string | null;
    created_at: string;
    error_message: string | null;
}

export default function EbayPage() {
    const [connection, setConnection] = useState<EbayConnection | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [sandbox, setSandbox] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch connection
            const connRes = await fetch(`${API_URL}/api/ebay/connection`);
            const connData = await connRes.json();
            setConnection(connData.data);

            // Fetch listings
            const listRes = await fetch(`${API_URL}/api/ebay/listings`);
            const listData = await listRes.json();
            setListings(listData.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const connectEbay = async () => {
        if (!accessToken.trim()) {
            setMessage({ type: 'error', text: 'Please enter your eBay access token' });
            return;
        }

        setConnecting(true);

        try {
            const res = await fetch(`${API_URL}/api/ebay/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: accessToken.trim(), sandbox })
            });

            const data = await res.json();

            if (data.success) {
                setConnection(data.data);
                setShowConnectModal(false);
                setAccessToken('');
                setMessage({ type: 'success', text: 'eBay connected successfully!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to connect eBay' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setConnecting(false);
        }
    };

    const disconnectEbay = async () => {
        if (!confirm('Are you sure you want to disconnect eBay?')) return;

        try {
            await fetch(`${API_URL}/api/ebay/disconnect`, { method: 'POST' });
            setConnection(null);
            setMessage({ type: 'success', text: 'eBay disconnected' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
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
            <h1 className="text-3xl font-bold text-gray-900 mb-8">eBay Integration</h1>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message.text}
                    <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
                </div>
            )}

            {/* Connection Status */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h2>

                {connection ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <div>
                                <p className="font-medium text-gray-900">Connected to eBay</p>
                                <p className="text-sm text-gray-500">Connected on {new Date(connection.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button
                            onClick={disconnectEbay}
                            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                            <div>
                                <p className="font-medium text-gray-900">Not Connected</p>
                                <p className="text-sm text-gray-500">Connect your eBay account to list products</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowConnectModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Connect eBay
                        </button>
                    </div>
                )}
            </div>

            {/* How to get token info */}
            {!connection && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">How to get your eBay Access Token</h3>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
                        <li>Go to <a href="https://developer.ebay.com/my/keys" target="_blank" rel="noopener noreferrer" className="underline">eBay Developer Portal</a></li>
                        <li>Create or select an application (Sandbox for testing, Production for live)</li>
                        <li>Click "Get a Token from eBay via Your Application"</li>
                        <li>Sign in with your eBay seller account</li>
                        <li>Copy the generated OAuth User Token</li>
                        <li>Paste it here to connect</li>
                    </ol>
                    <p className="mt-4 text-sm text-blue-700">
                        <strong>Note:</strong> For testing, use Sandbox environment. Switch to Production when ready to go live.
                    </p>
                </div>
            )}

            {/* Listings */}
            {connection && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">eBay Listings</h2>
                        <a href="/products" className="text-indigo-600 hover:text-indigo-800 text-sm">
                            Go to Products →
                        </a>
                    </div>

                    {listings.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No listings yet. Go to Products to list items on eBay.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {listings.map((listing) => (
                                    <tr key={listing.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {listing.product_title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{listing.sku}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listing.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    listing.status === 'error' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {listing.status}
                                            </span>
                                            {listing.error_message && (
                                                <p className="text-xs text-red-600 mt-1">{listing.error_message}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {listing.listing_url ? (
                                                <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                                                    View on eBay →
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Connect Modal */}
            {showConnectModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-lg font-semibold mb-4">Connect eBay Account</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Environment
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        checked={sandbox}
                                        onChange={() => setSandbox(true)}
                                        className="mr-2"
                                    />
                                    Sandbox (Testing)
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        checked={!sandbox}
                                        onChange={() => setSandbox(false)}
                                        className="mr-2"
                                    />
                                    Production (Live)
                                </label>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                eBay OAuth Access Token *
                            </label>
                            <textarea
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                placeholder="Paste your eBay OAuth User Token here..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConnectModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                disabled={connecting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={connectEbay}
                                disabled={connecting || !accessToken.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {connecting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
