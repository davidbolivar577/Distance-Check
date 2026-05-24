import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import markersData from './data/markers.json';
import './App.css';

function MapInterface() {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);

  const [currentPolylines, setCurrentPolylines] = useState([]);

  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');

  const defaultCenter = { lat: 43.8178, lng: -111.7821 };

  const handleFindLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLoc);

          if (map) {
            map.panTo(newLoc);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please ensure permissions are granted.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };
  
  const calculateRoute = async (destination) => {
    if (!userLocation || !routesLibrary || !map) return;

    try {
      const request = {
        origin: userLocation,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: 'WALKING',
        fields: ['path', 'localizedValues', 'distanceMeters', 'durationMillis'],
      };

      const { routes } = await routesLibrary.Route.computeRoutes(request);

      if (routes && routes.length > 0) {
        const primaryRoute = routes[0];

        const rawMeters = primaryRoute.distanceMeters;
        const miles = (rawMeters * 0.000621371).toFixed(2);
        
        const durationText = primaryRoute.localizedValues?.duration?.text || `${Math.round(primaryRoute.durationMillis / 60000)} mins`;
        
        setDistanceInfo(`Walking: ${miles} mi (${durationText})`);

        const newPolylines = primaryRoute.createPolylines({
          strokeColor: '#3498db',
          strokeWeight: 6,
          strokeOpacity: 0.8,
        });

        newPolylines.forEach(polyline => polyline.setMap(map));
        setCurrentPolylines(newPolylines);
      }
    } catch (error) {
      console.error("Routes API Error:", error);
      setDistanceInfo("Route calculation failed.");
    }
  };

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
    setDistanceInfo(null);
    
    currentPolylines.forEach(polyline => polyline.setMap(null));
    setCurrentPolylines([]);
    
    if (userLocation) {
      calculateRoute(marker);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Distance Check</h1>
        <button onClick={handleFindLocation} className="location-btn">
          Find My Location
        </button>
      </header>

      <main className="map-container">
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={defaultCenter} 
          defaultZoom={15}              
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          mapId="DEMO_MAP_ID" 
        >
          {markersData.map((marker) => {
            if (marker.lat === 0 && marker.lng === 0) return null;

            return (
              <AdvancedMarker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => handleMarkerClick(marker)}
              />
            );
          })}

          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="user-dot" />
            </AdvancedMarker>
          )}

          {selectedMarker && (
            <InfoWindow
              position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
              onCloseClick={() => {
                setSelectedMarker(null);
                currentPolylines.forEach(polyline => polyline.setMap(null));
                setCurrentPolylines([]);
              }}
              headerContent={selectedMarker.name || `Marker ${selectedMarker.id}`}
            >
              <div className="info-window-content">
                <p>{selectedMarker.description || "No description provided."}</p>
                
                {distanceInfo ? (
                  <p className="distance-text">{distanceInfo}</p>
                ) : (
                  <p className="distance-prompt">
                    {userLocation ? "Calculating distance..." : "Find your location to see walking distance."}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </main>
    </div>
  );
}

function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <MapInterface />
    </APIProvider>
  );
}

export default App;