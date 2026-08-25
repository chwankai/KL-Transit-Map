// Client-Side Offline Simulation Engine

const SIMULATED_OFFLINE_KEY = "dev_simulated_offline";

let originalFetch: typeof window.fetch | null = null;
let isInitialized = false;

export const isSimulatedOffline = (): boolean => {
  try {
    return sessionStorage.getItem(SIMULATED_OFFLINE_KEY) === "true";
  } catch {
    return false;
  }
};

const applyFetchInterceptor = () => {
  if (typeof window === "undefined" || !window.fetch) return;

  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isSimulatedOffline()) {
      return originalFetch!(input, init);
    }

    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // 1. Allow local dev server scripts & HMR to keep the UI running
    const isDevScript =
      urlStr.includes("/@vite/") ||
      urlStr.includes("/@fs/") ||
      urlStr.includes("/src/") ||
      urlStr.includes("node_modules") ||
      urlStr.includes("vite/dist");

    if (isDevScript) {
      return originalFetch!(input, init);
    }

    // 2. Check offline Cache Storage for cached response
    if ("caches" in window) {
      try {
        const fullUrl = new URL(urlStr, window.location.origin).href;
        const cached =
          (await caches.match(input)) ||
          (await caches.match(urlStr)) ||
          (await caches.match(fullUrl));

        if (cached) {
          return cached;
        }

        // If local static transit data wasn't in cache yet, fetch and prime the cache
        const isLocalStaticData =
          urlStr.endsWith(".json") ||
          urlStr.endsWith(".png") ||
          urlStr.endsWith(".svg") ||
          urlStr.endsWith(".html") ||
          urlStr === "/";

        if (isLocalStaticData && navigator.onLine) {
          const networkResp = await originalFetch!(input, init);
          if (networkResp.ok) {
            const cache = await caches.open("kv-transit-cache-v1");
            cache.put(fullUrl, networkResp.clone()).catch(() => {});
            return networkResp;
          }
        }
      } catch {
        // Fallback to offline failure simulation
      }
    }

    // 3. Simulate real network disconnection error for external or uncached requests
    throw new TypeError(`Failed to fetch: Offline mode active (Network disconnected for ${urlStr})`);
  };
};

const removeFetchInterceptor = () => {
  if (originalFetch && typeof window !== "undefined") {
    window.fetch = originalFetch;
  }
};

export const setSimulatedOffline = (enabled: boolean): void => {
  try {
    sessionStorage.setItem(SIMULATED_OFFLINE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage quota error
  }

  if (enabled) {
    applyFetchInterceptor();
    window.dispatchEvent(new Event("offline"));
  } else {
    removeFetchInterceptor();
    if (navigator.onLine) {
      window.dispatchEvent(new Event("online"));
    }
  }

  window.dispatchEvent(new CustomEvent("simulated_offline_change", { detail: { enabled } }));
};

export const toggleSimulatedOffline = (): boolean => {
  const next = !isSimulatedOffline();
  setSimulatedOffline(next);
  return next;
};

export const initOfflineSimulator = (): void => {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  if (isSimulatedOffline()) {
    applyFetchInterceptor();
    setTimeout(() => {
      window.dispatchEvent(new Event("offline"));
    }, 100);
  }
};
