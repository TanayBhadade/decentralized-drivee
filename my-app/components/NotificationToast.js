import React, { useState, useEffect } from 'react';

const NotificationToast = ({ 
  message, 
  type = 'info', // 'success', 'error', 'warning', 'info'
  duration = 5000,
  onClose,
  show = false
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300); // Animation duration
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500/90 to-emerald-600/90',
          border: 'border-green-400/50',
          icon: '✅',
          iconColor: 'text-green-200'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500/90 to-red-600/90',
          border: 'border-red-400/50',
          icon: '❌',
          iconColor: 'text-red-200'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-500/90 to-orange-500/90',
          border: 'border-yellow-400/50',
          icon: '⚠️',
          iconColor: 'text-yellow-200'
        };
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-500/90 to-indigo-600/90',
          border: 'border-blue-400/50',
          icon: 'ℹ️',
          iconColor: 'text-blue-200'
        };
    }
  };

  if (!isVisible) return null;

  const styles = getTypeStyles();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`
          ${styles.bg} ${styles.border}
          backdrop-blur-sm border rounded-lg shadow-lg
          transform transition-all duration-300 ease-in-out
          ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          max-w-sm w-full
        `}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <span className={`${styles.iconColor} text-lg flex-shrink-0`}>
              {styles.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Manager Component
export const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration + 300); // Add animation time
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Expose addToast globally
  useEffect(() => {
    window.showToast = addToast;
    return () => {
      delete window.showToast;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          <NotificationToast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            show={true}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;