import { useEffect, useState } from "react";
import * as Location from "expo-location";

type Coords = {
  latitude: number;
  longitude: number;
};

type UseLocationResult = {
  coords: Coords | null;
  permissionGranted: boolean;
  loading: boolean;
};

export function useLocation(): UseLocationResult {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchLocation = async () => {
      setLoading(true);
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!mounted) {
        return;
      }

      const granted = permission.status === "granted";
      setPermissionGranted(granted);

      if (!granted) {
        setLoading(false);
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({});
        if (!mounted) {
          return;
        }
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchLocation();

    return () => {
      mounted = false;
    };
  }, []);

  return { coords, permissionGranted, loading };
}

