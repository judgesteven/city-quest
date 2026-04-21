import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Region } from "react-native-maps";
import { POIMarker } from "./POIMarker";
import type { POI } from "../data/pois";

const HELSINKI_REGION: Region = {
  latitude: 60.1699,
  longitude: 24.9384,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

type CityMapProps = {
  pois: POI[];
  onSelectPoi: (poi: POI) => void;
  coords: { latitude: number; longitude: number } | null;
  permissionGranted: boolean;
};

export function CityMap({ pois, onSelectPoi, coords, permissionGranted }: CityMapProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!coords || !permissionGranted) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      650
    );
  }, [coords, permissionGranted]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={HELSINKI_REGION}
      showsUserLocation
      showsMyLocationButton
    >
      {pois.map((poi) => (
        <POIMarker key={poi.id} poi={poi} onPress={onSelectPoi} />
      ))}
    </MapView>
  );
}

