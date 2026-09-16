import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapView({ transactions = [], highlightedId, onMarkerClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers (limit to first 200 for performance)
    const txnsWithCoords = transactions.filter(t => t.lat && t.lng).slice(0, 200);
    txnsWithCoords.forEach(txn => {
      const color = txn.riskLevel === 'High' || txn.riskLevel === 'Critical'
        ? '#EF4444'
        : txn.riskLevel === 'Medium'
          ? '#F59E0B'
          : '#22C55E';

      const isHighlighted = txn.id === highlightedId;
      const radius = isHighlighted ? 8 : 5;
      const opacity = isHighlighted ? 1 : 0.7;

      const marker = L.circleMarker([txn.lat, txn.lng], {
        radius,
        fillColor: color,
        color: isHighlighted ? '#FFFFFF' : color,
        weight: isHighlighted ? 3 : 1,
        fillOpacity: opacity,
      })
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 13px;">
            <strong>${txn.id}</strong><br/>
            ${txn.senderName} → ${txn.receiverName}<br/>
            Amount: ${txn.amountFormatted}<br/>
            Risk: <span style="color:${color};font-weight:600">${txn.riskLevel}</span>
          </div>
        `);

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(txn.id);
      });

      markersRef.current.push(marker);
    });
  }, [transactions, highlightedId, onMarkerClick]);

  // Pan to highlighted marker
  useEffect(() => {
    if (!mapInstance.current || !highlightedId) return;
    const txn = transactions.find(t => t.id === highlightedId);
    if (txn?.lat && txn?.lng) {
      mapInstance.current.setView([txn.lat, txn.lng], 8, { animate: true });
    }
  }, [highlightedId, transactions]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '360px',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-primary)',
      }}
    />
  );
}
