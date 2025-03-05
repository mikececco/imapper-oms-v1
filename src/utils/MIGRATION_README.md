# Database Migration Guide

This guide explains how to run database migrations on your Supabase database.

## Prerequisites

1. You need your Supabase URL and Service Role Key
   - Go to your Supabase dashboard: https://app.supabase.com/
   - Select your project
   - Go to Project Settings > API
   - Copy the URL and Service Role Key (not the anon key)

2. Update your `.env.development` file with these values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Option 1: Using the Migration Script

1. First, set up the required SQL functions in Supabase:
   - Go to the SQL Editor in your Supabase dashboard
   - Open the file `src/utils/setup_supabase_functions.sql`
   - Copy and paste the contents into the SQL Editor
   - Run the SQL

2. Run the migration script:
   ```bash
   node src/utils/run_migration.js
   ```

## Option 2: Using the Supabase Dashboard

1. Go to the SQL Editor in your Supabase dashboard
2. Open the file `src/utils/database_migration.sql`
3. Copy and paste the contents into the SQL Editor
4. Run the SQL

## Verifying the Migration

After running the migration, you can verify that it was successful by:

1. Going to the Table Editor in your Supabase dashboard
2. Checking that the new columns have been added to the `orders` table
3. Checking that the `subscriptions` table has been created

## Troubleshooting

If you encounter any errors:

1. Check that you're using the Service Role Key, not the anon key
2. Make sure you have the correct permissions in Supabase
3. Try running the SQL statements one by one in the SQL Editor
4. Check the Supabase logs for any error messages 