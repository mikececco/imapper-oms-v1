-- This script creates a function in Supabase to execute SQL statements
-- Run this script in the Supabase SQL Editor before running the migration

-- Create a function to execute arbitrary SQL
-- Note: This requires admin privileges (service role key)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Create a table to execute SQL via a query if the RPC method doesn't work
CREATE TABLE IF NOT EXISTS _exec_sql (
  id SERIAL PRIMARY KEY,
  query TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to execute the SQL when inserted into the table
CREATE OR REPLACE FUNCTION trigger_exec_sql()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE NEW.query;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS exec_sql_trigger ON _exec_sql;
CREATE TRIGGER exec_sql_trigger
BEFORE INSERT ON _exec_sql
FOR EACH ROW
EXECUTE FUNCTION trigger_exec_sql(); 