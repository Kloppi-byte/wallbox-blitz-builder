import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received:', req.method);
    
    let webhookData: WebhookPayload;

    if (req.method === 'POST') {
      // Handle POST request with JSON body
      webhookData = await req.json();
    } else if (req.method === 'GET') {
      // Handle legacy GET request with query parameters
      const url = new URL(req.url);
      const customerData = JSON.parse(url.searchParams.get('customerData') || '{}');
      const items = JSON.parse(url.searchParams.get('items') || '[]');
      const totalPrice = parseFloat(url.searchParams.get('totalPrice') || '0');
      const totalItems = parseInt(url.searchParams.get('totalItems') || '0');
      const generatedAt = url.searchParams.get('generatedAt') || new Date().toISOString();

      webhookData = {
        customerData,
        items,
        totalPrice,
        subtotalPrice: totalPrice, // For backward compatibility
        discountPercent: 0,
        discountAmount: 0,
        totalItems,
        generatedAt,
      };
    } else {
      throw new Error('Method not allowed');
    }

    console.log('Processing webhook data:', {
      customerEmail: webhookData.customerData.email,
      itemCount: webhookData.items.length,
      totalPrice: webhookData.totalPrice,
    });

    // Structure the data for processing
    const structuredData = {
      // Customer Information
      customer: {
        name: webhookData.customerData.name,
        email: webhookData.customerData.email,
        address: {
          plz: webhookData.customerData.plz,
          street: webhookData.customerData.adresse,
        },
      },
      
      // Order Summary
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

      // Detailed Items
      items: webhookData.items.map((item, index) => ({
        itemNumber: index + 1,
        id: item.id,
        productType: item.productType,
        name: item.name,
        createdAt: item.createdAt,
        
        // Pricing breakdown
        pricing: {
          materialCosts: item.pricing.materialCosts || 0,
          laborCosts: item.pricing.laborCosts || 0,
          travelCosts: item.pricing.travelCosts || 0,
          subsidy: item.pricing.subsidy || 0,
          total: item.pricing.total || 0,
        },

        // Configuration details
        configuration: {
          ...item.configuration,
          // Extract specific product details based on type
          ...(item.productType === 'wallbox' && item.configuration.wallbox ? {
            wallboxDetails: {
              model: item.configuration.wallbox.name,
              artikelnummer: item.configuration.wallbox.artikelnummer,
              basePrice: item.configuration.wallbox.price,
              cableLength: item.configuration.kabel_laenge_m,
              wiring: item.configuration.leitung,
              protection: item.configuration.absicherung,
              workHours: item.configuration.arbeitsstunden,
              travelZone: item.configuration.anfahrt_zone,
            }
          } : {}),
          
          ...(item.productType === 'other' && item.configuration.schrank ? {
            zählerschrankDetails: {
              model: item.configuration.schrank.name,
              artikelnummer: item.configuration.schrank.artikelnummer,
              basePrice: item.configuration.schrank.price,
              zaehlerplaetze: item.configuration.zaehlerplaetze,
              reiheneinbaugeraete: item.configuration.reiheneinbaugeraete,
              leitungsanpassungen: item.configuration.leitungsanpassungen_m,
              travelZone: item.configuration.anfahrt_zone,
            }
          } : {}),
        },
      })),

      // Processing metadata
      metadata: {
        processedAt: new Date().toISOString(),
        source: 'wallbox-configurator',
        version: '1.0',
        requestMethod: req.method,
      },
    };

    console.log('Structured data created:', JSON.stringify(structuredData, null, 2));

    // For now, return a success response with PDF URL
    // In a real implementation, you might:
    // 1. Save to database
    // 2. Generate PDF
    // 3. Send confirmation email
    // 4. Integrate with external systems

    const response = {
      success: true,
      message: 'Webhook processed successfully',
      orderId: structuredData.order.orderId,
      pdfUrl: `https://example.com/pdf/${structuredData.order.orderId}.pdf`, // Mock PDF URL
      data: structuredData,
    };

    console.log('Webhook response:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

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