import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'inventsync.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  -- Products table
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 0,
    condition TEXT DEFAULT 'NEW',
    brand TEXT,
    category TEXT,
    images TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Marketplace connections table
  CREATE TABLE IF NOT EXISTS marketplace_connections (
    id TEXT PRIMARY KEY,
    marketplace TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    credentials TEXT,
    settings TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Listings table (products listed on marketplaces)
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    marketplace_connection_id TEXT NOT NULL,
    external_id TEXT,
    offer_id TEXT,
    status TEXT DEFAULT 'draft',
    listing_url TEXT,
    listing_data TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (marketplace_connection_id) REFERENCES marketplace_connections(id) ON DELETE CASCADE
  );

  -- Create index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_listings_product ON listings(product_id);
  CREATE INDEX IF NOT EXISTS idx_listings_marketplace ON listings(marketplace_connection_id);
`);

console.log('Database initialized successfully');

export default db;
