'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StripeProvider } from '@/components/providers/StripeProvider';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const clientSecretParam = searchParams.get('client_secret');
  
  const [order, setOrder] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>(clientSecretParam || '');
  const [remainingPayments, setRemainingPayments] = useState<any[]>([]);
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
        const orderData = data.data;
        
        // Calculer depositAmount et remainingAmount à partir des orderItems
        let depositAmount = 0;
        let remainingAmount = 0;
        const remainingPaymentsList: any[] = [];
        
        orderData.orderItems?.forEach((item: any) => {
          if (item.type === 'STAGE' && item.stage) {
            // Pour les stages : acompte
            const stageDeposit = item.stage.acomptePrice || Math.round(item.stage.price * 0.33);
            depositAmount += stageDeposit;
            
            // Calculer le reste à payer
            const remaining = item.stage.price - stageDeposit;
            if (remaining > 0) {
              remainingAmount += remaining;
              remainingPaymentsList.push({
                type: 'STAGE',
                itemId: item.stage.id,
                itemType: item.stage.type,
                itemDate: item.stage.startDate,
                remainingAmount: remaining,
                dueDate: item.stage.startDate,
                participantName: `${item.participantData?.firstName || ''} ${item.participantData?.lastName || ''}`.trim()
              });
            }
          } else if (item.type === 'BAPTEME' && item.bapteme) {
            // Pour les baptêmes : acompte + vidéo (si sélectionnée)
            const baptemeDeposit = item.bapteme.acomptePrice || 35;
            const videoPrice = item.participantData?.hasVideo ? 25 : 0;
            depositAmount += baptemeDeposit + videoPrice;
            
            // Calculer le reste à payer (prix de base - acompte, vidéo déjà payée)
            const basePrice = item.totalPrice - videoPrice; // Prix du baptême sans vidéo
            const remaining = basePrice - baptemeDeposit;
            if (remaining > 0) {
              remainingAmount += remaining;
              const category = item.participantData?.selectedCategory || '';
              remainingPaymentsList.push({
                type: 'BAPTEME',
                itemId: item.bapteme.id,
                itemType: category,
                itemDate: item.bapteme.date,
                remainingAmount: remaining,
                dueDate: item.bapteme.date,
                participantName: `${item.participantData?.firstName || ''} ${item.participantData?.lastName || ''}`.trim(),
                hasVideo: false // Vidéo déjà payée
              });
            }
          } else {
            // Pour les cartes cadeaux : paiement complet
            depositAmount += item.totalPrice;
          }
        });
        
        // Appliquer la réduction des cartes cadeaux sur le depositAmount
        if (orderData.discountAmount > 0) {
          depositAmount = Math.max(0, depositAmount - orderData.discountAmount);
        }
        
        // Ajouter les montants calculés à l'objet order
        const enrichedOrder = {
          ...orderData,
          depositAmount,
          remainingAmount
        };
        
        setOrder(enrichedOrder);
        setRemainingPayments(remainingPaymentsList);
        
        // Le clientSecret doit venir de l'URL, pas être reconstruit
        if (!clientSecretParam) {
          toast({
            title: "Erreur",
            description: "Client secret manquant. Veuillez recommencer le processus de paiement.",
            variant: "destructive",
          });
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

        {/* Récapitulatif de la commande */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Commande {order.orderNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Client: {order.customerEmail}</p>
              {order.orderItems && (
                <p className="text-sm text-gray-600">{order.orderItems.length} article(s)</p>
              )}
            </div>

            {/* Détails des montants */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total</span>
                <span>{(order.subtotal || order.totalAmount).toFixed(2)}€</span>
              </div>
              
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Cartes cadeaux appliquées</span>
                  <span>-{order.discountAmount.toFixed(2)}€</span>
                </div>
              )}
              
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total de la commande</span>
                <span>{order.totalAmount.toFixed(2)}€</span>
              </div>
            </div>

            {/* Montant à payer aujourd'hui - MIS EN VALEUR */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-300">
              <div>
                <p className="text-xs text-blue-700 uppercase font-semibold tracking-wide mb-2">
                  À payer aujourd'hui
                </p>
                <p className="text-2xl font-bold text-blue-600 mb-3">
                  {(order.depositAmount || order.totalAmount).toFixed(2)}€
                </p>
                
                {/* Détail des items inclus dans le paiement */}
                <div className="space-y-1">
                  {order.orderItems?.map((item: any, index: number) => {
                    const participantName = `${item.participantData?.firstName || ''} ${item.participantData?.lastName || ''}`.trim();
                    
                    if (item.type === 'STAGE' && item.stage) {
                      const stageDate = new Date(item.stage.startDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      });
                      return (
                        <p key={index} className="text-xs text-gray-700">
                          • Acompte du stage {item.stage.type} pour {participantName} le {stageDate}
                        </p>
                      );
                    } else if (item.type === 'BAPTEME' && item.bapteme) {
                      const baptemeDate = new Date(item.bapteme.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      });
                      const category = item.participantData?.selectedCategory || '';
                      const hasVideo = item.participantData?.hasVideo || false;
                      return (
                        <p key={index} className="text-xs text-gray-700">
                          • Acompte du baptême {category} pour {participantName} le {baptemeDate}
                          {hasVideo && <span className="text-green-600"> + Vidéo (25€)</span>}
                        </p>
                      );
                    } else if (item.type === 'GIFT_CARD') {
                      const recipientName = item.participantData?.recipientName || 'destinataire';
                      return (
                        <p key={index} className="text-xs text-gray-700">
                          • Carte cadeau pour {recipientName}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            {/* Paiements restants */}
            {order.remainingAmount > 0 && remainingPayments.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-sm text-orange-900 mb-2">
                  Règlements futurs
                </h4>
                <p className="text-sm text-orange-800 mb-1">
                  Solde total à venir : <strong>{order.remainingAmount.toFixed(2)}€</strong>
                </p>
                <p className='text-xs text-orange-700 mb-3'>Les soldes de stages seront à régler sur place le jour du stage.</p>
                
                <div className="space-y-3">
                  {remainingPayments.map((payment, index) => (
                    <div key={index} className="text-sm border-l-2 border-orange-300 pl-3">
                      <p className="font-medium text-orange-900 mb-1">
                        {payment.participantName}
                      </p>
                      <div className="flex justify-between items-start">
                        <span className="text-orange-700">
                          {payment.type === 'STAGE'
                            ? `Solde Stage ${payment.itemType}`
                            : `Solde Baptême ${payment.itemType}`
                          }
                        </span>
                        <span className="font-semibold text-orange-900">
                          {payment.remainingAmount.toFixed(2)}€
                        </span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        À régler <span className='font-semibold underline'>sur place</span> le {new Date(payment.itemDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de paiement Stripe */}
        {clientSecret ? (
          <StripeProvider clientSecret={clientSecret}>
            <PaymentForm
              clientSecret={clientSecret}
              orderId={order.id}
              orderNumber={order.orderNumber}
              totalAmount={order.depositAmount || order.totalAmount}
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

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Chargement du paiement...</p>
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}