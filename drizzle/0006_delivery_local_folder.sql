-- Postgres requires ALTER TYPE ... ADD VALUE outside of a transaction.
-- drizzle-kit migrate already wraps individual statements appropriately;
-- if you're running this manually, execute it on its own.
ALTER TYPE "delivery_type" ADD VALUE IF NOT EXISTS 'local_folder';
