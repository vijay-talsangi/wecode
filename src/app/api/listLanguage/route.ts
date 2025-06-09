import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const apiUrl = process.env.LISTLANGUAGELINK;
    const res = await axios.get(apiUrl!);
    const result = res.data;
    return NextResponse.json(result); 
  } catch (error: any) {
    console.error('API execution error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runtimes' },
      { status: 500 }
    );
  }
}
