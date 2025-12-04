import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop', shop)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expenses: expenses || [],
    });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, location_name, amount, description, expense_date, expense_type, category } = body;

    if (!shop || !location_name || !amount || !description || !expense_date || !expense_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          shop,
          location_name,
          amount: parseFloat(amount),
          description,
          expense_date,
          expense_type,
          category: category || 'general',
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expense: data[0],
    });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing expense ID' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted',
    });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

