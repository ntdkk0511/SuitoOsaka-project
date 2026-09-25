import React from 'react';

export default function Splash() {
  return (
    <div className="splash-screen">
      <div className="ripple-container">
        <div className="water-drop"></div>
        <div className="wave-ripple" style={{ animationDelay: '0s' }}></div>
        <div className="wave-ripple" style={{ animationDelay: '0.6s' }}></div>
      </div>
      <div className="splash-logo-zone">
        <p className="splash-eyebrow">AQUATIC DIGITAL RALLY</p>
        <h1 className="splash-title">Suito Time-Walk</h1>
      </div>
    </div>
  );
}