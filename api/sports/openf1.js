const BASE_URL = "https://api.openf1.org/v1";
const ALLOWED_PATHS = new Set([
  "meetings",
  "sessions",
  "drivers",
  "position",
  "intervals",
  "car_data",
  "stints",
  "race_control",
]);

function normalizePath(value) {
  const raw = Array.isArray(value) ? value.join("/") : value || "";
  return String(raw).replace(/^\/+/, "").trim();
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

  if (!ALLOWED_PATHS.has(pathname)) {
    res.status(400).json({ error: "Unsupported OpenF1 resource" });
    return;
  }

  try {
    const response = await fetch(buildForwardUrl(pathname, req.query), {
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(response.status).send(text);
  } catch (error) {
    res.status(502).json({
      error: "OpenF1 proxy failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
