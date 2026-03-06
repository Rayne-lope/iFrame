const BASE_URL = "https://api.jolpi.ca/ergast/f1";
const ALLOWED_PREFIXES = [
  /^drivers\/[^/]+\.json$/,
  /^\d{4}\/driverStandings\.json$/,
  /^\d{4}\/constructorStandings\.json$/,
  /^\d{4}\/results\.json$/,
  /^\d{4}\/qualifying\.json$/,
  /^\d{4}\/\d+\/results\.json$/,
];

function normalizePath(value) {
  const raw = Array.isArray(value) ? value.join("/") : value || "";
  return String(raw).replace(/^\/+/, "").trim();
}

function isAllowed(pathname) {
  return ALLOWED_PREFIXES.some((pattern) => pattern.test(pathname));
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
    res.status(400).json({ error: "Unsupported Ergast resource" });
    return;
  }

  try {
    const response = await fetch(buildForwardUrl(pathname, req.query), {
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.status(response.status).send(text);
  } catch (error) {
    res.status(502).json({
      error: "Ergast proxy failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
