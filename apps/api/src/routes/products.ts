import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';

const router = Router();

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
    created_at: string;
    updated_at: string;
}

// GET /api/products - List all products
router.get('/', (req: Request, res: Response) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as Product[];

        // Parse images JSON for each product
        const parsed = products.map(p => ({
            ...p,
            images: p.images ? JSON.parse(p.images) : []
        }));

        res.json({ success: true, data: parsed });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', (req: Request, res: Response) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Product | undefined;

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({
            success: true,
            data: {
                ...product,
                images: product.images ? JSON.parse(product.images) : []
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/products - Create product
router.post('/', (req: Request, res: Response) => {
    try {
        const { sku, title, description, price, quantity, condition, brand, category, images } = req.body;

        if (!sku || !title || price === undefined) {
            return res.status(400).json({ success: false, error: 'SKU, title, and price are required' });
        }

        const id = uuidv4();
        const imagesJson = JSON.stringify(images || []);

        db.prepare(`
      INSERT INTO products (id, sku, title, description, price, quantity, condition, brand, category, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku, title, description || '', price, quantity || 0, condition || 'NEW', brand || '', category || '', imagesJson);

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;

        res.status(201).json({
            success: true,
            data: {
                ...product,
                images: JSON.parse(product.images)
            }
        });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, error: 'SKU already exists' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', (req: Request, res: Response) => {
    try {
        const { title, description, price, quantity, condition, brand, category, images } = req.body;

        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const imagesJson = images ? JSON.stringify(images) : JSON.stringify([]);

        db.prepare(`
      UPDATE products 
      SET title = ?, description = ?, price = ?, quantity = ?, condition = ?, brand = ?, category = ?, images = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description || '', price, quantity || 0, condition || 'NEW', brand || '', category || '', imagesJson, req.params.id);

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Product;

        res.json({
            success: true,
            data: {
                ...product,
                images: JSON.parse(product.images)
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
