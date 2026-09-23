import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet marker asset paths if needed
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Authentic OpenStreetMap Tile Layers — 100% Free, No API Key Required
const MAP_TILES = {
  standard: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    name: '🗺️ OpenStreetMap',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  humanitarian: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, Tiles &copy; HOT',
    name: '🌐 Humanitarian OSM',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
};

export default function MapView({ transactions = [], highlightedId, onMarkerClick }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('standard');

  // Filter transactions with valid coordinates
  const validTxns = useMemo(() => {
    return transactions.filter(t =>
      t.lat != null && t.lng != null &&
      !isNaN(t.lat) && !isNaN(t.lng) &&
      Math.abs(t.lat) <= 90 && Math.abs(t.lng) <= 180
    );
  }, [transactions]);

  const invalidCoordsCount = transactions.length - validTxns.length;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629], // Geographic center of India
        zoom: 5,
        minZoom: 3,
        maxZoom: 19,
        zoomControl: false, // We supply custom styled controls
        scrollWheelZoom: true,
      });

      const currentTile = MAP_TILES[mapStyle] || MAP_TILES.standard;
      const tileLayer = L.tileLayer(currentTile.url, {
        attribution: currentTile.attribution,
        subdomains: currentTile.subdomains || ['a', 'b', 'c'],
        maxZoom: currentTile.maxZoom || 19,
        crossOrigin: true,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      tileLayerRef.current = tileLayer;
      markersGroupRef.current = markersGroup;

      // Force layout invalidation once painted so tiles fill edge-to-edge
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      // Auto-fit initial bounds if markers are present
      if (validTxns.length > 0) {
        const bounds = L.latLngBounds(validTxns.slice(0, 100).map(t => [t.lat, t.lng]));
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
      }
    } catch (err) {
      console.error('Error initializing MapView:', err);
    }

    // Resize observer to ensure full map responsiveness without grey edges
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer on Style Change
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const nextTile = MAP_TILES[mapStyle] || MAP_TILES.standard;
    tileLayerRef.current.setUrl(nextTile.url);
  }, [mapStyle]);

  // Render Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    // Add valid markers (up to 250 for smooth 60fps rendering)
    const displayed = validTxns.slice(0, 250);

    displayed.forEach(txn => {
      const isHighlighted = txn.id === highlightedId;
      const isCritical = txn.riskLevel === 'Critical';
      const isHigh = txn.riskLevel === 'High';
      const isMedium = txn.riskLevel === 'Medium';

      const color = (isCritical || isHigh) ? '#EF4444' : isMedium ? '#F59E0B' : '#22C55E';
      const fillColor = (isCritical || isHigh) ? '#DC2626' : isMedium ? '#D97706' : '#16A34A';

      const radius = isHighlighted ? 10 : isCritical ? 7 : 5.5;

      const marker = L.circleMarker([txn.lat, txn.lng], {
        radius,
        fillColor,
        color: isHighlighted ? '#FFFFFF' : color,
        weight: isHighlighted ? 3 : 1.5,
        fillOpacity: isHighlighted ? 1 : 0.75,
      });

      // Custom styled popup
      const riskBadgeColor = isCritical ? '#DC2626' : isHigh ? '#EF4444' : isMedium ? '#F59E0B' : '#22C55E';
      const popupContent = `
        <div style="font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; line-height: 1.4; color: #1E293B; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            <strong style="font-family: monospace; font-size: 13px; color: #0F172A;">${txn.id}</strong>
            <span style="background: ${riskBadgeColor}15; color: ${riskBadgeColor}; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${riskBadgeColor}40;">
              ${txn.riskLevel || 'Low'} Risk (${txn.riskScore || 0}/100)
            </span>
          </div>
          <div style="margin-bottom: 3px; font-weight: 600; color: #334155;">
            ${txn.senderName || 'Member'} → ${txn.receiverName || 'Counterparty'}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748B;">Amount:</span>
            <strong style="color: #0F172A;">${txn.amountFormatted || ('₹' + (txn.amount || 0).toLocaleString('en-IN'))}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748B;">Origin:</span>
            <span style="color: #334155;">${txn.location || txn.city || 'India'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748B;">Channel:</span>
            <span style="color: #334155;">${txn.type || 'Transfer'}</span>
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #E2E8F0; font-size: 11px; text-align: center; color: #4A7BF7; font-weight: 600; cursor: pointer;">
            Click marker to inspect full record ➔
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'fraudx-map-popup',
      });

      marker.on('click', () => {
        if (onMarkerClick) {
          onMarkerClick(txn.id);
        }
      });

      marker.addTo(markersGroupRef.current);
    });
  }, [validTxns, highlightedId, onMarkerClick]);

  // Synchronize map center when highlightedId changes
  useEffect(() => {
    if (!mapInstanceRef.current || !highlightedId) return;
    const targetTxn = validTxns.find(t => t.id === highlightedId);
    if (targetTxn && targetTxn.lat != null && targetTxn.lng != null) {
      mapInstanceRef.current.setView([targetTxn.lat, targetTxn.lng], 8, { animate: true, duration: 0.8 });
    }
  }, [highlightedId, validTxns]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  const handleFitBounds = useCallback(() => {
    if (!mapInstanceRef.current || validTxns.length === 0) {
      mapInstanceRef.current?.setView([20.5937, 78.9629], 5);
      return;
    }

    const bounds = L.latLngBounds(validTxns.map(t => [t.lat, t.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [validTxns]);

  return (
    <div
      className="fraudx-map-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--border-radius-xl, 16px)',
        overflow: 'hidden',
        border: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
        background: '#E5E7EB',
      }}
    >
      {/* Map Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-primary, rgba(255,255,255,0.08))',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>🗺️</span>
          <div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>
              Interactive Telemetry Geo-Map
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 1 }}>
              <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>
                ● {validTxns.length} Mapped Coordinates
              </span>
              {invalidCoordsCount > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary, #94A3B8)' }}>
                  ({invalidCoordsCount} Location unavailable)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setMapStyle(s => s === 'standard' ? 'humanitarian' : 'standard')}
            title="Toggle Map Style"
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            {mapStyle === 'standard' ? '🌐 Humanitarian OSM' : '🗺️ OpenStreetMap'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={handleFitBounds}
            title="Fit All Markers"
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            🎯 Center View
          </button>
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={handleZoomIn}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFF', padding: '3px 9px', cursor: 'pointer', fontWeight: 700 }}
              title="Zoom In"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#FFF', padding: '3px 9px', cursor: 'pointer', fontWeight: 700 }}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          background: '#E5E7EB',
          position: 'relative',
        }}
      />

      {/* Risk Legend Footbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '6px 12px',
          background: 'rgba(15, 23, 42, 0.88)',
          borderTop: '1px solid var(--border-primary, rgba(255,255,255,0.06))',
          fontSize: '0.72rem',
          color: 'var(--text-secondary, #94A3B8)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
          <span>Low Risk (0–34)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
          <span>Medium Risk (35–59)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
          <span>High / Critical (60–100)</span>
        </div>
      </div>
    </div>
  );
}
