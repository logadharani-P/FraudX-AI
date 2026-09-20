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

    // OpenStreetMap standard tile layer (free, no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 100);

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

    // Safely filter transactions with valid numeric coordinates
    const txnsWithCoords = transactions
      .filter(t => {
        if (t.lat == null || t.lng == null) return false;
        const lat = Number(t.lat);
        const lng = Number(t.lng);
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      })
      .slice(0, 200);

    txnsWithCoords.forEach(txn => {
      const lat = Number(txn.lat);
      const lng = Number(txn.lng);
      const isHighOrCrit = txn.riskLevel === 'High' || txn.riskLevel === 'Critical';
      const color = isHighOrCrit
        ? '#EF4444'
        : txn.riskLevel === 'Medium'
          ? '#F59E0B'
          : '#22C55E';

      const isHighlighted = txn.id === highlightedId;
      const radius = isHighlighted ? 9 : 6;
      const opacity = isHighlighted ? 1 : 0.8;

      const locationStr = [txn.city, txn.state].filter(Boolean).join(', ') || txn.location || 'Location unavailable';
      const amountStr = txn.amountFormatted || (txn.amount != null ? `₹${Number(txn.amount).toLocaleString('en-IN')}` : '₹0');
      const riskLevel = txn.riskLevel || 'Low';

      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: isHighlighted ? '#FFFFFF' : color,
        weight: isHighlighted ? 3 : 1.5,
        fillOpacity: opacity,
      })
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 13px; line-height: 1.5; color: #1e293b; min-width: 170px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #0f172a;">${txn.id || txn.transaction_id || 'Transaction'}</div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">📍 ${locationStr}</div>
            <div style="margin-bottom: 2px;"><strong>Amount:</strong> ${amountStr}</div>
            <div><strong>Risk Level:</strong> <span style="color:${color};font-weight:700;">${riskLevel}</span></div>
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
    if (txn && txn.lat != null && txn.lng != null) {
      const lat = Number(txn.lat);
      const lng = Number(txn.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        mapInstance.current.setView([lat, lng], 8, { animate: true });
      }
    }
  }, [highlightedId, transactions]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '360px',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
      }}
    />
  );
}

