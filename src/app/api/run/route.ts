import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, language, version, stdin = '' } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    if (!language) {
      return NextResponse.json({ error: 'Language is required' }, { status: 400 });
    }

    // Call Piston API to execute the code
    const apiUrl = process.env.RUNLINK;
    const response = await axios.post(
      apiUrl!,
      {
        language,
        version,
        files: [{ name: 'main', content: code }],
        stdin,
        args: [],
        compile_timeout: 10000, // 10 seconds
        run_timeout: 5000, // 5 seconds
      },
      {
        timeout: 15000, // Overall request timeout
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const result = response.data;

    // Check for compilation errors
    if (result.compile && result.compile.code !== 0) {
      return NextResponse.json({
        output: `Compilation Error:\n${result.compile.output}`,
        error: true,
        compilationError: true
      });
    }

    // Check for runtime errors
    if (result.run.code !== 0) {
      return NextResponse.json({
        output: `Runtime Error (code ${result.run.code}):\n${result.run.output}`,
        error: true,
        runtimeError: true
      });
    }

    // Success case
    return NextResponse.json({
      output: result.run.output,
      error: false,
      executionTime: result.run.time
    });
  } catch (error: any) {
    console.error('API execution error:', error);
    
    // Handle axios errors
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      return NextResponse.json(
        { error: `Server Error: ${error.response.status}`, details: error.response.data },
        { status: error.response.status }
      );
    } else if (error.request) {
      // The request was made but no response was received
      return NextResponse.json(
        { error: 'No response from execution server. It might be offline or overloaded.' },
        { status: 503 }
      );
    } else if (error.code === 'ECONNABORTED') {
      // Timeout occurred
      return NextResponse.json(
        { error: 'Code execution timed out. Your code might have an infinite loop or is too complex.' },
        { status: 408 }
      );
    } else {
      // Something else happened
      return NextResponse.json(
        { error: `Error: ${error.message}` },
        { status: 500 }
      );
    }
  }
}