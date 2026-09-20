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
    // Only include transactions with valid coordinates
    const txnsWithCoords = transactions.filter(t =>
      t.lat != null && t.lng != null &&
      !isNaN(t.lat) && !isNaN(t.lng) &&
      Math.abs(t.lat) <= 90 && Math.abs(t.lng) <= 180
    ).slice(0, 200);

    txnsWithCoords.forEach(txn => {
      const color = txn.riskLevel === 'High' || txn.riskLevel === 'Critical'
        ? '#EF4444'
        : txn.riskLevel === 'Medium'
          ? '#F59E0B'
          : '#22C55E';

      const isHighlighted = txn.id === highlightedId;
      const radius = isHighlighted ? 8 : 5;
      const opacity = isHighlighted ? 1 : 0.7;

      const riskBadgeColor = txn.riskLevel === 'Critical' ? '#DC2626'
        : txn.riskLevel === 'High' ? '#EF4444'
        : txn.riskLevel === 'Medium' ? '#F59E0B'
        : '#22C55E';

      const marker = L.circleMarker([txn.lat, txn.lng], {
        radius,
        fillColor: color,
        color: isHighlighted ? '#FFFFFF' : color,
        weight: isHighlighted ? 3 : 1,
        fillOpacity: opacity,
      })
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 700; margin-bottom: 6px; font-size: 14px;">${txn.id}</div>
            <div style="margin-bottom: 4px;">${txn.senderName} → ${txn.receiverName}</div>
            <div style="margin-bottom: 4px;"><strong>Amount:</strong> ${txn.amountFormatted}</div>
            <div style="margin-bottom: 4px;"><strong>Type:</strong> ${txn.type}</div>
            <div style="margin-bottom: 4px;"><strong>Location:</strong> ${txn.location}</div>
            <div style="margin-bottom: 4px;"><strong>Risk:</strong> <span style="color:${riskBadgeColor};font-weight:600">${txn.riskLevel}</span> (${txn.riskScore}/100)</div>
            <div><strong>Status:</strong> ${txn.status}</div>
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
    if (txn?.lat != null && txn?.lng != null) {
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
