-- SQL script to view the database schema in Supabase
-- Run this in the Supabase SQL Editor

-- Create a function to execute SQL queries and return results
CREATE OR REPLACE FUNCTION exec_sql_select(sql text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$;

-- Create a function to get table columns
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.column_name::text, 
    c.data_type::text, 
    c.is_nullable::text
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public' 
    AND c.table_name = table_name
  ORDER BY 
    c.ordinal_position;
END;
$$;

-- List all tables in the public schema
SELECT 
  'Tables in public schema:' as info;

SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
ORDER BY 
  table_name;

-- List all columns in the orders table (if it exists)
SELECT 
  'Columns in orders table:' as info;

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY 
  ordinal_position;

-- List all columns in the subscriptions table (if it exists)
SELECT 
  'Columns in subscriptions table:' as info;

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'subscriptions'
ORDER BY 
  ordinal_position;

-- List all indexes
SELECT 
  'Indexes in the database:' as info;

SELECT
  tablename,
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  schemaname = 'public'
ORDER BY
  tablename,
  indexname; 