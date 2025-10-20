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

    // Fetch rates for the specified location (robust: handle missing/unknown loc_id)
    let rates: any = null;
    let ratesError: any = null;

    if (loc_id) {
      const { data, error } = await supabaseClient
        .from('offers_rates')
        .select('*')
        .eq('loc_id', loc_id)
        .maybeSingle();
      rates = data;
      ratesError = error;
    } else {
      const { data, error } = await supabaseClient
        .from('offers_rates')
        .select('*')
        .limit(1)
        .maybeSingle();
      rates = data;
      ratesError = error;
    }

    if (ratesError || !rates) {
      throw new Error(`Failed to fetch rates: ${ratesError?.message || 'No rates configured'}`)
    }

    console.log('Fetched rates:', rates)

    // Fetch package items for selected packages (include product_selector field)
    const { data: packageItems, error: packageItemsError } = await supabaseClient
      .from('offers_package_items')
      .select('package_id, produkt_gruppe_id, quantity_base, multipliers_material, multipliers_hours, product_selector')
      .in('package_id', selected_package_ids)

    if (packageItemsError) {
      throw packageItemsError
    }

    console.log('Package items:', packageItems)

    // Identify which items are "schutzorgane" (protection devices)
    const schutzorganeGroups = ['GRP-MCB-B16', 'GRP-MCB-B10', 'GRP-MCB-B16-3P', 'GRP-RCD-40A', 'GRP-LTS-35A'];

    // Topological sort to handle dependencies between items
    function topologicalSort(items: Array<any>): Array<any> {
      const graph = new Map<string, Set<string>>();
      const inDegree = new Map<string, number>();
      
      // Initialize graph
      for (const item of items) {
        graph.set(item.produkt_gruppe_id, new Set());
        inDegree.set(item.produkt_gruppe_id, 0);
      }
      
      // Build dependency graph from multipliers_material
      // If item A references item B, then B -> A (B must be processed before A)
      for (const item of items) {
        const multipliers = item.multipliers_material || [];
        for (const mult of multipliers) {
          if (mult.type === 'group_ref') {
            // item depends on mult.group_id, so mult.group_id -> item
            // Add edge from dependency TO dependent
            const depItem = items.find(i => i.produkt_gruppe_id === mult.group_id);
            if (depItem) {
              graph.get(mult.group_id)?.add(item.produkt_gruppe_id);
              inDegree.set(item.produkt_gruppe_id, (inDegree.get(item.produkt_gruppe_id) || 0) + 1);
            }
          }
        }
      }
      
      // Kahn's algorithm
      const queue = items.filter(item => inDegree.get(item.produkt_gruppe_id) === 0);
      const sorted = [];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(current);
        
        const neighbors = graph.get(current.produkt_gruppe_id) || new Set();
        for (const neighbor of neighbors) {
          inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
          if (inDegree.get(neighbor) === 0) {
            const neighborItem = items.find(i => i.produkt_gruppe_id === neighbor);
            if (neighborItem) queue.push(neighborItem);
          }
        }
      }
      
      if (sorted.length !== items.length) {
        throw new Error('Circular dependency detected in package item multipliers');
      }
      
      return sorted;
    }

    // Evaluate multipliers for a single item
    function evaluateMultipliers(
      item: any,
      resolvedQuantities: Map<string, number>,
      params: Record<string, any>
    ): number {
      let quantity = item.quantity_base || 0;
      
      const multipliers = item.multipliers_material || [];
      
      for (const mult of multipliers) {
        if (mult.type === 'group_ref') {
          const refQty = resolvedQuantities.get(mult.group_id) || 0;
          const value = mult.op === 'ceil' 
            ? Math.ceil(refQty * mult.factor)
            : mult.op === 'floor'
            ? Math.floor(refQty * mult.factor)
            : refQty * mult.factor;
          quantity += value;
        } else if (mult.type === 'param_ref') {
          const paramValue = params[mult.param_key] || 0;
          const value = mult.op === 'ceil'
            ? Math.ceil(paramValue * mult.factor)
            : mult.op === 'floor'
            ? Math.floor(paramValue * mult.factor)
            : paramValue * mult.factor;
          quantity += value;
        }
      }
      
      return quantity;
    }

    // Sort items topologically to handle dependencies
    const sortedItems = topologicalSort(packageItems || []);
    
    // Resolve quantities iteratively
    const resolvedQuantities = new Map<string, number>();
    
    for (const item of sortedItems) {
      const quantity = evaluateMultipliers(item, resolvedQuantities, global_parameters);
      resolvedQuantities.set(item.produkt_gruppe_id, quantity);
    }

    console.log('Resolved quantities:', Object.fromEntries(resolvedQuantities));

    // Build final cart from resolved quantities (exclude zero quantities)
    // Apply product selector logic if configured
    const finalCart: Array<{ produkt_gruppe_id: string; quantity: number; selected_product_id?: string }> = [];
    
    for (const [produkt_gruppe_id, quantity] of resolvedQuantities.entries()) {
      if (quantity > 0) {
        const item = sortedItems.find(pi => pi.produkt_gruppe_id === produkt_gruppe_id);
        let selected_product_id: string | undefined;
        
        // Check if this item has product selector rules
        if (item?.product_selector?.type === 'product_selector') {
          const rules = item.product_selector.rules || [];
          // Find the first rule where quantity is within the max threshold
          for (const rule of rules) {
            if (!rule.max || quantity <= rule.max) {
              selected_product_id = rule.product_id;
              break;
            }
          }
          // Fallback to last rule if no match found
          if (!selected_product_id && rules.length > 0) {
            selected_product_id = rules[rules.length - 1].product_id;
          }
        }
        
        // If product_selector is used to pick size, quantity should always be 1 (we only pick the right model)
        const finalQuantity = item?.product_selector?.type === 'product_selector' ? 1 : quantity;
        
        finalCart.push({ produkt_gruppe_id, quantity: finalQuantity, selected_product_id });
      }
    }

    console.log('Final cart:', finalCart)

    // Fetch product details for all items in final cart
    const productGroupIds = finalCart.map(item => item.produkt_gruppe_id)
    const selectedProductIds = finalCart.filter(item => item.selected_product_id).map(item => item.selected_product_id!)
    
    // Build query to fetch both group-based and specific selected products
    let query = supabaseClient
      .from('offers_products')
      .select('*')
      
    if (selectedProductIds.length > 0) {
      query = query.or(`produkt_gruppe.in.(${productGroupIds.join(',')}),product_id.in.(${selectedProductIds.join(',')})`)
    } else {
      query = query.in('produkt_gruppe', productGroupIds)
    }
    
    const { data: products, error: productsError } = await query

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
      // If a specific product was selected, use only that; otherwise use first from group
      const product = item.selected_product_id
        ? products?.find(p => p.product_id === item.selected_product_id)
        : products?.find(p => p.produkt_gruppe === item.produkt_gruppe_id)
      
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

    // Separate schutzorgane from final cart for response
    const schutzorgane = finalCart
      .filter(item => schutzorganeGroups.includes(item.produkt_gruppe_id))
      .map(item => ({
        produkt_gruppe_id: item.produkt_gruppe_id,
        quantity: item.quantity
      }));

    console.log('Calculated pricing:', pricing)
    console.log('Protection devices (Schutzorgane):', schutzorgane)

    return new Response(
      JSON.stringify({ 
        pricing,
        schutzorgane,
        finalCart
      }),
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