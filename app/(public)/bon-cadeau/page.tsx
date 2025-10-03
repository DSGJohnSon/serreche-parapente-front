
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Gift, Star, ShoppingCart } from 'lucide-react';
import { SessionManager } from '@/lib/sessionManager';
import { useToast } from '@/components/ui/use-toast';

const GIFT_CARD_SUGGESTIONS = [
  {
    id: 'bapteme-aventure',
    label: 'Baptême Aventure',
    amount: 110,
    description: 'Parfait pour un premier vol découverte',
    popular: true,
  },
  {
    id: 'bapteme-duree',
    label: 'Baptême Durée',
    amount: 150,
    description: 'Vol plus long pour les amateurs de sensations',
  },
  {
    id: 'bapteme-longue-duree',
    label: 'Baptême Longue Durée',
    amount: 185,
    description: 'L\'expérience ultime en parapente',
  },
  {
    id: 'stage-initiation',
    label: 'Stage Initiation',
    amount: 700,
    description: 'Apprendre les bases du parapente',
    popular: true,
  },
  {
    id: 'stage-progression',
    label: 'Stage Progression',
    amount: 700,
    description: 'Perfectionnement technique',
  },
  {
    id: 'stage-autonomie',
    label: 'Stage Autonomie',
    amount: 1200,
    description: 'Formation complète sur 10 jours',
  },
  {
    id: 'custom',
    label: 'Montant libre',
    amount: 0,
    description: 'Choisissez le montant de votre choix',
    customAmount: true,
  },
];

interface GiftCardFormData {
  selectedAmount: number;
  customAmount?: number;
  recipientName: string;
  recipientEmail: string;
  buyerName: string;
  buyerEmail: string;
  personalMessage: string;
}

export default function BonCadeauPage() {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<GiftCardFormData>();
  const { toast } = useToast();
  
  const selectedAmount = watch('selectedAmount');
  const customAmount = watch('customAmount');

  const handleSuggestionSelect = (suggestion: typeof GIFT_CARD_SUGGESTIONS[0]) => {
    setSelectedSuggestion(suggestion.id);
    if (suggestion.customAmount) {
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
            recipientEmail: data.recipientEmail,
            personalMessage: data.personalMessage,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Bon cadeau ajouté !",
          description: "Le bon cadeau a été ajouté à votre panier",
        });
        
        // Déclencher un événement pour rafraîchir le panier
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
        // Rediriger vers le panier ou rester sur la page
        // window.location.href = '/checkout';
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <Gift className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold mb-2">Offrir un Bon Cadeau</h1>
          <p className="text-gray-600">Faites plaisir avec une expérience inoubliable en parapente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Sélection du montant */}
          <Card>
            <CardHeader>
              <CardTitle>Choisissez le montant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GIFT_CARD_SUGGESTIONS.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSuggestion === suggestion.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    {suggestion.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500">
                        <Star className="w-3 h-3 mr-1" />
                        Populaire
                      </Badge>
                    )}
                    
                    <div className="text-center">
                      <h3 className="font-semibold mb-2">{suggestion.label}</h3>
                      {suggestion.amount > 0 && (
                        <p className="text-2xl font-bold text-blue-600 mb-2">
                          {suggestion.amount}€
                        </p>
                      )}
                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                      
                      {suggestion.customAmount && selectedSuggestion === suggestion.id && (
                        <div className="mt-4">
                          <Label htmlFor="customAmount">Montant personnalisé</Label>
                          <Input
                            id="customAmount"
                            type="number"
                            min="50"
                            max="2000"
                            step="10"
                            {...register('customAmount', { 
                              required: selectedSuggestion === 'custom',
                              min: { value: 50, message: 'Montant minimum 50€' },
                              max: { value: 2000, message: 'Montant maximum 2000€' }
                            })}
                            placeholder="Montant en €"
                            className="mt-2"
                          />
                          {errors.customAmount && (
                            <p className="text-red-500 text-sm mt-1">{errors.customAmount.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Informations bénéficiaire */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du bénéficiaire</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div>
                <Label htmlFor="recipientEmail">Email du bénéficiaire *</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  {...register('recipientEmail', { required: 'Email requis' })}
                  placeholder="jean@exemple.com"
                />
                {errors.recipientEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.recipientEmail.message}</p>
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

          {/* Message personnalisé */}
          <Card>
            <CardHeader>
              <CardTitle>Message personnalisé (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register('personalMessage')}
                placeholder="Écrivez un message personnel qui accompagnera le bon cadeau..."
                rows={4}
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-2">Maximum 500 caractères</p>
            </CardContent>
          </Card>

          {/* Récapitulatif et validation */}
          <Card>
            <CardContent className="pt-6">
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
    </div>
  );
}