# Backend API Requirements - Cart Reservation System

## Vue d'ensemble

Ce document décrit les modifications nécessaires au backend pour implémenter un système de réservation temporaire de places dans le panier avec expiration automatique après 1 heure.

## Objectifs

1. **Bloquer temporairement les places** ajoutées au panier pendant 1 heure
2. **Décompter les places bloquées** des places disponibles affichées
3. **Libérer automatiquement** les places après expiration (1h)
4. **Nettoyer automatiquement** les paniers expirés

## Modifications requises

### 1. Modèle de données - CartItem

Ajouter les champs suivants au modèle `CartItem` :

```typescript
interface CartItem {
  id: string;
  sessionId: string;
  type: 'STAGE' | 'BAPTEME' | 'GIFT_CARD';
  itemId: string;
  participantData: object;
  quantity: number;
  
  // NOUVEAUX CHAMPS
  createdAt: Date;        // Date de création de l'item
  expiresAt: Date;        // Date d'expiration (createdAt + 1h pour STAGE/BAPTEME)
  isExpired: boolean;     // Flag calculé pour identifier les items expirés
}
```

### 2. API Endpoint - POST /api/cart/add

**Modifications nécessaires :**

```typescript
// Lors de l'ajout d'un item STAGE ou BAPTEME au panier
if (type === 'STAGE' || type === 'BAPTEME') {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 heure
  
  cartItem = {
    ...cartItem,
    createdAt: now,
    expiresAt: expiresAt,
    isExpired: false
  };
}

// Pour les GIFT_CARD, pas d'expiration
if (type === 'GIFT_CARD') {
  cartItem = {
    ...cartItem,
    createdAt: new Date(),
    expiresAt: null,
    isExpired: false
  };
}
```

**Vérifications à effectuer :**
- Vérifier la disponibilité réelle en comptant les réservations confirmées ET les places bloquées dans d'autres paniers non expirés
- Retourner une erreur si plus de places disponibles

### 3. API Endpoint - GET /api/cart/items

**Modifications nécessaires :**

```typescript
// Avant de retourner les items du panier
const now = new Date();

// Filtrer et supprimer automatiquement les items expirés
const validItems = cartItems.filter(item => {
  if ((item.type === 'STAGE' || item.type === 'BAPTEME') && item.expiresAt) {
    const isExpired = new Date(item.expiresAt) <= now;
    if (isExpired) {
      // Supprimer l'item expiré de la base de données
      deleteCartItem(item.id);
      return false;
    }
  }
  return true;
});

return {
  success: true,
  data: {
    items: validItems,
    totalAmount: calculateTotal(validItems)
  }
};
```

### 4. API Endpoint - DELETE /api/cart/remove/:itemId

**Comportement actuel à conserver :**
- Supprimer l'item du panier
- Libérer automatiquement la place bloquée

**Aucune modification majeure nécessaire**, juste s'assurer que la suppression libère bien la place.

### 5. API Endpoint - POST /api/availability/check

**Modifications nécessaires :**

```typescript
// Calculer les places disponibles en tenant compte des réservations temporaires
const calculateAvailablePlaces = async (type: 'stage' | 'bapteme', itemId: string) => {
  const item = await getItem(type, itemId); // Stage ou Bapteme
  const totalPlaces = item.places;
  
  // Compter les réservations confirmées (bookings payés)
  const confirmedBookings = await countConfirmedBookings(type, itemId);
  
  // Compter les réservations temporaires (items dans les paniers non expirés)
  const now = new Date();
  const temporaryReservations = await countCartItems({
    type: type.toUpperCase(),
    itemId: itemId,
    expiresAt: { $gt: now }, // Non expirés
    isExpired: false
  });
  
  const availablePlaces = totalPlaces - confirmedBookings - temporaryReservations;
  
  return {
    available: availablePlaces > 0,
    availablePlaces: Math.max(0, availablePlaces),
    totalPlaces: totalPlaces,
    confirmedBookings: confirmedBookings,
    temporaryReservations: temporaryReservations
  };
};
```

### 6. Tâche CRON - Nettoyage automatique

**Créer une tâche planifiée qui s'exécute toutes les 5 minutes :**

```typescript
// Fonction de nettoyage des paniers expirés
const cleanupExpiredCartItems = async () => {
  const now = new Date();
  
  // Trouver tous les items expirés
  const expiredItems = await CartItem.find({
    type: { $in: ['STAGE', 'BAPTEME'] },
    expiresAt: { $lte: now },
    isExpired: false
  });
  
  // Marquer comme expirés et supprimer
  for (const item of expiredItems) {
    await CartItem.deleteOne({ _id: item.id });
    console.log(`Deleted expired cart item: ${item.id}`);
  }
  
  console.log(`Cleaned up ${expiredItems.length} expired cart items`);
};

// Planifier l'exécution toutes les 5 minutes
cron.schedule('*/5 * * * *', cleanupExpiredCartItems);
```

### 7. API Endpoint - GET /api/stages/getAll et /api/baptemes/getAll

**Modifications nécessaires :**

Ces endpoints doivent retourner les places disponibles en temps réel en tenant compte des réservations temporaires.

```typescript
// Pour chaque stage/bapteme retourné
const enrichWithAvailability = async (items) => {
  const now = new Date();
  
  return Promise.all(items.map(async (item) => {
    const confirmedBookings = await countConfirmedBookings(item.id);
    const temporaryReservations = await countCartItems({
      itemId: item.id,
      expiresAt: { $gt: now },
      isExpired: false
    });
    
    return {
      ...item,
      availablePlaces: item.places - confirmedBookings - temporaryReservations,
      confirmedBookings,
      temporaryReservations
    };
  }));
};
```

## Flux de données

### Scénario 1 : Ajout au panier

1. Client appelle `POST /api/cart/add` avec `type: 'STAGE'` et `itemId`
2. Backend vérifie la disponibilité (places totales - confirmées - temporaires)
3. Si disponible :
   - Crée un CartItem avec `expiresAt = now + 1h`
   - Retourne `success: true`
4. Si non disponible :
   - Retourne `success: false` avec message d'erreur

### Scénario 2 : Consultation du panier

1. Client appelle `GET /api/cart/items`
2. Backend :
   - Filtre les items expirés
   - Supprime les items expirés de la DB
   - Retourne uniquement les items valides avec leurs `expiresAt`

### Scénario 3 : Vérification de disponibilité

1. Client appelle `POST /api/availability/check`
2. Backend calcule :
   - Places confirmées (bookings payés)
   - Places temporaires (paniers non expirés)
   - Places disponibles = total - confirmées - temporaires
3. Retourne les informations de disponibilité

### Scénario 4 : Expiration automatique

1. CRON s'exécute toutes les 5 minutes
2. Trouve tous les CartItems avec `expiresAt <= now`
3. Supprime ces items de la base de données
4. Les places sont automatiquement libérées

### Scénario 5 : Suppression manuelle

1. Client appelle `DELETE /api/cart/remove/:itemId`
2. Backend supprime l'item
3. La place est immédiatement libérée

## Considérations importantes

### Performance
- Indexer les champs `expiresAt` et `isExpired` pour optimiser les requêtes
- Indexer `sessionId` pour les requêtes de panier

### Sécurité
- Valider que le `sessionId` correspond bien à la session du client
- Empêcher qu'un client ne bloque toutes les places

### Gestion des conflits
- Si deux clients tentent de réserver la dernière place simultanément, utiliser des transactions pour garantir l'atomicité

### Notifications
- Optionnel : Envoyer un email/notification 10 minutes avant l'expiration du panier

## Exemple de réponse API

### POST /api/cart/add - Succès

```json
{
  "success": true,
  "message": "Item ajouté au panier",
  "data": {
    "cartItem": {
      "id": "cart_123",
      "type": "STAGE",
      "itemId": "stage_456",
      "createdAt": "2025-01-13T17:00:00.000Z",
      "expiresAt": "2025-01-13T18:00:00.000Z",
      "isExpired": false
    }
  }
}
```

### GET /api/cart/items - Succès

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart_123",
        "type": "STAGE",
        "itemId": "stage_456",
        "participantData": {...},
        "stage": {...},
        "createdAt": "2025-01-13T17:00:00.000Z",
        "expiresAt": "2025-01-13T18:00:00.000Z",
        "isExpired": false
      }
    ],
    "totalAmount": 450
  }
}
```

### POST /api/availability/check - Succès

```json
{
  "success": true,
  "data": {
    "available": true,
    "availablePlaces": 3,
    "totalPlaces": 6,
    "confirmedBookings": 2,
    "temporaryReservations": 1,
    "reason": null
  }
}
```

## Prompt pour l'IA Backend

```
Je dois implémenter un système de réservation temporaire de places dans le panier avec les caractéristiques suivantes :

1. BLOCAGE TEMPORAIRE :
   - Quand un client ajoute un stage ou baptême au panier, la place doit être bloquée pendant 1 heure
   - Ajouter les champs `createdAt` et `expiresAt` au modèle CartItem
   - `expiresAt = createdAt + 1 heure` pour les types STAGE et BAPTEME
   - Les bons cadeaux (GIFT_CARD) n'ont pas d'expiration

2. CALCUL DES DISPONIBILITÉS :
   - Les places disponibles = places totales - réservations confirmées - places bloquées dans les paniers non expirés
   - Modifier l'endpoint POST /api/availability/check pour inclure les réservations temporaires
   - Modifier GET /api/stages/getAll et GET /api/baptemes/getAll pour afficher les vraies disponibilités

3. NETTOYAGE AUTOMATIQUE :
   - Créer une tâche CRON qui s'exécute toutes les 5 minutes
   - Supprimer automatiquement les CartItems où `expiresAt <= now`
   - Modifier GET /api/cart/items pour filtrer et supprimer les items expirés avant de retourner le panier

4. LIBÉRATION DES PLACES :
   - Quand un client supprime un item du panier (DELETE /api/cart/remove/:itemId), la place est libérée immédiatement
   - Quand un panier expire, les places sont libérées automatiquement

5. VALIDATION :
   - Lors de l'ajout au panier, vérifier qu'il reste des places disponibles en comptant les réservations confirmées ET temporaires
   - Retourner une erreur si plus de places disponibles

Peux-tu implémenter ces modifications dans le backend en suivant les spécifications détaillées dans le document BACKEND_API_REQUIREMENTS.md ?
```

## Résumé des changements

| Endpoint/Composant | Modification | Priorité |
|-------------------|--------------|----------|
| CartItem Model | Ajouter `createdAt`, `expiresAt`, `isExpired` | ⭐⭐⭐ Critique |
| POST /api/cart/add | Définir expiration à +1h pour STAGE/BAPTEME | ⭐⭐⭐ Critique |
| GET /api/cart/items | Filtrer et supprimer items expirés | ⭐⭐⭐ Critique |
| POST /api/availability/check | Inclure réservations temporaires | ⭐⭐⭐ Critique |
| CRON Job | Nettoyage automatique toutes les 5 min | ⭐⭐ Important |
| GET /api/stages/getAll | Enrichir avec disponibilités réelles | ⭐⭐ Important |
| GET /api/baptemes/getAll | Enrichir avec disponibilités réelles | ⭐⭐ Important |
| DELETE /api/cart/remove | Vérifier libération de place | ⭐ Nice to have |