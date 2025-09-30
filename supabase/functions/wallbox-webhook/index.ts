import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// New type definitions for dynamic calculation
interface OfferRequest {
  global_params: {
    baujahr: number;
    qualitaetsstufe: 'Basic' | 'Standard' | 'Premium';
  };
  selected_packages: {
    instanceId: string;
    package_id: number;
    name: string;
    parameters: Record<string, any>; // e.g., { raumgroesse: 25 }
  }[];
}

interface PackageItemRule {
  package_id: number;
  produkt_gruppe_id: string;
  quantity_base: number;
  multipliers: Record<string, number> | null; // e.g., { raumgroesse: 0.3 }
}

interface Product {
  product_id: string;
  name: string;
  produkt_gruppe: string;
  qualitaetsstufe: string;
  unit_price: number;
  unit: string;
  stunden_monteur: number;
  stunden_geselle: number;
  stunden_meister: number;
}

interface CalculatedProduct {
  product_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  labor_hours: {
    monteur: number;
    geselle: number;
    meister: number;
  };
}

// Legacy types for backward compatibility
interface CustomerData {
  name: string;
  email: string;
  plz: string;
  adresse: string;
}

interface PricingData {
  materialCosts: number;
  laborCosts: number;
  travelCosts: number;
  subtotal: number;
  subsidy: number;
  total: number;
}

interface CartItem {
  id: string;
  productType: 'wallbox' | 'solar' | 'heating' | 'other';
  name: string;
  configuration: any;
  pricing: PricingData;
  createdAt: string;
}

interface WebhookPayload {
  customerData: CustomerData;
  items: CartItem[];
  totalPrice: number;
  subtotalPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalItems: number;
  generatedAt: string;
}

// Universal calculation engine
async function calculateOffer(
  offerRequest: OfferRequest,
  supabase: any
): Promise<CalculatedProduct[]> {
  console.log('Starting universal calculation engine...');
  console.log('Global params:', offerRequest.global_params);
  console.log('Selected packages:', offerRequest.selected_packages.length);

  // Step A: Fetch all necessary data
  const packageIds = offerRequest.selected_packages.map(p => p.package_id);
  
  // Fetch package item rules
  const { data: packageItemRules, error: rulesError } = await supabase
    .from('offers_package_items')
    .select('*')
    .in('package_id', packageIds);

  if (rulesError) {
    console.error('Error fetching package item rules:', rulesError);
    throw new Error(`Failed to fetch package rules: ${rulesError.message}`);
  }

  console.log('Fetched package item rules:', packageItemRules.length);

  // Fetch all products
  const { data: allProducts, error: productsError } = await supabase
    .from('offers_products')
    .select('*');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    throw new Error(`Failed to fetch products: ${productsError.message}`);
  }

  console.log('Fetched products:', allProducts.length);

  // Step B: Initialize offer map
  const offerMap = new Map<string, CalculatedProduct>();

  // Step C: Iterate through each selected package and calculate
  for (const selectedPackage of offerRequest.selected_packages) {
    console.log(`Processing package: ${selectedPackage.name} (ID: ${selectedPackage.package_id})`);
    console.log('Package parameters:', selectedPackage.parameters);

    // Find all rules for this package
    const rulesForPackage = packageItemRules.filter(
      (rule: PackageItemRule) => rule.package_id === selectedPackage.package_id
    );

    console.log(`Found ${rulesForPackage.length} rules for package ${selectedPackage.package_id}`);

    for (const rule of rulesForPackage) {
      // Calculate total quantity using the universal algorithm
      let totalQuantity = rule.quantity_base;

      console.log(`Rule for product group ${rule.produkt_gruppe_id}:`);
      console.log(`  Base quantity: ${totalQuantity}`);

      // Apply multipliers dynamically
      if (rule.multipliers && typeof rule.multipliers === 'object') {
        console.log('  Applying multipliers:', rule.multipliers);
        
        for (const [paramKey, multiplier] of Object.entries(rule.multipliers)) {
          // Check if this parameter exists in the selected package's parameters
          const paramValue = selectedPackage.parameters[paramKey];
          
          if (paramValue !== undefined && paramValue !== null) {
            const additionalQuantity = multiplier * paramValue;
            totalQuantity += additionalQuantity;
            console.log(`    ${paramKey}: ${paramValue} * ${multiplier} = +${additionalQuantity}`);
          } else {
            console.log(`    ${paramKey}: not provided in package parameters`);
          }
        }
      } else {
        console.log('  No multipliers defined for this rule');
      }

      console.log(`  Final quantity: ${totalQuantity}`);

      // Find the matching product based on produkt_gruppe and qualitaetsstufe
      const matchingProduct = allProducts.find(
        (p: Product) =>
          p.produkt_gruppe === rule.produkt_gruppe_id &&
          p.qualitaetsstufe === offerRequest.global_params.qualitaetsstufe
      );

      if (!matchingProduct) {
        console.warn(
          `No product found for group ${rule.produkt_gruppe_id} with quality ${offerRequest.global_params.qualitaetsstufe}`
        );
        continue;
      }

      console.log(`  Matched product: ${matchingProduct.name} (${matchingProduct.product_id})`);

      // Add or update product in offer map
      const existingProduct = offerMap.get(matchingProduct.product_id);

      if (existingProduct) {
        // Product already exists, add to quantity
        existingProduct.quantity += totalQuantity;
        existingProduct.total_price = existingProduct.quantity * existingProduct.unit_price;
        existingProduct.labor_hours.monteur += totalQuantity * matchingProduct.stunden_monteur;
        existingProduct.labor_hours.geselle += totalQuantity * matchingProduct.stunden_geselle;
        existingProduct.labor_hours.meister += totalQuantity * matchingProduct.stunden_meister;
        console.log(`  Updated existing product. New quantity: ${existingProduct.quantity}`);
      } else {
        // New product, add to map
        offerMap.set(matchingProduct.product_id, {
          product_id: matchingProduct.product_id,
          name: matchingProduct.name,
          quantity: totalQuantity,
          unit: matchingProduct.unit,
          unit_price: matchingProduct.unit_price,
          total_price: totalQuantity * matchingProduct.unit_price,
          labor_hours: {
            monteur: totalQuantity * matchingProduct.stunden_monteur,
            geselle: totalQuantity * matchingProduct.stunden_geselle,
            meister: totalQuantity * matchingProduct.stunden_meister,
          },
        });
        console.log(`  Added new product to offer`);
      }
    }
  }

  // Step D: Convert map to array and return
  const finalProducts = Array.from(offerMap.values());
  console.log('Calculation complete. Total unique products:', finalProducts.length);
  
  return finalProducts;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received:', req.method);
    
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are supported');
    }

    const requestBody = await req.json();
    console.log('Request body received');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a new offer request or legacy webhook
    if (requestBody.global_params && requestBody.selected_packages) {
      // New offer calculation request
      console.log('Processing as offer calculation request');
      const offerRequest = requestBody as OfferRequest;

      const calculatedProducts = await calculateOffer(offerRequest, supabase);

      // Calculate totals
      const materialTotal = calculatedProducts.reduce((sum, p) => sum + p.total_price, 0);
      const totalLaborHours = calculatedProducts.reduce(
        (sum, p) => ({
          monteur: sum.monteur + p.labor_hours.monteur,
          geselle: sum.geselle + p.labor_hours.geselle,
          meister: sum.meister + p.labor_hours.meister,
        }),
        { monteur: 0, geselle: 0, meister: 0 }
      );

      const response = {
        success: true,
        message: 'Offer calculated successfully',
        offerId: `OFFER-${Date.now()}`,
        calculatedAt: new Date().toISOString(),
        global_params: offerRequest.global_params,
        products: calculatedProducts,
        totals: {
          material_cost: materialTotal,
          labor_hours: totalLaborHours,
          total_products: calculatedProducts.length,
        },
      };

      console.log('Offer calculation complete:', {
        products: calculatedProducts.length,
        materialTotal,
        totalLaborHours,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } else {
      // Legacy webhook processing
      console.log('Processing as legacy webhook');
      const webhookData = requestBody as WebhookPayload;

      console.log('Processing webhook data:', {
        customerEmail: webhookData.customerData?.email,
        itemCount: webhookData.items?.length,
        totalPrice: webhookData.totalPrice,
      });

      const structuredData = {
        customer: {
          name: webhookData.customerData.name,
          email: webhookData.customerData.email,
          address: {
            plz: webhookData.customerData.plz,
            street: webhookData.customerData.adresse,
          },
        },
        order: {
          orderId: `ORDER-${Date.now()}`,
          generatedAt: webhookData.generatedAt,
          totalItems: webhookData.totalItems,
          pricing: {
            subtotal: webhookData.subtotalPrice || webhookData.totalPrice,
            discountPercent: webhookData.discountPercent || 0,
            discountAmount: webhookData.discountAmount || 0,
            finalTotal: webhookData.totalPrice,
          },
        },
        items: webhookData.items.map((item, index) => ({
          itemNumber: index + 1,
          id: item.id,
          productType: item.productType,
          name: item.name,
          createdAt: item.createdAt,
          pricing: {
            materialCosts: item.pricing.materialCosts || 0,
            laborCosts: item.pricing.laborCosts || 0,
            travelCosts: item.pricing.travelCosts || 0,
            subsidy: item.pricing.subsidy || 0,
            total: item.pricing.total || 0,
          },
          configuration: item.configuration,
        })),
        metadata: {
          processedAt: new Date().toISOString(),
          source: 'wallbox-configurator',
          version: '1.0',
          requestMethod: req.method,
        },
      };

      const response = {
        success: true,
        message: 'Webhook processed successfully',
        orderId: structuredData.order.orderId,
        pdfUrl: `https://example.com/pdf/${structuredData.order.orderId}.pdf`,
        data: structuredData,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
