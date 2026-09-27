import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const donorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ngoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * MapView Component - Display donations, NGOs, and routes
 * 
 * @param {Array} points - Array of {lat, lng, label, type} objects
 * @param {Object} route - Optional route geometry {coordinates: [[lng, lat], ...]}
 * @param {Number} zoom - Initial zoom level (default: 12)
 * @param {String} height - Map height (default: '400px')
 */
export default function MapView({ points = [], route = null, zoom = 12, height = '400px' }) {
  // Default center - Anna Nagar, Chennai (NOT Delhi!)
  const defaultCenter = [13.0850, 80.2101];
  
  // Calculate center from points or use Chennai default
  const center = points.length > 0 
    ? [points[0].lat, points[0].lng] 
    : defaultCenter;

  // Convert route geometry to Leaflet format if provided
  const routeCoordinates = route?.coordinates 
    ? route.coordinates.map(coord => [coord[1], coord[0]]) // [lng, lat] → [lat, lng]
    : [];

  // Get icon based on marker type
  const getMarkerIcon = (type) => {
    switch (type) {
      case 'donor': return donorIcon;
      case 'ngo': return ngoIcon;
      case 'volunteer': return volunteerIcon;
      default: return undefined; // Use default Leaflet icon
    }
  };

  if (points.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center" style={{ height }}>
        <p className="text-gray-500">No locations to display</p>
      </div>
    );
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height, width: '100%', borderRadius: '8px' }}
    >
      {/* OpenStreetMap tiles (FREE) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Markers */}
      {points.map((point, index) => (
        <Marker 
          key={index} 
          position={[point.lat, point.lng]}
          icon={getMarkerIcon(point.type)}
        >
          <Popup>
            <div className="text-sm">
              <strong>{point.label}</strong>
              {point.address && <p className="text-gray-600 mt-1">{point.address}</p>}
              {point.info && <p className="text-blue-600 mt-1">{point.info}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route line */}
      {routeCoordinates.length > 0 && (
        <Polyline 
          positions={routeCoordinates} 
          color="blue" 
          weight={4} 
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
}
