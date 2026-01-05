import axios, { AxiosError } from 'axios';

const EBAY_SANDBOX_URL = 'https://api.sandbox.ebay.com';
const EBAY_PRODUCTION_URL = 'https://api.ebay.com';

export interface EbayProduct {
    sku: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    condition: string;
    brand?: string;
    images: string[];
    category?: string;
}

export interface EbayListingResult {
    success: boolean;
    listingId?: string;
    offerId?: string;
    listingUrl?: string;
    error?: string;
}

export class EbayService {
    private baseUrl: string;
    private accessToken: string;

    constructor(accessToken: string, sandbox = true) {
        this.baseUrl = sandbox ? EBAY_SANDBOX_URL : EBAY_PRODUCTION_URL;
        this.accessToken = accessToken;
    }

    private headers() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Language': 'en-US'
        };
    }

    // Create or update inventory location (required before listing)
    async ensureInventoryLocation(locationKey: string = 'default-location'): Promise<boolean> {
        try {
            // Check if location exists
            await axios.get(
                `${this.baseUrl}/sell/inventory/v1/location/${locationKey}`,
                { headers: this.headers() }
            );
            console.log('Inventory location exists:', locationKey);
            return true;
        } catch (error) {
            // Location doesn't exist, create it
            try {
                await axios.post(
                    `${this.baseUrl}/sell/inventory/v1/location/${locationKey}`,
                    {
                        location: {
                            address: {
                                addressLine1: '123 Main Street',
                                city: 'San Jose',
                                stateOrProvince: 'CA',
                                postalCode: '95125',
                                country: 'US'
                            }
                        },
                        locationTypes: ['WAREHOUSE'],
                        name: 'Default Warehouse',
                        merchantLocationStatus: 'ENABLED'
                    },
                    { headers: this.headers() }
                );
                console.log('Created inventory location:', locationKey);
                return true;
            } catch (createError: any) {
                console.error('Failed to create location:', createError.response?.data || createError.message);
                return false;
            }
        }
    }

    // Create or update inventory item
    async createOrUpdateInventoryItem(product: EbayProduct): Promise<{ success: boolean; error?: string }> {
        try {
            const inventoryItem = {
                availability: {
                    shipToLocationAvailability: {
                        quantity: product.quantity
                    }
                },
                condition: this.mapCondition(product.condition),
                product: {
                    title: product.title,
                    description: product.description || product.title,
                    aspects: product.brand ? { Brand: [product.brand] } : undefined,
                    imageUrls: product.images.length > 0 ? product.images : ['https://via.placeholder.com/500x500?text=No+Image']
                }
            };

            await axios.put(
                `${this.baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(product.sku)}`,
                inventoryItem,
                { headers: this.headers() }
            );

            console.log('Created/updated inventory item:', product.sku);
            return { success: true };
        } catch (error: any) {
            const errorMsg = error.response?.data?.errors?.[0]?.message || error.message;
            console.error('Failed to create inventory item:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    // Create offer for inventory item
    async createOffer(
        sku: string,
        price: number,
        categoryId: string,
        marketplaceId: string = 'EBAY_US'
    ): Promise<{ success: boolean; offerId?: string; error?: string }> {
        try {
            const offer = {
                sku: sku,
                marketplaceId: marketplaceId,
                format: 'FIXED_PRICE',
                availableQuantity: 1,
                categoryId: categoryId,
                listingDescription: 'Listed via InventSync',
                listingPolicies: {
                    fulfillmentPolicyId: '', // Will be set from account
                    paymentPolicyId: '',
                    returnPolicyId: ''
                },
                merchantLocationKey: 'default-location',
                pricingSummary: {
                    price: {
                        value: price.toFixed(2),
                        currency: 'USD'
                    }
                }
            };

            // Get seller's business policies
            const policies = await this.getBusinessPolicies();
            if (policies.fulfillmentPolicyId) {
                offer.listingPolicies.fulfillmentPolicyId = policies.fulfillmentPolicyId;
                offer.listingPolicies.paymentPolicyId = policies.paymentPolicyId;
                offer.listingPolicies.returnPolicyId = policies.returnPolicyId;
            }

            const response = await axios.post(
                `${this.baseUrl}/sell/inventory/v1/offer`,
                offer,
                { headers: this.headers() }
            );

            console.log('Created offer:', response.data.offerId);
            return { success: true, offerId: response.data.offerId };
        } catch (error: any) {
            const errorMsg = error.response?.data?.errors?.[0]?.message || error.message;
            console.error('Failed to create offer:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    // Publish offer to make it live
    async publishOffer(offerId: string): Promise<{ success: boolean; listingId?: string; error?: string }> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
                {},
                { headers: this.headers() }
            );

            console.log('Published offer, listing ID:', response.data.listingId);
            return { success: true, listingId: response.data.listingId };
        } catch (error: any) {
            const errorMsg = error.response?.data?.errors?.[0]?.message || error.message;
            console.error('Failed to publish offer:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    // Get business policies (fulfillment, payment, return)
    async getBusinessPolicies(): Promise<{
        fulfillmentPolicyId: string;
        paymentPolicyId: string;
        returnPolicyId: string;
    }> {
        const result = {
            fulfillmentPolicyId: '',
            paymentPolicyId: '',
            returnPolicyId: ''
        };

        try {
            // Get fulfillment policies
            const fulfillmentResp = await axios.get(
                `${this.baseUrl}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`,
                { headers: this.headers() }
            );
            if (fulfillmentResp.data.fulfillmentPolicies?.length > 0) {
                result.fulfillmentPolicyId = fulfillmentResp.data.fulfillmentPolicies[0].fulfillmentPolicyId;
            }

            // Get payment policies
            const paymentResp = await axios.get(
                `${this.baseUrl}/sell/account/v1/payment_policy?marketplace_id=EBAY_US`,
                { headers: this.headers() }
            );
            if (paymentResp.data.paymentPolicies?.length > 0) {
                result.paymentPolicyId = paymentResp.data.paymentPolicies[0].paymentPolicyId;
            }

            // Get return policies
            const returnResp = await axios.get(
                `${this.baseUrl}/sell/account/v1/return_policy?marketplace_id=EBAY_US`,
                { headers: this.headers() }
            );
            if (returnResp.data.returnPolicies?.length > 0) {
                result.returnPolicyId = returnResp.data.returnPolicies[0].returnPolicyId;
            }
        } catch (error: any) {
            console.warn('Could not fetch business policies:', error.message);
        }

        return result;
    }

    // Full listing flow: create inventory item -> create offer -> publish
    async listProduct(product: EbayProduct, categoryId: string): Promise<EbayListingResult> {
        // Step 1: Ensure location exists
        const locationOk = await this.ensureInventoryLocation();
        if (!locationOk) {
            return { success: false, error: 'Failed to create inventory location' };
        }

        // Step 2: Create inventory item
        const inventoryResult = await this.createOrUpdateInventoryItem(product);
        if (!inventoryResult.success) {
            return { success: false, error: inventoryResult.error };
        }

        // Step 3: Create offer
        const offerResult = await this.createOffer(product.sku, product.price, categoryId);
        if (!offerResult.success) {
            return { success: false, error: offerResult.error };
        }

        // Step 4: Publish offer
        const publishResult = await this.publishOffer(offerResult.offerId!);
        if (!publishResult.success) {
            return { success: false, error: publishResult.error, offerId: offerResult.offerId };
        }

        const listingUrl = `https://www.ebay.com/itm/${publishResult.listingId}`;

        return {
            success: true,
            listingId: publishResult.listingId,
            offerId: offerResult.offerId,
            listingUrl
        };
    }

    // Verify token is valid
    async verifyToken(): Promise<boolean> {
        try {
            await axios.get(
                `${this.baseUrl}/sell/inventory/v1/inventory_item?limit=1`,
                { headers: this.headers() }
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapCondition(condition: string): string {
        const conditionMap: Record<string, string> = {
            'NEW': 'NEW',
            'LIKE_NEW': 'LIKE_NEW',
            'NEW_OTHER': 'NEW_OTHER',
            'NEW_WITH_DEFECTS': 'NEW_WITH_DEFECTS',
            'MANUFACTURER_REFURBISHED': 'MANUFACTURER_REFURBISHED',
            'CERTIFIED_REFURBISHED': 'CERTIFIED_REFURBISHED',
            'EXCELLENT_REFURBISHED': 'EXCELLENT_REFURBISHED',
            'VERY_GOOD_REFURBISHED': 'VERY_GOOD_REFURBISHED',
            'GOOD_REFURBISHED': 'GOOD_REFURBISHED',
            'SELLER_REFURBISHED': 'SELLER_REFURBISHED',
            'USED_EXCELLENT': 'USED_EXCELLENT',
            'USED_VERY_GOOD': 'USED_VERY_GOOD',
            'USED_GOOD': 'USED_GOOD',
            'USED_ACCEPTABLE': 'USED_ACCEPTABLE',
            'FOR_PARTS_OR_NOT_WORKING': 'FOR_PARTS_OR_NOT_WORKING'
        };
        return conditionMap[condition.toUpperCase()] || 'NEW';
    }
}
