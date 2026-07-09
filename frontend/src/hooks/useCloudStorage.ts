import { useState, useEffect, useRef, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export function useCloudStorage<T>(appId: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // 1. Initialize state from localStorage for zero-latency load
  const [data, setData] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(appId);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage for ${appId}`, error);
      return initialValue;
    }
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // 2. Fetch the latest from Cloud (Neon DB) on mount
  useEffect(() => {
    mounted.current = true;
    const loadFromCloud = async () => {
      try {
        const res = await fetch(`${API}/api/storage/${appId}`, { credentials: "include" });
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData && cloudData.data && mounted.current) {
            const parsed = JSON.parse(cloudData.data);
            setData(parsed);
            window.localStorage.setItem(appId, JSON.stringify(parsed));
          }
        }
      } catch (err) {
        console.warn(`Error fetching cloud data for ${appId}`, err);
      }
    };
    loadFromCloud();

    return () => {
      mounted.current = false;
    };
  }, [appId]);

  // 3. Setter function that updates LocalStorage instantly and Cloud in the background
  const setStoredData = useCallback((value: T | ((val: T) => T)) => {
    setData((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      
      // Save to local storage instantly
      try {
        window.localStorage.setItem(appId, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage for ${appId}`, error);
      }

      // Debounce the API call to avoid spamming the DB on fast typing/dragging
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch(`${API}/api/storage/${appId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: "include",
            body: JSON.stringify({ data: JSON.stringify(valueToStore) }),
          });
        } catch (error) {
          console.error(`Error saving cloud data for ${appId}`, error);
        }
      }, 1000); // 1 second debounce

      return valueToStore;
    });
  }, [appId]);

  return [data, setStoredData];
}
