-- Step 1: Fix tags for KVT products so they pass location filter
UPDATE offers_products
SET tags = '["Eco-Heat","Kliebisch Elektro","Römhild Elektro"]'::jsonb
WHERE produkt_gruppe = 'GRP-UV-KVT';

-- Step 2: Update product_selector rules to use correct product_ids
UPDATE offers_package_items
SET product_selector = '{
  "type": "product_selector",
  "based_on": "calculated_quantity",
  "rules": [
    {"max": 12, "product_id": "UV-KVT-VU12NC"},
    {"max": 24, "product_id": "UV-KVT-VU24NC"},
    {"max": 36, "product_id": "UV-KVT-VU36NC"},
    {"max": 48, "product_id": "UV-KVT-VU48NC"},
    {"product_id": "UV-KVT-VU60NC"}
  ]
}'::jsonb
WHERE package_id = 11 AND produkt_gruppe_id = 'GRP-UV-KVT';