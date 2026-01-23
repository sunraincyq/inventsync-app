import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database';


const router = Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

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
router.post('/', upload.array('images'), (req: Request, res: Response) => {
    try {
        let { sku, title, description, price, quantity, condition, brand, category, images } = req.body;

        // Parse numeric fields if coming from FormData (strings)
        if (typeof price === 'string') price = parseFloat(price);
        if (typeof quantity === 'string') quantity = parseInt(quantity);

        if (!sku || !title || price === undefined) {
            return res.status(400).json({ success: false, error: 'SKU, title, and price are required' });
        }

        const id = uuidv4();

        // Handle images
        let imageList: string[] = [];
        // 1. If images passed as JSON string
        if (typeof images === 'string') {
            try {
                imageList = JSON.parse(images);
            } catch (e) {
                imageList = [];
            }
        }

        // 2. Add uploaded files
        if (req.files && Array.isArray(req.files)) {
            const uploadedUrls = (req.files as Express.Multer.File[]).map(file => {
                return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
            });
            imageList = [...imageList, ...uploadedUrls];
        }

        const imagesJson = JSON.stringify(imageList);

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
router.put('/:id', upload.array('images'), (req: Request, res: Response) => {
    try {
        let { title, description, price, quantity, condition, brand, category, images } = req.body;

        // Parse numeric fields
        if (typeof price === 'string') price = parseFloat(price);
        if (typeof quantity === 'string') quantity = parseInt(quantity);

        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Product | undefined;
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Handle images
        let imageList: string[] = [];
        // 1. Use new images list if provided (as string/json)
        if (typeof images === 'string') {
            try {
                imageList = JSON.parse(images);
            } catch (e) {
                // if strictly just a string not json... 
                imageList = [];
            }
        } else if (Array.isArray(images)) {
            imageList = images;
        } else {
            // Keep existing images if not provided? Or default to empty?
            // Usually valid updates provide the list. 
            // If we want to append, the frontend should send existing + new.
            // If images is undefined in body, and no files, maybe we shouldn't update images?
            // But let's assume we want to update.
            // If undefined, maybe keep existing?
            if (images === undefined && (!req.files || (req.files as any[]).length === 0)) {
                imageList = existing.images ? JSON.parse(existing.images) : [];
            } else {
                // If images was meant to be cleared, it should be passed as empty array
                imageList = [];
            }
        }

        // 2. Add uploaded files
        if (req.files && Array.isArray(req.files)) {
            const uploadedUrls = (req.files as Express.Multer.File[]).map(file => {
                return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
            });
            imageList = [...imageList, ...uploadedUrls];
        }

        const imagesJson = JSON.stringify(imageList);

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
