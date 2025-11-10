'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Mail, Phone, Calendar } from 'lucide-react';

function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Erreur chargement commande:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemTitle = (item: any) => {
    switch (item.type) {
      case 'STAGE':
        return `Stage ${item.stage?.type} - ${new Date(item.stage?.startDate).toLocaleDateString('fr-FR')}`;
      case 'BAPTEME':
        return `Baptême ${item.participantData.selectedCategory} - ${new Date(item.bapteme?.date).toLocaleDateString('fr-FR')}`;
      case 'GIFT_CARD':
        return `Bon cadeau ${item.giftCardAmount}€`;
      default:
        return 'Article';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Chargement de votre confirmation...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Commande introuvable</h1>
          <p className="text-gray-600 mb-4">Impossible de récupérer les détails de votre commande</p>
          <Button onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header de succès */}
        <div className="text-center mb-8">
          <CheckCircle className="w-20 h-20 mx-auto mb-4 text-green-500" />
          <h1 className="text-3xl font-bold text-green-700 mb-2">
            🎉 Réservation confirmée !
          </h1>
          <p className="text-gray-600">
            Votre paiement a été traité avec succès
          </p>
        </div>

        {/* Détails de la commande */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Commande {order.orderNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email de confirmation</p>
                <p className="font-semibold">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant payé</p>
                <p className="font-semibold text-green-600">{order.totalAmount}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Articles réservés */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vos réservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.orderItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{getItemTitle(item)}</h4>
                    <p className="text-sm text-gray-600">
                      Participant: {item.participantData.firstName} {item.participantData.lastName}
                    </p>
                    {item.type === 'BAPTEME' && item.participantData.hasVideo && (
                      <p className="text-sm text-green-600">+ Option vidéo incluse</p>
                    )}
                    {item.type === 'GIFT_CARD' && (
                      <p className="text-sm text-blue-600">
                        Code: {item.generatedGiftCard?.code || 'En cours de génération'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.totalPrice}€</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prochaines étapes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Prochaines étapes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Confirmation par email</p>
                <p className="text-sm text-gray-600">
                  Vous allez recevoir un email de confirmation avec tous les détails
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Contact sous 24h</p>
                <p className="text-sm text-gray-600">
                  Notre équipe vous contactera pour confirmer les détails de votre activité
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Rappels automatiques</p>
                <p className="text-sm text-gray-600">
                  Vous recevrez des rappels 7 jours puis 24h avant votre activité
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Besoin d'aide ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Téléphone</p>
                <a href="tel:0645913595" className="text-blue-600 hover:underline">
                  06 45 91 35 95
                </a>
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <a href="mailto:contact@stage-de-parapente.fr" className="text-blue-600 hover:underline">
                  contact@stage-de-parapente.fr
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Imprimer la confirmation
          </Button>
          <Button onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Chargement de votre confirmation...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}