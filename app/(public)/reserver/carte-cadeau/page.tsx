'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Gift, Star, ShoppingCart, ArrowLeft, Plane, Plus } from 'lucide-react';
import { SessionManager } from '@/lib/sessionManager';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import Image from 'next/image';
import { MdCardGiftcard } from 'react-icons/md';

const BAPTEME_GIFT_CARDS = [
  {
    id: 'bapteme-aventure',
    label: 'Baptême Aventure',
    amount: 110,
    description: 'Vivez votre baptême aérien : liberté, frissons et vue imprenable',
    duration: '15 min',
    image: '/placeholder/hero.webp',
    popular: true,
  },
  {
    id: 'bapteme-duree',
    label: 'Baptême Durée',
    amount: 150,
    description: 'Plus long, plus haut, plus fort. Adrénaline garantie',
    duration: '30 min',
    image: '/placeholder/hero.webp',
  },
  {
    id: 'bapteme-longue-duree',
    label: 'Baptême Longue Durée',
    amount: 185,
    description: 'Plus on reste dans le ciel, plus le plaisir grandit',
    duration: '45 min',
    image: '/placeholder/hero.webp',
  },
  {
    id: 'bapteme-enfant',
    label: 'Baptême Enfant',
    amount: 90,
    description: 'Pour les p\'tits loups dans l\'aventure et la montagne',
    duration: '10 min',
    image: '/placeholder/hero.webp',
  },
  {
    id: 'bapteme-hiver',
    label: 'Baptême Hiver',
    amount: 130,
    description: 'Les sommets enneigés à perte de vue, en toute liberté',
    duration: 'Variable',
    image: '/placeholder/hero.webp',
  },
];

const CUSTOM_AMOUNT_CARD = {
  id: 'custom',
  label: 'Montant libre',
  amount: 0,
  description: 'Choisissez le montant de votre choix',
  customAmount: true,
};

interface GiftCardFormData {
  selectedAmount: number;
  customAmount?: number;
  recipientName: string;
  recipientEmail: string;
  buyerName: string;
  buyerEmail: string;
  personalMessage: string;
}

export default function BonCadeauReservationPage() {
  const router = useRouter();
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [notifyRecipient, setNotifyRecipient] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<GiftCardFormData>();
  const { toast } = useToast();

  const selectedAmount = watch('selectedAmount');
  const customAmount = watch('customAmount');

  const handleSuggestionSelect = (suggestion: typeof BAPTEME_GIFT_CARDS[0] | typeof CUSTOM_AMOUNT_CARD) => {
    setSelectedSuggestion(suggestion.id);
    if ('customAmount' in suggestion && suggestion.customAmount) {
      setValue('selectedAmount', 0);
    } else {
      setValue('selectedAmount', suggestion.amount);
      setValue('customAmount', undefined);
    }
  };

  const onSubmit = async (data: GiftCardFormData) => {
    const finalAmount = selectedSuggestion === 'custom' ? data.customAmount : data.selectedAmount;

    if (!finalAmount || finalAmount < 50) {
      toast({
        title: "Erreur",
        description: "Le montant minimum est de 50€",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const sessionId = SessionManager.getOrCreateSessionId();

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({
          type: 'GIFT_CARD',
          giftCardAmount: Number(finalAmount),
          participantData: {
            firstName: data.buyerName.split(' ')[0] || data.buyerName,
            lastName: data.buyerName.split(' ')[1] || '',
            email: data.buyerEmail,
            phone: '', // Sera demandé au checkout
            weight: 0,
            height: 0,
            // Données spécifiques bon cadeau
            recipientName: data.recipientName,
            recipientEmail: notifyRecipient ? data.recipientEmail : '',
            notifyRecipient: notifyRecipient,
            personalMessage: data.personalMessage,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Déclencher un événement pour rafraîchir le panier
        window.dispatchEvent(new CustomEvent('cartUpdated'));

        // Afficher la popup de confirmation
        setShowSuccessDialog(true);
      } else {
        toast({
          title: "Erreur",
          description: result.message || 'Erreur lors de l\'ajout du bon cadeau',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur ajout bon cadeau:', error);
      toast({
        title: "Erreur",
        description: 'Erreur lors de l\'ajout du bon cadeau',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 pt-12">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/reserver">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">
              Offrir un Bon Cadeau
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <MdCardGiftcard className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h2 className="text-3xl font-bold mb-2">Offrir une Carte Cadeau</h2>
          <p className="text-gray-600">Offrez à vos proches le choix libre sur notre boutique Serre Chevalier Parapente !</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Bon cadeau à valeur libre */}
          <Card className='pt-6'>
            <CardContent>
              <div
                className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedSuggestion === CUSTOM_AMOUNT_CARD.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSuggestionSelect(CUSTOM_AMOUNT_CARD)}
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Bon cadeau à valeur libre</h3>

                  {selectedSuggestion === CUSTOM_AMOUNT_CARD.id && (
                    <div className="max-w-xs mx-auto">
                      <Label htmlFor="customAmount" className='text-gray-600 block mb-4'>Montant personnalisé (minimum 20€)</Label>
                      <Input
                        id="customAmount"
                        type="number"
                        min="20"
                        max="2000"
                        step="10"
                        {...register('customAmount', {
                          required: selectedSuggestion === 'custom',
                          min: { value: 50, message: 'Montant minimum 50€' },
                          max: { value: 2000, message: 'Montant maximum 2000€' }
                        })}
                        placeholder="Montant en €"
                      />
                      {errors.customAmount && (
                        <p className="text-red-500 text-sm mt-1">{errors.customAmount.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations bénéficiaire */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du bénéficiaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">Nom du bénéficiaire *</Label>
                  <Input
                    id="recipientName"
                    {...register('recipientName', { required: 'Nom requis' })}
                    placeholder="Jean Dupont"
                  />
                  {errors.recipientName && (
                    <p className="text-red-500 text-sm mt-1">{errors.recipientName.message}</p>
                  )}
                </div>

                {notifyRecipient && (
                  <div>
                    <Label htmlFor="recipientEmail">Email du bénéficiaire *</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      {...register('recipientEmail', {
                        required: notifyRecipient ? 'Email requis' : false,
                        pattern: notifyRecipient ? {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email invalide'
                        } : undefined
                      })}
                      placeholder="jean@exemple.com"
                    />
                    {errors.recipientEmail && (
                      <p className="text-red-500 text-sm mt-1">{errors.recipientEmail.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Case à cocher pour prévenir le bénéficiaire */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="notifyRecipient"
                    checked={notifyRecipient}
                    onChange={(e) => {
                      setNotifyRecipient(e.target.checked);
                      if (!e.target.checked) {
                        setValue('recipientEmail', '');
                        setValue('personalMessage', '');
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="notifyRecipient" className="cursor-pointer font-medium text-slate-700">
                      Je souhaite prévenir le bénéficiaire par email
                    </Label>
                    <p className="text-sm text-slate-600 mt-1">
                      {notifyRecipient
                        ? "Le bénéficiaire recevra un email avec son bon cadeau"
                        : "Vous recevrez le bon cadeau et pourrez l'offrir vous-même"}
                    </p>
                  </div>
                </div>

                {/* Message personnalisé - Affiché si notification activée */}
                {notifyRecipient && (
                  <div className="pt-2 border-t border-slate-300">
                    <Label htmlFor="personalMessage" className="text-sm font-medium text-slate-700">
                      Message personnalisé (optionnel)
                    </Label>
                    <Textarea
                      id="personalMessage"
                      {...register('personalMessage')}
                      placeholder="Ce message sera inclus dans l'email envoyé au bénéficiaire"
                      rows={4}
                      maxLength={2000}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum 2000 caractères</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations acheteur */}
          <Card>
            <CardHeader>
              <CardTitle>Vos informations</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyerName">Votre nom *</Label>
                <Input
                  id="buyerName"
                  {...register('buyerName', { required: 'Nom requis' })}
                  placeholder="Marie Martin"
                />
                {errors.buyerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.buyerName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="buyerEmail">Votre email *</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  {...register('buyerEmail', { required: 'Email requis' })}
                  placeholder="marie@exemple.com"
                />
                {errors.buyerEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.buyerEmail.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Récapitulatif et validation */}
          <Card>
            <CardContent className="pt-6">
              {/* Informations importantes */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <MdCardGiftcard className="w-5 h-5" />
                  Informations importantes
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>La carte cadeau sera <strong>valable un an</strong> à compter de la date d'achat.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>La carte cadeau pourra être utilisée <strong>pour tous les produits présents sur le site</strong>. Le bénéficiaire devra renseigner son code cadeau juste avant le paiement.</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-lg">Total à payer :</span>
                <span className="text-2xl font-bold text-blue-600">
                  {selectedSuggestion === 'custom' ? customAmount || 0 : selectedAmount || 0}€
                </span>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !selectedSuggestion}
                className="w-full gap-2"
                size="lg"
              >
                <ShoppingCart className="w-4 h-4" />
                {isLoading ? 'Ajout...' : 'Ajouter au panier'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* Dialog de confirmation après ajout au panier */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          setShowSuccessDialog(open);
          // Si la popup est fermée sans action, rediriger vers /reserver
          if (!open) {
            router.push('/reserver');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Bon cadeau ajouté !
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre bon cadeau a été ajouté avec succès à votre panier.
              <br />
              Que souhaitez-vous faire ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push('/reserver');
              }}
              className="w-full gap-2"
              size="lg"
            >
              <Plus className="w-4 h-4" />
              Je continue mes achats
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push('/checkout');
              }}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <ShoppingCart className="w-4 h-4" />
              Voir mon panier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}