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

  const getStageDeposit = (stage: any) => {
    return stage?.acomptePrice || Math.round((stage?.price || 0) * 0.33);
  };

  const getStageRemaining = (stage: any) => {
    const deposit = getStageDeposit(stage);
    return (stage?.price || 0) - deposit;
  };

  const calculateTotals = () => {
    let depositTotal = 0;
    let remainingTotal = 0;
    const futurePayments: {
      amount: number;
      date: string;
      description: string;
      participantName: string;
    }[] = [];

    order?.orderItems?.forEach((item: any) => {
      if (item.type === 'STAGE') {
        const deposit = getStageDeposit(item.stage);
        const remaining = getStageRemaining(item.stage);
        depositTotal += deposit;
        remainingTotal += remaining;

        if (remaining > 0) {
          const participantName = `${item.participantData?.firstName || ''} ${item.participantData?.lastName || ''}`.trim();
          futurePayments.push({
            amount: remaining,
            date: item.stage?.startDate,
            description: `Solde Stage ${item.stage?.type}`,
            participantName: participantName,
          });
        }
      } else {
        depositTotal += item.totalPrice;
      }
    });

    // Appliquer la réduction des bons cadeaux
    if (order?.discountAmount > 0) {
      depositTotal = Math.max(0, depositTotal - order.discountAmount);
    }

    return {
      depositTotal,
      originalDepositTotal: depositTotal + (order?.discountAmount || 0),
      remainingTotal,
      futurePayments,
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryPrice = (category: string) => {
    const prices: Record<string, number> = {
      AVENTURE: 110,
      DUREE: 150,
      LONGUE_DUREE: 185,
      ENFANT: 90,
      HIVER: 130,
    };
    return prices[category] || 110;
  };

  const formatTimeSlot = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + duration);

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
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
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto p-6 print:p-8 print:max-w-none">
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

        {/* Statut et informations générales */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Commande {order.orderNumber}</span>
              <span className="text-sm font-normal bg-green-100 text-green-800 px-3 py-1 rounded-full">
                ✓ Confirmée
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Date de commande</p>
                <p className="font-semibold">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Heure de paiement</p>
                <p className="font-semibold">{formatTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email de confirmation</p>
                <p className="font-semibold">{order.customerEmail}</p>
              </div>
            </div>

            {/* Informations client */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Informations client</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Nom complet</p>
                  <p className="font-medium">
                    {order.orderItems?.[0]?.participantData?.firstName || 'Non spécifié'} {order.orderItems?.[0]?.participantData?.lastName || ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Téléphone</p>
                  <p className="font-medium">{order.orderItems?.[0]?.participantData?.phone || 'Non spécifié'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{order.orderItems?.[0]?.participantData?.email || order.customerEmail || 'Non spécifié'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détail des réservations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Détail de votre commande</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.orderItems.map((item: any) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{getItemTitle(item)}</h4>
                      <p className="text-sm text-gray-600 font-medium">
                        Participant: {item.participantData.firstName} {item.participantData.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Prix total</p>
                      <p className="font-bold text-lg">{item.totalPrice}€</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif des paiements */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Récapitulatif des paiements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Montant payé aujourd'hui */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-green-700 uppercase font-semibold tracking-wide">
                    Payé aujourd'hui
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {calculateTotals().depositTotal.toFixed(2)}€
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Transaction effectuée le {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✓ Payé
                  </span>
                </div>
              </div>

              {/* Détail des acomptes */}
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">Détail des acomptes :</p>
                <div className="space-y-1">
                  {order.orderItems.map((item: any) => {
                    if (item.type === 'STAGE') {
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-green-700">
                            Acompte stage {item.stage?.type} - {item.participantData.firstName} {item.participantData.lastName}
                            <span className="text-xs text-green-600 block">
                              {formatDate(item.stage?.startDate)}
                            </span>
                          </span>
                          <span className="font-medium text-green-900">
                            {getStageDeposit(item.stage)}€
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-green-700">
                            {getItemTitle(item)}
                          </span>
                          <span className="font-medium text-green-900">
                            {item.totalPrice}€
                          </span>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>

              {/* Bons cadeaux appliqués */}
              {order.discountAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-green-300 bg-green-100 rounded p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-800 font-medium">Bons cadeaux appliqués</span>
                    <span className="font-semibold text-green-900">
                      -{order.discountAmount.toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Paiements à venir */}
            {calculateTotals().remainingTotal > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-orange-900 mb-3">
                  Règlements futurs
                </h4>
                <p className="text-sm text-orange-800 mb-1">
                  Solde total à venir : <strong>{calculateTotals().remainingTotal.toFixed(2)}€</strong>
                </p>
                <p className='text-xs text-orange-700 mb-3'>Les soldes de stages seront à régler sur place le jour du stage.</p>

                <div className="space-y-3">
                  {calculateTotals().futurePayments.map((payment, index) => (
                    <div key={index} className="text-sm border-l-2 border-orange-300 pl-3">
                      <p className="font-medium text-orange-900 mb-1">
                        {payment.participantName}
                      </p>
                      <div className="flex justify-between items-start">
                        <span className="text-orange-700">
                          {payment.description} - {formatDate(payment.date)}
                        </span>
                        <span className="font-semibold text-orange-900">
                          {payment.amount.toFixed(2)}€
                        </span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        À régler <span className='font-semibold underline'>sur place</span> le jour du stage
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total général */}
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-700 uppercase font-semibold tracking-wide">
                    Total de la commande
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {order.totalAmount.toFixed(2)}€
                  </p>
                  <p className="text-xs text-slate-600 mt-1">TVA incluse</p>
                </div>
              </div>
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
        <div className="flex gap-4 justify-center print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Imprimer la confirmation
          </Button>
          <Button onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </div>

        {/* Titre d'impression */}
        <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold text-gray-800">Confirmation de commande</h1>
          <p className="text-gray-600">Commande {order.orderNumber} - {formatDateTime(order.createdAt)}</p>
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