-- Remove the legacy class/class_member tables introduced by 20260813120000_add_classes.
-- The app has since switched to the organization plugin (see 20260813130000_add_organization_plugin).
-- IF EXISTS keeps this migration safe on databases that never created the class tables.
DROP TABLE IF EXISTS "class_member";
DROP TABLE IF EXISTS "class";
