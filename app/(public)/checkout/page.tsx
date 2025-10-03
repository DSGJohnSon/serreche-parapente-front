'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SessionManager } from '@/lib/sessionManager';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, CreditCard, User, MapPin } from 'lucide-react';

interface CartItem {
  id: string;
  type: string;
  quantity: number;
  participantData: any;
  stage?: any;
  bapteme?: any;
  giftCardAmount?: number;
}

interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  giftCardCode?: string;
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormData>();
  const { toast } = useToast();

  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = async () => {
    try {
      setLoading(true);
      const sessionId = SessionManager.getOrCreateSessionId();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/items`, {
        headers: {
          'x-session-id': sessionId,
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setCartItems(data.data.items);
        setTotalAmount(data.data.totalAmount);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger votre panier",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur chargement panier:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement du panier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getItemTitle = (item: CartItem) => {
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

  const getItemPrice = (item: CartItem) => {
    switch (item.type) {
      case 'STAGE':
        return item.stage?.price || 0;
      case 'BAPTEME':
        const basePrice = getCategoryPrice(item.participantData.selectedCategory);
        const videoPrice = item.participantData.hasVideo ? 25 : 0;
        return basePrice + videoPrice;
      case 'GIFT_CARD':
        return item.giftCardAmount || 0;
      default:
        return 0;
    }
  };

  const getCategoryPrice = (category: string) => {
    const prices: Record<string, number> = {
      'AVENTURE': 110,
      'DUREE': 150,
      'LONGUE_DUREE': 185,
      'ENFANT': 90,
      'HIVER': 130,
    };
    return prices[category] || 110;
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsCreatingOrder(true);
    
    try {
      const sessionId = SessionManager.getOrCreateSessionId();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({
          customerEmail: data.email,
          appliedGiftCardCode: data.giftCardCode,
          customerData: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            address: data.address,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Commande créée !",
          description: `Commande ${result.data.order.orderNumber} créée avec succès`,
        });
        
        // Rediriger vers la page de paiement avec le client secret
        const clientSecret = result.data.paymentIntent.clientSecret;
        window.location.href = `/checkout/payment?order=${result.data.order.id}&client_secret=${clientSecret}`;
        
      } else {
        toast({
          title: "Erreur",
          description: result.message || 'Erreur lors de la création de la commande',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur création commande:', error);
      toast({
        title: "Erreur",
        description: 'Erreur lors de la création de la commande',
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Votre panier est vide</h1>
          <p className="text-gray-600 mb-4">Ajoutez des stages ou baptêmes pour continuer</p>
          <Button onClick={() => window.history.back()}>
            Retour aux réservations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-center">Finaliser votre réservation</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Récapitulatif commande */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Récapitulatif de votre commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{getItemTitle(item)}</h4>
                    <p className="text-xs text-gray-600">
                      Pour: {item.participantData.firstName} {item.participantData.lastName}
                    </p>
                    {item.type === 'BAPTEME' && item.participantData.hasVideo && (
                      <p className="text-xs text-green-600">+ Option vidéo</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{getItemPrice(item)}€</p>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>{totalAmount.toFixed(2)}€</span>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de commande */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Vos informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Informations contact */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Contact
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        {...register('firstName', { required: 'Prénom requis' })}
                        placeholder="Jean"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        {...register('lastName', { required: 'Nom requis' })}
                        placeholder="Dupont"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email', { required: 'Email requis' })}
                      placeholder="jean.dupont@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      {...register('phone', { required: 'Téléphone requis' })}
                      placeholder="06 12 34 56 78"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Adresse */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse
                  </h3>

                  <div>
                    <Label htmlFor="address">Adresse *</Label>
                    <Input
                      id="address"
                      {...register('address', { required: 'Adresse requise' })}
                      placeholder="123 Rue de la Paix"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Code postal *</Label>
                      <Input
                        id="postalCode"
                        {...register('postalCode', { required: 'Code postal requis' })}
                        placeholder="75001"
                      />
                      {errors.postalCode && (
                        <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="city">Ville *</Label>
                      <Input
                        id="city"
                        {...register('city', { required: 'Ville requise' })}
                        placeholder="Paris"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Pays *</Label>
                    <Input
                      id="country"
                      {...register('country', { required: 'Pays requis' })}
                      placeholder="France"
                      defaultValue="France"
                    />
                    {errors.country && (
                      <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Bon cadeau */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Bon cadeau (optionnel)</h3>
                  <div>
                    <Label htmlFor="giftCardCode">Code bon cadeau</Label>
                    <Input
                      id="giftCardCode"
                      {...register('giftCardCode')}
                      placeholder="SCP-XXXXX-XXXX"
                    />
                  </div>
                </div>

                {/* Bouton de validation */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isCreatingOrder}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isCreatingOrder ? 'Création...' : 'Créer la commande et payer'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}