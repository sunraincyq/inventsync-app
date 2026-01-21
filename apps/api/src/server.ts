import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products';
import ebayRouter from './routes/ebay';

const app = express();

// Get environment variables
const PORT = process.env.PORT || 5001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

console.log(`Starting InventSync API...`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`CORS Origin: ${CORS_ORIGIN}`);

// Middleware
// Allow CORS from web app and mobile (Android emulator uses 10.0.2.2 to reach host)
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        // Allow localhost origins for web and mobile development
        if (origin.includes('localhost') || origin.includes('10.0.2.2') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
            return callback(null, true);
        }
        // Allow configured origin
        if (origin === CORS_ORIGIN) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/products', productsRouter);
app.use('/api/ebay', ebayRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 InventSync API running on http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET    /health           - Health check`);
    console.log(`  GET    /api/products     - List all products`);
    console.log(`  POST   /api/products     - Create product`);
    console.log(`  GET    /api/products/:id - Get product`);
    console.log(`  PUT    /api/products/:id - Update product`);
    console.log(`  DELETE /api/products/:id - Delete product`);
    console.log(`  GET    /api/ebay/connection    - Get eBay connection status`);
    console.log(`  POST   /api/ebay/connect       - Connect eBay account`);
    console.log(`  POST   /api/ebay/disconnect    - Disconnect eBay`);
    console.log(`  POST   /api/ebay/list/:id      - List product on eBay`);
    console.log(`  GET    /api/ebay/listings      - Get all eBay listings`);
});

export default app;
