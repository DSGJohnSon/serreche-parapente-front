# Guide d'intégration Frontend - Système de paiement avec acomptes

## Structure de la réponse API

Lorsque le frontend appelle `POST /api/orders/create`, il reçoit maintenant cette structure complète :

```typescript
{
  success: true,
  message: "Commande créée avec succès",
  data: {
    order: {
      id: "uuid-de-la-commande",
      orderNumber: "ORD-2024-001",
      totalAmount: 460.00,        // Montant TOTAL de la commande
      subtotal: 460.00,           // Sous-total avant réductions
      discountAmount: 50.00,      // Montant des bons cadeaux appliqués
      depositAmount: 160.00,      // ⭐ MONTANT À PAYER AUJOURD'HUI (acomptes + baptêmes - bons cadeaux)
      remainingAmount: 250.00,    // Montant restant à payer plus tard (pour les stages)
      customerEmail: "client@example.com",
      status: "PENDING",
      createdAt: "2024-01-15T10:30:00Z"
    },
    paymentIntent: {
      id: "pi_xxx",
      clientSecret: "pi_xxx_secret_yyy",
      amount: 16000               // Montant en centimes (depositAmount * 100)
    },
    remainingPayments: [          // Détails des paiements restants par stage
      {
        stageId: "stage-uuid-1",
        stageStartDate: "2024-06-15T00:00:00Z",
        remainingAmount: 250.00,  // Reste à payer pour ce stage
        dueDate: "2024-06-15T00:00:00Z"  // Date limite de paiement (début du stage)
      }
    ]
  }
}
```

## Utilisation dans le Frontend

### 1. Affichage du montant à payer

**Utilisez `data.order.depositAmount`** pour afficher le montant que le client paie aujourd'hui :

```typescript
const { data } = await response.json();

// ✅ BON - Afficher le montant de l'acompte
<div>
  <h3>À payer aujourd'hui</h3>
  <p className="text-2xl font-bold">{data.order.depositAmount.toFixed(2)} €</p>
</div>

// ❌ MAUVAIS - Ne pas utiliser totalAmount
<p>{data.order.totalAmount.toFixed(2)} €</p>  // Ceci est le montant TOTAL, pas l'acompte
```

### 2. Affichage du récapitulatif complet

```typescript
<div className="space-y-4">
  {/* Montant à payer aujourd'hui */}
  <div className="border-t-2 pt-4">
    <div className="flex justify-between text-xl font-bold">
      <span>À payer aujourd'hui</span>
      <span>{data.order.depositAmount.toFixed(2)} €</span>
    </div>
    <p className="text-sm text-gray-500 mt-1">
      Acomptes des stages + paiement complet des baptêmes
    </p>
  </div>

  {/* Paiements restants */}
  {data.remainingPayments.length > 0 && (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-semibold mb-2">Paiements restants</h4>
      <p className="text-sm text-gray-600 mb-3">
        Total restant : <strong>{data.order.remainingAmount.toFixed(2)} €</strong>
      </p>
      
      {data.remainingPayments.map((payment, index) => (
        <div key={index} className="text-sm mb-2">
          <div className="flex justify-between">
            <span>Solde du stage</span>
            <span className="font-medium">{payment.remainingAmount.toFixed(2)} €</span>
          </div>
          <p className="text-xs text-gray-500">
            À régler avant le {new Date(payment.stageStartDate).toLocaleDateString('fr-FR')}
          </p>
        </div>
      ))}
    </div>
  )}

  {/* Détails de la commande */}
  <div className="text-sm text-gray-600 space-y-1">
    <div className="flex justify-between">
      <span>Sous-total</span>
      <span>{data.order.subtotal.toFixed(2)} €</span>
    </div>
    
    {data.order.discountAmount > 0 && (
      <div className="flex justify-between text-green-600">
        <span>Bons cadeaux appliqués</span>
        <span>-{data.order.discountAmount.toFixed(2)} €</span>
      </div>
    )}
    
    <div className="flex justify-between font-semibold pt-2 border-t">
      <span>Total de la commande</span>
      <span>{data.order.totalAmount.toFixed(2)} €</span>
    </div>
  </div>
</div>
```

### 3. Redirection vers la page de paiement

```typescript
// Après avoir reçu la réponse
const { data } = await response.json();

// Rediriger avec le clientSecret
router.push(`/checkout/payment?order=${data.order.id}&client_secret=${data.paymentIntent.clientSecret}`);
```

### 4. Initialisation de Stripe Elements

Sur la page `/checkout/payment`, utilisez le `clientSecret` de l'URL :

```typescript
const searchParams = useSearchParams();
const clientSecret = searchParams.get('client_secret');

// Initialiser Stripe Elements
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const elements = stripe.elements({ clientSecret });
```

## Exemple complet de calcul

### Panier :
- 1 Stage INITIATION à 350€ (acompte: 100€)
- 1 Baptême AVENTURE à 110€ (paiement complet)
- Bon cadeau de 50€ appliqué

### Calculs backend :
```
subtotal = 350 + 110 = 460€
depositTotal = 100 + 110 = 210€  (acompte stage + baptême complet)
discountAmount = 50€
depositAmount = 210 - 50 = 160€  ← À payer aujourd'hui
remainingAmount = 250€  (350 - 100 = reste du stage)
totalAmount = 460 - 50 = 410€
```

### Réponse API :
```json
{
  "order": {
    "totalAmount": 410.00,
    "subtotal": 460.00,
    "discountAmount": 50.00,
    "depositAmount": 160.00,     // ⭐ Utilisez CECI pour l'affichage
    "remainingAmount": 250.00
  },
  "paymentIntent": {
    "amount": 16000              // 160€ en centimes
  },
  "remainingPayments": [
    {
      "remainingAmount": 250.00,
      "stageStartDate": "2024-06-15T00:00:00Z"
    }
  ]
}
```

## Points importants

### ✅ À FAIRE
- Utiliser `data.order.depositAmount` pour afficher le montant à payer
- Afficher `data.order.remainingAmount` pour informer du solde restant
- Montrer les dates d'échéance des paiements restants (`remainingPayments`)
- Utiliser `data.paymentIntent.clientSecret` pour Stripe Elements

### ❌ À NE PAS FAIRE
- Ne pas utiliser `data.order.totalAmount` pour le montant à payer aujourd'hui
- Ne pas recalculer le montant côté frontend (le backend fait déjà le calcul correct)
- Ne pas construire manuellement le `clientSecret`

## Types TypeScript

```typescript
interface OrderResponse {
  success: boolean;
  message: string;
  data: {
    order: {
      id: string;
      orderNumber: string;
      totalAmount: number;        // Total de la commande
      subtotal: number;           // Sous-total avant réductions
      discountAmount: number;     // Montant des bons cadeaux
      depositAmount: number;      // ⭐ Montant à payer aujourd'hui
      remainingAmount: number;    // Montant restant à payer
      customerEmail: string;
      status: string;
      createdAt: string;
    };
    paymentIntent: {
      id: string;
      clientSecret: string;       // Pour Stripe Elements
      amount: number;             // En centimes
    };
    remainingPayments: Array<{
      stageId: string;
      stageStartDate: string;
      remainingAmount: number;
      dueDate: string;
    }>;
  };
}
```

## Résumé

**Pour afficher le montant à payer :** `data.order.depositAmount`  
**Pour le clientSecret Stripe :** `data.paymentIntent.clientSecret`  
**Pour les paiements restants :** `data.remainingPayments`

Le backend gère maintenant correctement :
- ✅ Les acomptes des stages (définis par `stage.acomptePrice`)
- ✅ Le paiement complet des baptêmes
- ✅ L'application des bons cadeaux sur le montant de l'acompte
- ✅ Le calcul du solde restant par stage
- ✅ La création du PaymentIntent Stripe avec le bon montant