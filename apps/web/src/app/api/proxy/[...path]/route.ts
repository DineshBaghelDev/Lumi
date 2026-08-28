import { type NextRequest, NextResponse } from "next/server.js";
import { forwardedAuthHeaders } from "../../../../lib/forward-auth.ts";

const getApiBaseUrl = () => {
  const value = process.env.INTERNAL_API_BASE_URL;
  if (!value) throw new Error("Missing INTERNAL_API_BASE_URL");
  return value;
};

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

export const buildApiUrl = (path: string) => {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    throw new Error("Invalid proxy path");
  }

  const segments = decodedPath.split("/");
  if (
    !decodedPath ||
    decodedPath.includes("\\") ||
    decodedPath.includes(":") ||
    decodedPath.startsWith("//") ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Invalid proxy path");
  }

  const base = new URL(getApiBaseUrl());
  const url = new URL(`/${path.replace(/^\/+/, "")}`, base);
  if (url.origin !== base.origin) throw new Error("Invalid proxy origin");
  return url;
};

export const readBoundedText = async (response: Response, maxBytes = MAX_RESPONSE_BYTES) => {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new Error("API response too large");

  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) throw new Error("API response too large");
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
};

async function proxyRequest(request: NextRequest, path: string) {
  const apiUrl = buildApiUrl(path);
  const headers = forwardedAuthHeaders(request.headers.get("authorization"), request.cookies);

  // Forward content-type and other relevant headers
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);

  try {
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const body = hasBody ? await request.text() : null;

    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const apiResponse = await fetch(apiUrl, {
      method: request.method,
      headers,
      body,
      // Don't follow redirects for streaming
      redirect: "manual",
      signal,
    });

    // Check if this is a streaming response (SSE)
    const contentType = apiResponse.headers.get("content-type") ?? "";
    const declaredLength = Number(apiResponse.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      return NextResponse.json({ error: "API response too large" }, { status: 502 });
    }

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
    const responseBody = await readBoundedText(apiResponse);
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
