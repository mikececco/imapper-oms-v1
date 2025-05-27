import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // TODO: Adjust the table and column names if they differ after schema migration.
    // Assuming a 'self_service_return_token' column in the 'orders' table.
    const { data: order, error } = await supabase
      .from('orders')
      .select('*') // Select all order details for now, refine later if needed
      .eq('self_service_return_token', token)
      .maybeSingle(); // Use maybeSingle() as token should be unique

    if (error) {
      console.error('Error validating token:', error);
      return NextResponse.json({ error: 'Database error while validating token.' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 404 });
    }

    // TODO: Add logic to check if the order is actually eligible for return
    // e.g., based on status, date, etc.
    // For now, we just return the order if the token is valid.

    return NextResponse.json({ order }, { status: 200 });

  } catch (error) {
    console.error('Catch-all error validating token:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 