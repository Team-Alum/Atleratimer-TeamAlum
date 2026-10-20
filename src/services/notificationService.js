// Safe Browser Notification Helper for Atleratimer

class NotificationService {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermission() {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  async requestPermission() {
    if (!this.isSupported()) return 'denied';
    try {
      const res = await Notification.requestPermission();
      return res;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return 'denied';
    }
  }

  send(title, options = {}) {
    if (!this.isSupported()) return null;
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          silent: false,
          ...options,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return notif;
      } catch (e) {
        console.warn('Failed to send notification:', e);
      }
    }
    return null;
  }
}

export const notificationService = new NotificationService();
