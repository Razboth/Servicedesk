'use client';

import { useEffect } from 'react';

export default function ChunkErrorHandler() {
  useEffect(() => {
    // Handle chunk loading errors
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;

      // Check if this is a chunk loading error
      if (error && error.name === 'ChunkLoadError') {
        console.error('Chunk loading error detected:', error.message);

        // Check if we've already tried reloading recently
        const lastReload = sessionStorage.getItem('last-chunk-reload');
        const now = Date.now();

        if (!lastReload || now - parseInt(lastReload) > 30000) {
          // Store the current time
          sessionStorage.setItem('last-chunk-reload', now.toString());

          // Clear the module cache
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                if (name.includes('webpack') || name.includes('next')) {
                  caches.delete(name);
                }
              });
            });
          }

          // Reload the page after a short delay
          setTimeout(() => {
            console.log('Reloading page due to chunk error...');
            window.location.reload();
          }, 1000);
        } else {
          // If we've already tried reloading recently, show an error message
          console.error('Multiple chunk loading errors detected. Please clear your browser cache.');

          // Show user-friendly error message
          const message = document.createElement('div');
          message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6b6b;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 999999;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          message.textContent = 'Loading error detected. Please refresh the page or clear your browser cache.';
          document.body.appendChild(message);

          // Remove the message after 10 seconds
          setTimeout(() => {
            if (message.parentNode) {
              message.parentNode.removeChild(message);
            }
          }, 10000);
        }

        // Prevent the default error handling
        event.preventDefault();
        return true;
      }
    };

    // Add error event listener
    window.addEventListener('error', handleChunkError);

    // Handle unhandled promise rejections (for dynamic imports)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.name === 'ChunkLoadError') {
        handleChunkError(new ErrorEvent('error', { error: event.reason }));
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}