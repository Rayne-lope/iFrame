const BASE_URL = "https://streamed.su/api";

function classifyProxyError(error) {
  const detail =
    error instanceof Error ? error.message : "Unknown streamed proxy error";
  const normalized = detail.toLowerCase();

  if (
    normalized.includes("forbidden by its access permissions") ||
    normalized.includes("rpz") ||
    normalized.includes("biznet") ||
    normalized.includes("blocked")
  ) {
    return {
      status: 451,
      providerStatus: "blocked",
      message:
        "Stream provider appears blocked on this network. Data surfaces can still work, but live video is unavailable.",
      detail,
    };
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout") ||
    normalized.includes("abort")
  ) {
    return {
      status: 504,
      providerStatus: "timeout",
      message:
        "Stream provider timed out or is unreachable from this network.",
      detail,
    };
  }

  return {
    status: 502,
    providerStatus: "unavailable",
    message: "Stream provider is currently unavailable.",
    detail,
  };
}

function normalizePath(value) {
  const raw = Array.isArray(value) ? value.join("/") : value || "";
  return String(raw).replace(/^\/+/, "").trim();
}

function isAllowed(pathname) {
  return (
    pathname === "matches/all" ||
    pathname === "matches/f1" ||
    pathname === "matches/football" ||
    pathname === "matches/basketball" ||
    pathname === "matches/mma" ||
    /^stream\/source\/[^/]+$/.test(pathname)
  );
}

function buildForwardUrl(pathname, query) {
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (key === "path" || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, String(entry)));
      return;
    }

    search.append(key, String(value));
  });

  return `${BASE_URL}/${pathname}${search.size ? `?${search.toString()}` : ""}`;
}

export default async function handler(req, res) {
  const pathname = normalizePath(req.query.path);

  if (!isAllowed(pathname)) {
    res.status(400).json({ error: "Unsupported Streamed resource" });
    return;
  }

  try {
    const response = await fetch(buildForwardUrl(pathname, req.query), {
      headers: {
        Accept: "application/json",
        "User-Agent": "iFrame Sports Proxy",
      },
    });

    const text = await response.text();
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    res.status(response.status).send(text);
  } catch (error) {
    const classification = classifyProxyError(error);
    res.status(classification.status).json({
      error: "Streamed proxy failed",
      providerStatus: classification.providerStatus,
      message: classification.message,
      detail: classification.detail,
    });
  }
}
