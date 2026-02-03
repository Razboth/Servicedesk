'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface CurrentAlarm {
  id: string;
  alarmType: string;
}

interface NetworkEndpoint {
  id: string;
  type: 'BRANCH' | 'ATM';
  name: string;
  code: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  alarmStatus?: string;
  currentAlarms?: CurrentAlarm[];
}

interface NetworkMapProps {
  endpoints: NetworkEndpoint[];
  center: { lat: number; lng: number };
  onEndpointClick: (endpoint: NetworkEndpoint) => void;
  height?: string;
  zoom?: number;
}

const getConnectionStatusColor = (status: string) => {
  switch (status) {
    case 'ONLINE': return 'bg-green-100 text-green-700 border-green-200';
    case 'OFFLINE': return 'bg-red-100 text-red-700 border-red-200';
    case 'SLOW': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function NetworkMap({ endpoints, center, onEndpointClick, height = '600px', zoom = 7 }: NetworkMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height, width: '100%' }}
    >
      <TileLayer url="/api/tiles/{z}/{x}/{y}.png" />
      {endpoints.map((ep) => {
        if (!ep.latitude || !ep.longitude) return null;
        return (
          <Marker
            key={ep.id}
            position={[ep.latitude, ep.longitude]}
            eventHandlers={{
              click: () => onEndpointClick(ep),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  {ep.type === 'BRANCH' ? (
                    <Building2 className="h-4 w-4 text-blue-600" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-purple-600" />
                  )}
                  <span className="font-semibold">{ep.name}</span>
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-gray-500">{ep.code}</p>
                  {ep.location && <p className="text-gray-500">{ep.location}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getConnectionStatusColor(ep.status)}>
                      {ep.status}
                    </Badge>
                    {ep.alarmStatus === 'ALARM' && (
                      <Badge className="bg-red-100 text-red-700">ALARM</Badge>
                    )}
                  </div>
                  {ep.currentAlarms && ep.currentAlarms.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium">Active Alarms:</p>
                      {ep.currentAlarms.slice(0, 2).map((alarm) => (
                        <p key={alarm.id} className="text-xs text-red-600">
                          {alarm.alarmType}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
