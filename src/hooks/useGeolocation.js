import { useState, useEffect } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('お使いのブラウザは位置情報をサポートしていません。');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation([position.coords.longitude, position.coords.latitude]);
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true, // GPS精度を最大化
        maximumAge: 0,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error };
};