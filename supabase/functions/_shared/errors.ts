// Standardized error handling for Edge Functions

const corsHeaders = (req?: Request | null): Record<string, string> => {
  const ALLOWED_ORIGINS = [
    "https://ai-vc-sourcing.vercel.app",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
  ];
  const origin = req?.headers?.get?.("origin") ?? "";
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
};

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "APIError";
  }
}

interface ErrorResponse {
  error: string;
  code?: string;
  context?: Record<string, any>;
  timestamp: string;
}

export function errorResponse(
  error: APIError | Error,
  req?: Request | null
): Response {
  const timestamp = new Date().toISOString();

  if (error instanceof APIError) {
    const body: ErrorResponse = {
      error: error.message,
      code: error.code,
      context: error.context,
      timestamp,
    };

    console.error(`[${error.status}] ${error.code}: ${error.message}`, error.context);

    return new Response(JSON.stringify(body), {
      status: error.status,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
      },
    });
  }

  // Generic error
  const body: ErrorResponse = {
    error: error.message || "Internal server error",
    timestamp,
  };

  console.error("[500] Unhandled error:", error);

  return new Response(JSON.stringify(body), {
    status: 500,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

export function successResponse<T>(
  data: T,
  req?: Request | null,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

export function handleCORS(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }
  return null;
}

// Common error factory functions
export const Errors = {
  unauthorized: (context?: any) =>
    new APIError(401, "Unauthorized", "UNAUTHORIZED", context),

  forbidden: (context?: any) =>
    new APIError(403, "Forbidden", "FORBIDDEN", context),

  notFound: (resource: string, context?: any) =>
    new APIError(404, `${resource} not found`, "NOT_FOUND", context),

  badRequest: (message: string, context?: any) =>
    new APIError(400, message, "BAD_REQUEST", context),

  unprocessable: (message: string, context?: any) =>
    new APIError(422, message, "UNPROCESSABLE_ENTITY", context),

  rateLimit: (context?: any) =>
    new APIError(429, "Rate limit exceeded", "RATE_LIMIT", context),

  internal: (message: string, context?: any) =>
    new APIError(500, message, "INTERNAL_ERROR", context),

  external: (service: string, context?: any) =>
    new APIError(502, `${service} service error`, "SERVICE_ERROR", context),
};
