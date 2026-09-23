import React from 'react';
import logoImg from '../assets/logo.png';

/**
 * FraudXLogo
 * Renders the new FraudX AI corporate identity logo:
 * Crisp, transparent background, zero grid lines, high-resolution.
 */
export default function FraudXLogo({
  height = 44,
  glow = false,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`fraudx-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}
    >
      <img
        src={logoImg}
        alt="FraudX AI"
        style={{
          height: `${height}px`,
          width: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: glow ? 'drop-shadow(0 4px 16px rgba(74, 123, 247, 0.35))' : 'none',
          transition: 'filter 250ms ease, transform 200ms ease',
        }}
      />
    </div>
  );
}
