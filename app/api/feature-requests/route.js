import { NextResponse } from 'next/server';
// Revert to using the standard client with ANON KEY
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../utils/env';
// Remove auth helpers imports
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';

// Use the client initialized with the anon key
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

export async function POST(request) {
  // const cookieStore = cookies();
  // const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Remove session check
    // const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    // if (sessionError || !session) {
    //   console.warn('Feature Request POST: No active session found.');
    //   return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    // }

    // Remove image_url from destructuring
    const { description, author, link_url } = await request.json();

    if (!description || !author) {
      return NextResponse.json({ error: 'Description and Author are required' }, { status: 400 });
    }

    // Prepare data for insertion, removing image_url
    const insertData = {
      description: description,
      author: author,
    };
    // if (image_url) insertData.image_url = image_url; // Removed image_url logic
    if (link_url) insertData.link_url = link_url;

    // Insert using the anon client
    const { data, error } = await supabase
      .from('feature_requests')
      .insert([insertData]) // Use the prepared data object
      .select()
      .single();

    if (error) {
      console.error('Error inserting feature request (Supabase):', error);
      // Provide a more generic error if RLS might be the cause (before policy update)
      return NextResponse.json({ error: 'Failed to add feature request. Check permissions or RLS.', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Feature request added successfully',
      request: data
    });

  } catch (error) {
    console.error('Error in feature requests API route (POST):', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request) {
  // const cookieStore = cookies();
  // const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Fetch using the anon client
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feature requests (Supabase):', error);
      return NextResponse.json({ error: 'Failed to fetch feature requests. Check permissions or RLS.', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Error fetching feature requests (GET):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 