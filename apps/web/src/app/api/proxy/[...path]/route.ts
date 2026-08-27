import { DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const getApiBaseUrl = () => {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  return value;
};

async function proxyRequest(request: NextRequest, path: string) {
  const token = (await cookies()).get(DEFAULT_ACCESS_TOKEN_COOKIE)?.value;
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);

  // Forward content-type and other relevant headers
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);

  try {
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const body = hasBody ? await request.text() : null;

    const apiResponse = await fetch(new URL(path, getApiBaseUrl()), {
      method: request.method,
      headers,
      body,
      // Don't follow redirects for streaming
      redirect: "manual",
    });

    // Check if this is a streaming response (SSE)
    const contentType = apiResponse.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      // Stream the response directly
      const readable = apiResponse.body;
      if (!readable) {
        return new NextResponse("No response body", { status: 500 });
      }
      return new NextResponse(readable, {
        status: apiResponse.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Regular JSON response
    const responseBody = await apiResponse.text();
    return new NextResponse(responseBody, {
      status: apiResponse.status,
      headers: {
        "Content-Type": apiResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "API unavailable" }, { status: 503 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path.join("/"));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path.join("/"));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path.join("/"));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path.join("/"));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path.join("/"));
}
