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
  loc_id?: string;
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

    const { global_parameters, selected_package_ids, loc_id }: RequestBody = await req.json()

    console.log('Processing calculation request:', {
      global_parameters,
      selected_package_ids,
      loc_id
    })

    // Fetch rates for the specified location
    const { data: rates, error: ratesError } = await supabaseClient
      .from('offers_rates')
      .select('*')
      .eq('loc_id', loc_id || '1')
      .single()

    if (ratesError) {
      throw new Error(`Failed to fetch rates: ${ratesError.message}`)
    }

    console.log('Fetched rates:', rates)

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

    // Build initial cart from package items
    const initialCart: Array<{ produkt_gruppe_id: string, quantity: number }> = []
    
    for (const item of packageItems || []) {
      const product = item.offers_products
      const baseQuantity = item.quantity_base || 0
      const quantity = baseQuantity
      
      if (product && quantity > 0) {
        initialCart.push({
          produkt_gruppe_id: item.produkt_gruppe_id,
          quantity: quantity
        })
      }
    }

    console.log('Initial cart:', initialCart)

    // Calculate distribution components based on configured items
    function calculateDistribution(cart: Array<{ produkt_gruppe_id: string, quantity: number }>) {
      // Count consumers
      let socketCount = 0
      let lightCount = 0
      let stoveCount = 0

      for (const item of cart) {
        if (item.produkt_gruppe_id === 'GRP-SOC-SKT') {
          socketCount += item.quantity // Single sockets count as 1
        } else if (item.produkt_gruppe_id === 'GRP-SOC-DBL') {
          socketCount += item.quantity * 2 // Double sockets count as 2
        } else if (item.produkt_gruppe_id === 'GRP-SWI-AUS') {
          lightCount += item.quantity
        } else if (item.produkt_gruppe_id === 'GRP-SOC-HERD') {
          stoveCount += item.quantity
        }
      }

      console.log('Consumer counts:', { socketCount, lightCount, stoveCount })

      // Apply technical rules
      const components: Array<{ produkt_gruppe_id: string, quantity: number }> = []

      // LS switches for sockets (1-pole 16A per 8 sockets)
      const lsSockets = Math.ceil(socketCount / 8)
      if (lsSockets > 0) {
        components.push({ produkt_gruppe_id: 'GRP-MCB-B16', quantity: lsSockets })
      }

      // LS switches for lights (1-pole 10A per 10 lights)
      const lsLights = Math.ceil(lightCount / 10)
      if (lsLights > 0) {
        components.push({ produkt_gruppe_id: 'GRP-MCB-B10', quantity: lsLights })
      }

      // LS switches for stoves (3-pole 16A per stove)
      if (stoveCount > 0) {
        components.push({ produkt_gruppe_id: 'GRP-MCB-B16-3P', quantity: stoveCount })
      }

      // Total LS switches
      const totalLs = lsSockets + lsLights + stoveCount

      // FI switches (RCD 40A per 6 LS switches)
      const fiSwitches = Math.ceil(totalLs / 6)
      if (fiSwitches > 0) {
        components.push({ produkt_gruppe_id: 'GRP-RCD-40A', quantity: fiSwitches })
      }

      // Load disconnect switch (1x if any LS switches)
      if (totalLs > 0) {
        components.push({ produkt_gruppe_id: 'GRP-LTS-35A', quantity: 1 })
      }

      console.log('Calculated distribution components:', components)
      return components
    }

    // Calculate distribution components
    const distributionComponents = calculateDistribution(initialCart)

    // Merge distribution components with initial cart
    const finalCart = [...initialCart]
    for (const comp of distributionComponents) {
      const existing = finalCart.find(item => item.produkt_gruppe_id === comp.produkt_gruppe_id)
      if (existing) {
        existing.quantity += comp.quantity
      } else {
        finalCart.push(comp)
      }
    }

    console.log('Final cart:', finalCart)

    // Fetch product details for all items in final cart
    const productIds = finalCart.map(item => item.produkt_gruppe_id)
    const { data: products, error: productsError } = await supabaseClient
      .from('offers_products')
      .select('*')
      .in('produkt_gruppe', productIds)

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    console.log('Fetched products:', products)

    // Calculate total costs based on final cart
    let totalMaterialCosts = 0
    let monteurHours = 0
    let geselleHours = 0
    let meisterHours = 0

    for (const item of finalCart) {
      const product = products?.find(p => p.produkt_gruppe === item.produkt_gruppe_id)
      
      if (product) {
        // Calculate material costs with markup from rates
        const finalUnitPrice = (product.unit_price || 0) * rates.aufschlag_prozent
        totalMaterialCosts += finalUnitPrice * item.quantity
        
        // Calculate labor hours by type
        monteurHours += (product.stunden_monteur || 0) * item.quantity
        geselleHours += (product.stunden_geselle || 0) * item.quantity
        meisterHours += (product.stunden_meister || 0) * item.quantity
      }
    }

    // Calculate labor costs using rates from offers_rates
    const totalLaborCosts = 
      (monteurHours * rates.stundensatz_monteur) +
      (geselleHours * rates.stundensatz_geselle) +
      (meisterHours * rates.stundensatz_meister)

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