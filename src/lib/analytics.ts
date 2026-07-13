// Google Analytics (GA4) Tracking Utility

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;

// Define gtag helper globally on window immediately when the module loads
if (typeof window !== "undefined" && GA_TRACKING_ID) {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }
}

/**
 * Dynamically initializes Google Analytics (gtag.js) if a measurement ID is configured.
 * Does nothing if VITE_GA_TRACKING_ID is unset.
 */
export const initGA = (): void => {
  if (!GA_TRACKING_ID) {
    if (import.meta.env.DEV) {
      console.warn("Google Analytics: VITE_GA_TRACKING_ID is not configured. Events will log to console.");
    }
    return;
  }

  // Prevent multiple initializations
  if (document.getElementById("google-tag-manager")) return;

  try {
    const scriptUrl = document.createElement("script");
    scriptUrl.async = true;
    scriptUrl.id = "google-tag-manager";
    scriptUrl.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    document.head.appendChild(scriptUrl);

    if (window.gtag) {
      window.gtag("js", new Date());
      window.gtag("config", GA_TRACKING_ID, {
        send_page_view: false // Managed manually via page_view event on router changes
      });
    }
  } catch (error) {
    console.error("Google Analytics failed to initialize script: ", error);
  }
};

/**
 * Tracks a page view event.
 * @param pagePath - The URL path of the page (e.g. /plan)
 */
export const trackPageView = (pagePath: string): void => {
  if (typeof window !== "undefined" && window.gtag && GA_TRACKING_ID) {
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title
    });
  }
};

/**
 * Tracks a custom event in Google Analytics.
 * In development mode, logs events to console if GA is not loaded.
 * 
 * @param action - The action/event name (e.g. 'toggle_theme')
 * @param category - The categorization of the event (e.g. 'settings')
 * @param label - Optional details about the event (e.g. 'dark')
 * @param value - Optional numeric value associated with the event
 */
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
): void => {
  if (typeof window !== "undefined" && window.gtag && GA_TRACKING_ID) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  } else if (import.meta.env.DEV) {
    console.log(`[Analytics Event] Action: "${action}" | Category: "${category}" | Label: "${label ?? 'none'}" | Value: ${value ?? 'none'}`);
  }
};
