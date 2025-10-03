'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SessionManager } from '@/lib/sessionManager';
import { useToast } from '@/components/ui/use-toast';
import { CartItemCard } from './CartItemCard';

interface CartItem {
  id: string;
  type: string;
  quantity: number;
  participantData: any;
  stage?: any;
  bapteme?: any;
  giftCardAmount?: number;
}

export function CartSidebar() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCartItems();
    
    // Écouter les événements de mise à jour du panier
    const handleCartUpdate = () => {
      loadCartItems();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
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
      }
    } catch (error) {
      console.error('Erreur chargement panier:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const sessionId = SessionManager.getOrCreateSessionId();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          'x-session-id': sessionId,
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Article supprimé",
          description: "L'article a été retiré de votre panier",
        });
        loadCartItems(); // Recharger le panier
      } else {
        toast({
          title: "Erreur",
          description: data.message || "Erreur lors de la suppression",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur suppression item:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    try {
      const sessionId = SessionManager.getOrCreateSessionId();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'x-session-id': sessionId,
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Panier vidé",
          description: "Tous les articles ont été supprimés",
        });
        loadCartItems();
      }
    } catch (error) {
      console.error('Erreur vidage panier:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="w-4 h-4" />
          {cartItems.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {cartItems.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Votre panier ({cartItems.length})</span>
            {cartItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Items du panier */}
          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-8 h-8 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Chargement...</p>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Votre panier est vide</p>
                <p className="text-sm mt-2">Ajoutez des stages ou baptêmes pour commencer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    onUpdate={loadCartItems}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer avec total et checkout */}
          {cartItems.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>{totalAmount.toFixed(2)}€</span>
              </div>
              
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/checkout';
                }}
              >
                Procéder au paiement
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}