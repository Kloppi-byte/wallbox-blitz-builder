-- Add missing qualitaetsfaktor parameter definition
INSERT INTO offers_package_parameter_definitions (
  param_key,
  label,
  param_type,
  is_global,
  default_value
) VALUES (
  'qualitaetsfaktor',
  'Qualitätsstufe',
  'select',
  true,
  'Standard'
)
ON CONFLICT (param_key) DO NOTHING;