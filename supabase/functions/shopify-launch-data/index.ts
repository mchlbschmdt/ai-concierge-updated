import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, productId, startDate, endDate } = await req.json();
    
    const shopifyUrl = Deno.env.get('SHOPIFY_STORE_URL') || 'your-store.myshopify.com';
    const accessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error('Shopify access token not configured');
    }

    let data;

    switch (action) {
      case 'getOrders':
        // Fetch orders for a specific product or date range
        const ordersUrl = `https://${shopifyUrl}/admin/api/2024-01/orders.json?status=any${startDate ? `&created_at_min=${startDate}` : ''}${endDate ? `&created_at_max=${endDate}` : ''}`;
        const ordersResponse = await fetch(ordersUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
        data = await ordersResponse.json();
        break;

      case 'getProducts':
        // Fetch product details
        const productsUrl = `https://${shopifyUrl}/admin/api/2024-01/products.json${productId ? `/${productId}` : ''}`;
        const productsResponse = await fetch(productsUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
        data = await productsResponse.json();
        break;

      case 'getInventory':
        // Fetch inventory levels
        const inventoryUrl = `https://${shopifyUrl}/admin/api/2024-01/inventory_levels.json`;
        const inventoryResponse = await fetch(inventoryUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
        data = await inventoryResponse.json();
        break;

      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});