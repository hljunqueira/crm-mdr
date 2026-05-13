/**
 * Legacy Storage Module
 * This file is now deprecated as the application has migrated to Supabase.
 * Local JSON storage (db.json) is no longer used for data persistence.
 */

export const getDb = () => {
  console.warn("getDb() is deprecated. Use Supabase client instead.");
  return {};
};

export const saveDb = () => {
  console.warn("saveDb() is deprecated. Use Supabase client instead.");
};
