"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, Gift, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  id: string;
  type: string;
  quantity: number;
  participantData: any;
  stage?: any;
  bapteme?: any;
  giftCardAmount?: number;
  expiresAt?: string;
  createdAt?: string;
}

interface CartItemCardProps {
  item: CartItem;
  onRemove: () => void;
  onUpdate: () => void;
}

export function CartItemCard({ item, onRemove }: CartItemCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Only track expiration for STAGE and BAPTEME items
    if ((item.type === "STAGE" || item.type === "BAPTEME") && item.expiresAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const expiryTime = new Date(item.expiresAt!).getTime();
        const remaining = expiryTime - now;

        if (remaining <= 0) {
          setIsExpired(true);
          setTimeRemaining(0);
        } else {
          setIsExpired(false);
          setTimeRemaining(remaining);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [item.expiresAt, item.type]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getItemTitle = () => {
    switch (item.type) {
      case "STAGE":
        // Utiliser selectedStageType du participantData si disponible, sinon fallback sur stage.type
        const stageType = item.participantData?.selectedStageType || item.stage?.type;
        return `Stage ${stageType} - ${formatDate(item.stage?.startDate)}`;
      case "BAPTEME":
        return `Baptême ${item.participantData.selectedCategory} - ${formatDate(item.bapteme?.date)}`;
      case "GIFT_CARD":
        return `Bon cadeau ${item.giftCardAmount}€`;
      default:
        return "Article";
    }
  };

  const getItemPrice = () => {
    switch (item.type) {
      case "STAGE":
        return item.stage?.price || 0;
      case "BAPTEME":
        const basePrice = getCategoryPrice(
          item.participantData.selectedCategory
        );
        const videoPrice = item.participantData.hasVideo ? 25 : 0;
        return basePrice + videoPrice;
      case "GIFT_CARD":
        return item.giftCardAmount || 0;
      default:
        return 0;
    }
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

  const getIcon = () => {
    switch (item.type) {
      case "STAGE":
        return <Calendar className="w-6 h-6 text-blue-600" />;
      case "BAPTEME":
        return <Users className="w-6 h-6 text-blue-600" />;
      case "GIFT_CARD":
        return <Gift className="w-6 h-6 text-blue-600" />;
      default:
        return <Calendar className="w-6 h-6 text-blue-600" />;
    }
  };

  const shouldShowTimer =
    (item.type === "STAGE" || item.type === "BAPTEME") &&
    timeRemaining !== null;

  return (
    <div
      className={`flex gap-3 p-3 border rounded-lg transition-all ${isExpired ? "opacity-50 bg-red-50 border-red-200" : ""}`}
    >
      {/* Icône */}
      <div
        className={`w-16 h-16 rounded-lg flex items-center justify-center ${isExpired ? "bg-red-100" : "bg-blue-100"}`}
      >
        {getIcon()}
      </div>

      {/* Contenu */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm">{getItemTitle()}</h4>
          {isExpired && (
            <Badge variant="destructive" className="text-xs">
              Expiré
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Pour: {item.participantData.firstName} {item.participantData.lastName}
        </p>
        {item.type === "STAGE" && (
          <p className="text-xs text-gray-500 mt-1">
            {item.stage?.duration} jours
          </p>
        )}
        {item.type === "BAPTEME" && item.participantData.hasVideo && (
          <p className="text-xs text-green-600 mt-1">+ Option vidéo</p>
        )}

        {/* Timer d'expiration */}
        {shouldShowTimer && (
          <div
            className={`flex items-center gap-1 mt-2 text-xs ${
              isExpired ? "text-red-600" : "text-orange-600 font-semibold"
            }`}
          >
            <Clock className="w-3 h-3" />
            {isExpired ? (
              <span>Place expirée</span>
            ) : (
              <span>Place bloquée: {formatTimeRemaining(timeRemaining!)}</span>
            )}
          </div>
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
