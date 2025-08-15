-- Add unique constraints for idempotent seeding

-- Category should have unique name
ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);

-- Subcategory should have unique name per category
ALTER TABLE subcategories ADD CONSTRAINT subcategories_categoryId_name_key UNIQUE (categoryId, name);

-- Item should have unique name per subcategory
ALTER TABLE items ADD CONSTRAINT items_subcategoryId_name_key UNIQUE (subcategoryId, name);

-- ServiceCategory should have unique name and level combination
ALTER TABLE service_categories ADD CONSTRAINT service_categories_name_level_key UNIQUE (name, level);

-- FieldTemplate should have unique name
ALTER TABLE field_templates ADD CONSTRAINT field_templates_name_key UNIQUE (name);

-- SupportGroup should have unique name
ALTER TABLE support_groups ADD CONSTRAINT support_groups_name_key UNIQUE (name);

-- Note: Branch already has unique code
-- Note: User already has unique email