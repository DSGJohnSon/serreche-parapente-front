'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { StripeProvider } from '@/components/providers/StripeProvider';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const clientSecretParam = searchParams.get('client_secret');
  
  const [order, setOrder] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>(clientSecretParam || '');
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      loadOrderDetails(orderId);
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const loadOrderDetails = async (orderIdParam: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/orders/getById/${orderIdParam}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setOrder(data.data);
        
        // Si pas de client secret dans l'URL, essayer de le récupérer
        if (!clientSecretParam) {
          const lastPayment = data.data.payments?.[data.data.payments.length - 1];
          if (lastPayment?.stripePaymentIntentId) {
            setClientSecret(lastPayment.stripePaymentIntentId + '_secret_test');
          }
        }
      } else {
        toast({
          title: "Erreur",
          description: "Commande introuvable",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur chargement commande:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement de la commande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    setPaymentSuccess(true);
    toast({
      title: "Paiement réussi !",
      description: "Votre réservation a été confirmée",
    });
    
    // Rediriger vers la page de succès après 2 secondes
    setTimeout(() => {
      window.location.href = `/checkout/success?order=${orderId}`;
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Erreur de paiement",
      description: error,
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Chargement du paiement...</p>
        </div>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Commande introuvable</h1>
          <p className="text-gray-600 mb-4">La commande demandée n'existe pas ou a expiré</p>
          <Button onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold mb-2">Paiement réussi !</h1>
          <p className="text-gray-600 mb-4">Redirection vers la confirmation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Paiement sécurisé</h1>
          <p className="text-gray-600">Finalisez votre réservation</p>
        </div>

        {/* Récapitulatif rapide */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Commande {order.orderNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">{order.orderItems.length} article(s)</p>
                <p className="text-sm text-gray-600">Client: {order.customerEmail}</p>
              </div>
              <div className="text-right">
                {order.discountAmount > 0 && (
                  <p className="text-sm text-green-600">-{order.discountAmount}€ (bon cadeau)</p>
                )}
                <p className="text-xl font-bold">{order.totalAmount.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire de paiement Stripe */}
        {clientSecret ? (
          <StripeProvider clientSecret={clientSecret}>
            <PaymentForm
              clientSecret={clientSecret}
              orderId={order.id}
              orderNumber={order.orderNumber}
              totalAmount={order.totalAmount}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </StripeProvider>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
              <p>Erreur lors de l'initialisation du paiement</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}