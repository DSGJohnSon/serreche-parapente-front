'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Trash2, Gift, Users } from 'lucide-react';

interface CartItem {
  id: string;
  type: string;
  quantity: number;
  participantData: any;
  stage?: any;
  bapteme?: any;
  giftCardAmount?: number;
}

interface CartItemCardProps {
  item: CartItem;
  onRemove: () => void;
  onUpdate: () => void;
}

export function CartItemCard({ item, onRemove }: CartItemCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getItemTitle = () => {
    switch (item.type) {
      case 'STAGE':
        return `Stage ${item.stage?.type} - ${formatDate(item.stage?.startDate)}`;
      case 'BAPTEME':
        return `Baptême ${item.participantData.selectedCategory} - ${formatDate(item.bapteme?.date)}`;
      case 'GIFT_CARD':
        return `Bon cadeau ${item.giftCardAmount}€`;
      default:
        return 'Article';
    }
  };

  const getItemPrice = () => {
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

  const getIcon = () => {
    switch (item.type) {
      case 'STAGE':
        return <Calendar className="w-6 h-6 text-blue-600" />;
      case 'BAPTEME':
        return <Users className="w-6 h-6 text-blue-600" />;
      case 'GIFT_CARD':
        return <Gift className="w-6 h-6 text-blue-600" />;
      default:
        return <Calendar className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className="flex gap-3 p-3 border rounded-lg">
      {/* Icône */}
      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
        {getIcon()}
      </div>

      {/* Contenu */}
      <div className="flex-1">
        <h4 className="font-semibold text-sm">{getItemTitle()}</h4>
        <p className="text-xs text-gray-600 mt-1">
          Pour: {item.participantData.firstName} {item.participantData.lastName}
        </p>
        {item.type === 'STAGE' && (
          <p className="text-xs text-gray-500 mt-1">
            {item.stage?.duration} jours
          </p>
        )}
        {item.type === 'BAPTEME' && item.participantData.hasVideo && (
          <p className="text-xs text-green-600 mt-1">
            + Option vidéo
          </p>
        )}
        <p className="font-semibold text-sm mt-2">{getItemPrice()}€</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}