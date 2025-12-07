import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: Check if table exists
    const { data, error, count } = await supabase
      .from('shopify_sessions')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Supabase table error',
        details: error.message,
        hint: error.hint,
        code: error.code,
        message: 'Did you run the SQL to create the shopify_sessions table?'
      }, { status: 500 });
    }

    // Test 2: Try to list sessions
    const { data: sessions, error: listError } = await supabase
      .from('shopify_sessions')
      .select('*')
      .limit(5);

    if (listError) {
      return NextResponse.json({
        success: false,
        error: 'Cannot read sessions',
        details: listError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '✅ Supabase connection working!',
      tableExists: true,
      sessionCount: count || 0,
      recentSessions: sessions?.map(s => ({
        shop: s.shop,
        created_at: s.created_at,
        hasToken: !!s.access_token
      })) || [],
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    });

  } catch (error: any) {
    console.error('❌ Exception:', error);
    return NextResponse.json({
      success: false,
      error: 'Exception occurred',
      details: error.message,
    }, { status: 500 });
  }
}

