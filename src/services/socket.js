import { io } from 'socket.io-client';

let socket = null;

/**
 * Connect to backend Socket.io (live rider locations).
 * Prefer VITE_API_URL / VITE_BACKEND_URL; in Vite dev default to localhost:5000.
 */
export function getSocket() {
  if (socket) return socket;
  let base =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    '';
  base = String(base).replace(/\/api\/?$/, '').replace(/\/$/, '');
  if (!base && typeof window !== 'undefined') {
    // Dev: frontend :3000, API usually :5000
    if (window.location.port === '3000' || window.location.port === '5173') {
      base = `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }
  socket = io(base || undefined, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function joinJobRoom(jobId) {
  const s = getSocket();
  if (jobId) s.emit('join_job', jobId);
  return s;
}

export function leaveJobRoom(jobId) {
  if (!socket || !jobId) return;
  socket.emit('leave_job', jobId);
}
