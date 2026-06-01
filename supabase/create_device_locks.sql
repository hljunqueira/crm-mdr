-- MDR Celulares - Device Locks Migration SQL (Supabase/PostgreSQL)
-- This migration creates the device_locks table to track iCloud manual locks (iOS) and Headwind MDM automatic locks (Android).

CREATE TABLE IF NOT EXISTS device_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    lock_type TEXT NOT NULL CHECK (lock_type IN ('icloud', 'headwind')),
    
    -- iCloud fields (iOS)
    icloud_email TEXT,
    icloud_locked BOOLEAN DEFAULT FALSE,
    icloud_lock_confirmed_by UUID REFERENCES profiles(id),
    icloud_lock_confirmed_at TIMESTAMPTZ,
    
    -- MDM fields (Android)
    mdm_device_id TEXT,
    mdm_locked BOOLEAN DEFAULT FALSE,
    mdm_kiosk_message TEXT,
    mdm_last_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_device_locks_device ON device_locks(device_id);
CREATE INDEX IF NOT EXISTS idx_device_locks_sale ON device_locks(sale_id);

-- Register Trigger for updated_at column to auto-update modification time
CREATE TRIGGER update_device_locks_modtime 
BEFORE UPDATE ON device_locks 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();
