import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private static readonly SESSION_KEY = 'cart-session-id';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24h en ms

  /**
   * Obtenir ou créer un ID de session
   */
  static getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      // Côté serveur, générer un nouvel ID
      return uuidv4();
    }

    let sessionId = localStorage.getItem(this.SESSION_KEY);
    
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem(this.SESSION_KEY, sessionId);
      
      // Programmer la suppression automatique
      this.scheduleSessionCleanup(sessionId);
    }

    return sessionId;
  }

  /**
   * Vérifier si une session existe
   */
  static hasActiveSession(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(this.SESSION_KEY);
  }

  /**
   * Supprimer la session locale
   */
  static clearSession(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem('cart-items-cache');
    localStorage.removeItem('participant-draft');
  }

  /**
   * Programmer le nettoyage automatique
   */
  private static scheduleSessionCleanup(sessionId: string): void {
    setTimeout(() => {
      const currentSessionId = localStorage.getItem(this.SESSION_KEY);
      if (currentSessionId === sessionId) {
        this.clearSession();
      }
    }, this.SESSION_DURATION);
  }

  /**
   * Migrer le panier vers un compte utilisateur
   */
  static async migrateCartToUser(userId: string): Promise<boolean> {
    const sessionId = this.getOrCreateSessionId();
    
    try {
      const response = await fetch('/api/cart/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      
      if (result.success) {
        this.clearSession();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur migration panier:', error);
      return false;
    }
  }

  /**
   * Obtenir les informations de session
   */
  static async getSessionInfo(): Promise<{
    sessionId: string;
    itemCount: number;
    expiresAt: Date;
  } | null> {
    const sessionId = this.getOrCreateSessionId();
    
    try {
      const response = await fetch('/api/cart/session-info', {
        headers: {
          'x-session-id': sessionId,
        },
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Erreur info session:', error);
      return null;
    }
  }
}