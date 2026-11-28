import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/geo';

export function useStepCounter(userLocation) {
  const [steps, setSteps] = useState(() => {
    const savedDate = localStorage.getItem('tw_step_date');
    const today = new Date().toDateString();
    if (savedDate !== today) {
      localStorage.setItem('tw_step_date', today);
      localStorage.setItem('tw_today_steps', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('tw_today_steps') || '0', 10);
  });
  const lastLocationRef = useRef(null);

  useEffect(() => { localStorage.setItem('tw_today_steps', String(steps)); }, [steps]);

  useEffect(() => {
    if (!userLocation) return;
    const previous = lastLocationRef.current;
    if (previous) {
      const distance = calculateDistance(previous[1], previous[0], userLocation[1], userLocation[0]);
      // Ignore GPS jitter below 3m; count measured distance at 0.7m per step.
      if (distance >= 3 && distance < 100) {
        setSteps(value => Math.min(value + Math.floor(distance / 0.7), 10000));
        lastLocationRef.current = userLocation;
      }
    } else {
      lastLocationRef.current = userLocation;
    }
  }, [userLocation]);

  return { steps, setSteps };
}
