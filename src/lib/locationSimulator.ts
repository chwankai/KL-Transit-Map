/**
 * Location Simulator Engine for Debugging & Mock GPS
 * Intercepts navigator.geolocation (getCurrentPosition & watchPosition)
 * to simulate user coordinates anywhere in Klang Valley.
 */

const STORAGE_KEYS = {
  ENABLED: "dev_mock_location_enabled",
  LAT: "dev_mock_lat",
  LNG: "dev_mock_lng",
  NAME: "dev_mock_location_name",
  ACCURACY: "dev_mock_accuracy",
};

// Default location: KL Sentral
export const DEFAULT_MOCK_LOCATION = {
  lat: 3.1342,
  lng: 101.6861,
  name: "KL Sentral",
  accuracy: 15,
};

export interface MockLocationData {
  enabled: boolean;
  lat: number;
  lng: number;
  name: string;
  accuracy: number;
}

export const isMockLocationActive = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.ENABLED) === "true";
};

export const getMockLocation = (): MockLocationData => {
  if (typeof window === "undefined") {
    return { enabled: false, ...DEFAULT_MOCK_LOCATION };
  }
  const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED) === "true";
  const latStr = localStorage.getItem(STORAGE_KEYS.LAT);
  const lngStr = localStorage.getItem(STORAGE_KEYS.LNG);
  const name = localStorage.getItem(STORAGE_KEYS.NAME) || DEFAULT_MOCK_LOCATION.name;
  const accStr = localStorage.getItem(STORAGE_KEYS.ACCURACY);

  const lat = latStr ? parseFloat(latStr) : DEFAULT_MOCK_LOCATION.lat;
  const lng = lngStr ? parseFloat(lngStr) : DEFAULT_MOCK_LOCATION.lng;
  const accuracy = accStr ? parseFloat(accStr) : DEFAULT_MOCK_LOCATION.accuracy;

  return { enabled, lat, lng, name, accuracy };
};

const activeWatchCallbacks = new Map<number, PositionCallback>();
let nextWatchId = 1000;

const createMockGeolocationPosition = (lat: number, lng: number, accuracy: number): GeolocationPosition => {
  const coords = {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    }),
  } as GeolocationCoordinates;

  return {
    coords,
    timestamp: Date.now(),
    toJSON: () => ({
      coords,
      timestamp: Date.now(),
    }),
  } as GeolocationPosition;
};

const notifyWatchers = () => {
  const current = getMockLocation();
  if (!current.enabled) return;

  const pos = createMockGeolocationPosition(current.lat, current.lng, current.accuracy);
  activeWatchCallbacks.forEach((cb) => {
    try {
      cb(pos);
    } catch (e) {
      console.error("Error invoking mock geolocation watcher:", e);
    }
  });
};

export const setMockLocationActive = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ENABLED, enabled ? "true" : "false");
  const data = getMockLocation();
  window.dispatchEvent(new CustomEvent("mock_location_changed", { detail: data }));
  if (enabled) {
    notifyWatchers();
  }
};

export const toggleMockLocation = (): boolean => {
  const current = isMockLocationActive();
  const next = !current;
  setMockLocationActive(next);
  return next;
};

export const setMockLocation = (lat: number, lng: number, name?: string, accuracy?: number): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.LAT, lat.toString());
  localStorage.setItem(STORAGE_KEYS.LNG, lng.toString());
  if (name) {
    localStorage.setItem(STORAGE_KEYS.NAME, name);
  }
  if (accuracy !== undefined) {
    localStorage.setItem(STORAGE_KEYS.ACCURACY, accuracy.toString());
  }

  const data = getMockLocation();
  window.dispatchEvent(new CustomEvent("mock_location_changed", { detail: data }));
  if (data.enabled) {
    notifyWatchers();
  }
};

let isInitialized = false;

export const initLocationSimulator = (): void => {
  if (typeof window === "undefined" || isInitialized) return;
  if (!navigator.geolocation) return;

  const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
  const originalClearWatch = navigator.geolocation.clearWatch.bind(navigator.geolocation);

  // Override getCurrentPosition
  navigator.geolocation.getCurrentPosition = (
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback | null,
    options?: PositionOptions
  ) => {
    if (isMockLocationActive()) {
      const { lat, lng, accuracy } = getMockLocation();
      const pos = createMockGeolocationPosition(lat, lng, accuracy);
      setTimeout(() => {
        successCallback(pos);
      }, 30);
      return;
    }
    return originalGetCurrentPosition(successCallback, errorCallback, options);
  };

  // Override watchPosition
  navigator.geolocation.watchPosition = (
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback | null,
    options?: PositionOptions
  ): number => {
    if (isMockLocationActive()) {
      const id = ++nextWatchId;
      activeWatchCallbacks.set(id, successCallback);
      const { lat, lng, accuracy } = getMockLocation();
      const pos = createMockGeolocationPosition(lat, lng, accuracy);
      setTimeout(() => {
        if (activeWatchCallbacks.has(id)) {
          successCallback(pos);
        }
      }, 30);
      return id;
    }
    return originalWatchPosition(successCallback, errorCallback, options);
  };

  // Override clearWatch
  navigator.geolocation.clearWatch = (watchId: number): void => {
    if (activeWatchCallbacks.has(watchId)) {
      activeWatchCallbacks.delete(watchId);
      return;
    }
    return originalClearWatch(watchId);
  };

  isInitialized = true;
};
