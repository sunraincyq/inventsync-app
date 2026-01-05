import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { EbayService, EbayProduct } from '../services/ebay.service';

const router = Router();

interface MarketplaceConnection {
    id: string;
    marketplace: string;
    name: string;
    status: string;
    credentials: string | null;
    settings: string | null;
    created_at: string;
    updated_at: string;
}

interface Product {
    id: string;
    sku: string;
    title: string;
    description: string | null;
    price: number;
    quantity: number;
    condition: string;
    brand: string | null;
    category: string | null;
    images: string;
}

interface Listing {
    id: string;
    product_id: string;
    marketplace_connection_id: string;
    external_id: string | null;
    offer_id: string | null;
    status: string;
    listing_url: string | null;
    listing_data: string | null;
    error_message: string | null;
}

// GET /api/ebay/connection - Get eBay connection status
router.get('/connection', (req: Request, res: Response) => {
    try {
        const connection = db.prepare(
            "SELECT id, marketplace, name, status, settings, created_at, updated_at FROM marketplace_connections WHERE marketplace = 'ebay' LIMIT 1"
        ).get() as MarketplaceConnection | undefined;

        res.json({ success: true, data: connection || null });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ebay/connect - Connect eBay account
router.post('/connect', async (req: Request, res: Response) => {
    try {
        const { accessToken, sandbox = true } = req.body;

        if (!accessToken) {
            return res.status(400).json({ success: false, error: 'Access token is required' });
        }

        // Verify token works
        const ebay = new EbayService(accessToken, sandbox);
        const isValid = await ebay.verifyToken();

        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid or expired eBay access token' });
        }

        // Remove existing connection
        db.prepare("DELETE FROM marketplace_connections WHERE marketplace = 'ebay'").run();

        // Create new connection
        const id = uuidv4();
        const credentials = JSON.stringify({ accessToken, sandbox });
        const settings = JSON.stringify({ autoSync: false });

        db.prepare(`
      INSERT INTO marketplace_connections (id, marketplace, name, status, credentials, settings)
      VALUES (?, 'ebay', 'eBay Store', 'connected', ?, ?)
    `).run(id, credentials, settings);

        // Try to ensure inventory location exists
        await ebay.ensureInventoryLocation();

        const connection = db.prepare(
            "SELECT id, marketplace, name, status, settings, created_at, updated_at FROM marketplace_connections WHERE id = ?"
        ).get(id);

        res.status(201).json({ success: true, data: connection, message: 'eBay connected successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ebay/disconnect - Disconnect eBay
router.post('/disconnect', (req: Request, res: Response) => {
    try {
        db.prepare("DELETE FROM marketplace_connections WHERE marketplace = 'ebay'").run();
        res.json({ success: true, message: 'eBay disconnected' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ebay/list/:productId - List a product on eBay
router.post('/list/:productId', async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({ success: false, error: 'Category ID is required' });
        }

        // Get product
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId) as Product | undefined;
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Get eBay connection
        const connection = db.prepare(
            "SELECT * FROM marketplace_connections WHERE marketplace = 'ebay' AND status = 'connected' LIMIT 1"
        ).get() as MarketplaceConnection | undefined;

        if (!connection) {
            return res.status(400).json({ success: false, error: 'eBay is not connected. Please connect your eBay account first.' });
        }

        const creds = JSON.parse(connection.credentials || '{}');
        const ebay = new EbayService(creds.accessToken, creds.sandbox);

        // Parse images
        const images = product.images ? JSON.parse(product.images) : [];

        // Create eBay product object
        const ebayProduct: EbayProduct = {
            sku: product.sku,
            title: product.title,
            description: product.description || product.title,
            price: product.price,
            quantity: product.quantity || 1,
            condition: product.condition || 'NEW',
            brand: product.brand || undefined,
            images: images
        };

        // List on eBay
        const result = await ebay.listProduct(ebayProduct, categoryId);

        // Save listing record
        const listingId = uuidv4();
        db.prepare(`
      INSERT INTO listings (id, product_id, marketplace_connection_id, external_id, offer_id, status, listing_url, listing_data, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            listingId,
            product.id,
            connection.id,
            result.listingId || null,
            result.offerId || null,
            result.success ? 'active' : 'error',
            result.listingUrl || null,
            JSON.stringify(result),
            result.error || null
        );

        if (result.success) {
            res.json({
                success: true,
                data: {
                    listingId: result.listingId,
                    offerId: result.offerId,
                    listingUrl: result.listingUrl
                },
                message: 'Product listed on eBay successfully!'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                message: 'Failed to list product on eBay'
            });
        }
    } catch (error: any) {
        console.error('eBay listing error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ebay/listings - Get all eBay listings
router.get('/listings', (req: Request, res: Response) => {
    try {
        const listings = db.prepare(`
      SELECT l.*, p.sku, p.title as product_title, p.price
      FROM listings l
      JOIN products p ON l.product_id = p.id
      JOIN marketplace_connections mc ON l.marketplace_connection_id = mc.id
      WHERE mc.marketplace = 'ebay'
      ORDER BY l.created_at DESC
    `).all();

        res.json({ success: true, data: listings });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ebay/listings/:productId - Check if product is listed on eBay
router.get('/listings/:productId', (req: Request, res: Response) => {
    try {
        const listing = db.prepare(`
      SELECT l.* FROM listings l
      JOIN marketplace_connections mc ON l.marketplace_connection_id = mc.id
      WHERE l.product_id = ? AND mc.marketplace = 'ebay'
      ORDER BY l.created_at DESC
      LIMIT 1
    `).get(req.params.productId);

        res.json({ success: true, data: listing || null });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
