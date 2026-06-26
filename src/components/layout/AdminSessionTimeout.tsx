import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

// 1.5 hours in milliseconds = 90 minutes * 60 seconds * 1000 milliseconds = 5,400,000 ms
const TIMEOUT_DURATION = 90 * 60 * 1000; 

export default function AdminSessionTimeout() {
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only apply to admin users
    if (!profile || profile.role !== 'admin') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        console.log('[AdminSessionTimeout] Session expired due to inactivity.');
        alert('Sua sessão como administrador expirou por inatividade. Por favor, faça login novamente.');
        signOut();
      }, TIMEOUT_DURATION);
    };

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize timer
    resetTimer();

    // Attach event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [profile, signOut]);

  return null;
}
