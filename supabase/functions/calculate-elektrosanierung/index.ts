import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  global_parameters: {
    baujahr: number;
    qualitaetsstufe: string;
  };
  selected_package_ids: number[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { global_parameters, selected_package_ids }: RequestBody = await req.json()

    console.log('Processing calculation request:', {
      global_parameters,
      selected_package_ids
    })

    // Fetch package items for selected packages
    const { data: packageItems, error: packageItemsError } = await supabaseClient
      .from('offers_package_items')
      .select(`
        *,
        offers_products!inner(*)
      `)
      .in('package_id', selected_package_ids)

    if (packageItemsError) {
      throw packageItemsError
    }

    console.log('Package items:', packageItems)

    // Calculate total costs based on package items and products
    let totalMaterialCosts = 0
    let totalLaborHours = 0

    for (const item of packageItems || []) {
      const product = item.offers_products
      const baseQuantity = item.quantity_base || 0
      
      // For now, use base quantity (room/floor calculations would need additional parameters)
      const quantity = baseQuantity
      
      if (product) {
        // Calculate material costs
        totalMaterialCosts += (product.unit_price || 0) * quantity
        
        // Calculate labor hours
        totalLaborHours += (
          (product.stunden_monteur || 0) + 
          (product.stunden_geselle || 0) + 
          (product.stunden_meister || 0)
        ) * quantity
      }
    }

    // Apply quality level multiplier
    const qualityMultiplier = global_parameters.qualitaetsstufe === 'Premium' ? 1.3 : 1.0
    totalMaterialCosts *= qualityMultiplier

    // Calculate labor costs (example: 65 EUR per hour)
    const hourlyRate = 65
    const totalLaborCosts = totalLaborHours * hourlyRate

    // Calculate travel costs (example: 5% of total)
    const travelCosts = (totalMaterialCosts + totalLaborCosts) * 0.05

    const subtotal = totalMaterialCosts + totalLaborCosts + travelCosts
    const total = subtotal // No subsidy applied for now

    const pricing = {
      materialCosts: Math.round(totalMaterialCosts * 100) / 100,
      laborCosts: Math.round(totalLaborCosts * 100) / 100,
      travelCosts: Math.round(travelCosts * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      subsidy: 0,
      total: Math.round(total * 100) / 100
    }

    console.log('Calculated pricing:', pricing)

    return new Response(
      JSON.stringify({ pricing }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error calculating elektrosanierung:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})