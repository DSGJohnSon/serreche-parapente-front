"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SessionManager } from "@/lib/sessionManager";
import { useToast } from "@/components/ui/use-toast";
import {
  ShoppingCart,
  CreditCard,
  User,
  MapPin,
  Mountain,
  Users,
  Gift,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditableParticipantDetails } from "@/components/checkout/EditableParticipantDetails";
import { VideoToggle } from "@/components/checkout/VideoToggle";
import { GiftCardDetails } from "@/components/checkout/GiftCardDetails";

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

// Composant Timer pour les réservations temporaires
function ReservationTimer({ cartItems, compact = false }: { cartItems: CartItem[], compact?: boolean }) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tempItems = cartItems.filter(item =>
      (item.type === 'STAGE' || item.type === 'BAPTEME') && item.expiresAt
    );

    if (tempItems.length === 0) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const earliestExpiry = tempItems.reduce((earliest, item) => {
        const itemExpiry = new Date(item.expiresAt!).getTime();
        return itemExpiry < earliest ? itemExpiry : earliest;
      }, new Date(tempItems[0].expiresAt!).getTime());

      const remaining = earliestExpiry - now;
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [cartItems]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeRemaining === null) return null;

  const isUrgent = timeRemaining < 300000; // Moins de 5 minutes

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="font-bold text-orange-900 text-sm mb-1">
              Places temporairement bloquées
            </p>
            <p className="text-xs text-orange-800">
              Finalisez votre paiement rapidement. Temps restant : <span className={`font-bold ${isUrgent ? 'text-red-700' : 'text-orange-900'}`}>{formatTimeRemaining(timeRemaining)}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-orange-100 rounded-full">
          <Clock className="w-8 h-8 text-orange-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-orange-900 text-lg mb-2">
            Places temporairement bloquées
          </h3>
          <p className="text-sm text-orange-800 mb-2">
            Vos places sont réservées temporairement. Finalisez votre paiement rapidement pour confirmer vos réservations.
          </p>
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-orange-800 flex items-center gap-2 border-l-2 border-orange-400 pl-3">
              Temps restant : <span className={`font-bold text-lg ${isUrgent ? 'text-red-700' : 'text-orange-900'}`}>{formatTimeRemaining(timeRemaining)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [expandedDetails, setExpandedDetails] = useState<
    Record<string, boolean>
  >({});
  const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "customer-info">("cart");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [isValidatingGiftCard, setIsValidatingGiftCard] = useState(false);
  const [appliedGiftCards, setAppliedGiftCards] = useState<{
    code: string;
    originalAmount: number;
    usedAmount: number;
    remainingAmount: number;
  }[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>();
  const { toast } = useToast();

  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = async () => {
    try {
      setLoading(true);
      const sessionId = SessionManager.getOrCreateSessionId();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/items`,
        {
          headers: {
            "x-session-id": sessionId,
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      );

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
      console.error("Erreur chargement panier:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement du panier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item: CartItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmRemoveItem = async () => {
    if (!itemToDelete) return;

    await removeItem(itemToDelete.id);
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const removeItem = async (itemId: string) => {
    try {
      const sessionId = SessionManager.getOrCreateSessionId();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/remove/${itemId}`,
        {
          method: "DELETE",
          headers: {
            "x-session-id": sessionId,
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      );

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
      console.error("Erreur suppression item:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const getItemTitle = (item: CartItem) => {
    switch (item.type) {
      case "STAGE":
        return `Stage ${item.stage?.type} - ${new Date(item.stage?.startDate).toLocaleDateString("fr-FR")}`;
      case "BAPTEME":
        return `Baptême ${item.participantData.selectedCategory} - ${new Date(item.bapteme?.date).toLocaleDateString("fr-FR")}`;
      case "GIFT_CARD":
        return `Bon cadeau ${item.giftCardAmount}€`;
      default:
        return "Article";
    }
  };

  const formatTimeSlot = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + duration);

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  };

  const getItemPrice = (item: CartItem) => {
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

  const getStageDeposit = (stage: any) => {
    // Utiliser le acomptePrice du stage s'il existe, sinon calculer 33%
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
    }[] = [];

    cartItems.forEach((item) => {
      if (item.type === "STAGE") {
        const deposit = getStageDeposit(item.stage);
        const remaining = getStageRemaining(item.stage);
        depositTotal += deposit;
        remainingTotal += remaining;

        if (remaining > 0) {
          futurePayments.push({
            amount: remaining,
            date: item.stage?.startDate,
            description: `Solde Stage ${item.stage?.type}`,
          });
        }
      } else {
        depositTotal += getItemPrice(item);
      }
    });

    // Appliquer les bons cadeaux si présents
    let finalDepositTotal = depositTotal;
    if (appliedGiftCards.length > 0) {
      const totalGiftCardAmount = appliedGiftCards.reduce(
        (sum, card) => sum + card.usedAmount,
        0
      );
      finalDepositTotal = Math.max(0, depositTotal - totalGiftCardAmount);
    }

    return {
      depositTotal: finalDepositTotal,
      originalDepositTotal: depositTotal,
      remainingTotal,
      futurePayments,
    };
  };

  const validateGiftCard = async () => {
    if (!giftCardCode.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code de bon cadeau",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si le code n'est pas déjà appliqué
    if (appliedGiftCards.some(card => card.code === giftCardCode)) {
      toast({
        title: "Bon cadeau déjà appliqué",
        description: "Ce bon cadeau est déjà utilisé dans cette commande",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingGiftCard(true);

    try {
      const sessionId = SessionManager.getOrCreateSessionId();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/giftcards/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
          body: JSON.stringify({
            code: giftCardCode,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.data.giftCard) {
        const giftCard = data.data.giftCard;
        
        // Calculer le montant restant à payer après les bons cadeaux déjà appliqués
        const currentTotal = calculateTotals().originalDepositTotal || calculateTotals().depositTotal;
        const alreadyDeducted = appliedGiftCards.reduce((sum, card) => sum + card.usedAmount, 0);
        const remainingToPay = currentTotal - alreadyDeducted;
        
        const usedAmount = Math.min(giftCard.remainingAmount, remainingToPay);
        const remainingAmount = giftCard.remainingAmount - usedAmount;

        setAppliedGiftCards([...appliedGiftCards, {
          code: giftCard.code,
          originalAmount: giftCard.remainingAmount,
          usedAmount,
          remainingAmount,
        }]);

        setGiftCardCode("");

        toast({
          title: "Bon cadeau appliqué !",
          description: `${usedAmount.toFixed(2)}€ seront déduits de votre commande`,
        });
      } else {
        toast({
          title: "Bon cadeau invalide",
          description:
            data.message || "Ce bon cadeau n'est pas valide ou a expiré",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur validation bon cadeau:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la validation du bon cadeau",
        variant: "destructive",
      });
    } finally {
      setIsValidatingGiftCard(false);
    }
  };

  const removeGiftCard = (codeToRemove: string) => {
    setAppliedGiftCards(appliedGiftCards.filter(card => card.code !== codeToRemove));
    toast({
      title: "Bon cadeau retiré",
      description: "Le bon cadeau a été retiré de votre commande",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
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

  const groupItemsByType = () => {
    const groups: Record<string, CartItem[]> = {
      STAGE: [],
      BAPTEME: [],
      GIFT_CARD: [],
    };

    cartItems.forEach((item) => {
      if (item.type === "STAGE") groups.STAGE.push(item);
      else if (item.type === "BAPTEME") groups.BAPTEME.push(item);
      else if (item.type === "GIFT_CARD") groups.GIFT_CARD.push(item);
    });

    return groups;
  };

  const getSectionInfo = (type: string) => {
    switch (type) {
      case "STAGE":
        return {
          title: "Stages",
          icon: Mountain,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "BAPTEME":
        return {
          title: "Baptêmes",
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "GIFT_CARD":
        return {
          title: "Bons Cadeaux",
          icon: Gift,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      default:
        return {
          title: "Articles",
          icon: ShoppingCart,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const toggleItemDetails = (itemId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsCreatingOrder(true);

    try {
      const sessionId = SessionManager.getOrCreateSessionId();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/orders/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
          body: JSON.stringify({
            customerEmail: data.email,
            appliedGiftCardCodes: appliedGiftCards.map(card => card.code),
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
        }
      );

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
          description:
            result.message || "Erreur lors de la création de la commande",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur création commande:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la commande",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Chargement de votre commande
          </h2>
          <p className="text-gray-500">Veuillez patienter...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            Votre panier est vide
          </h1>
          <p className="text-gray-600 mb-8">
            Découvrez nos expériences uniques en parapente
          </p>
          <Button
            onClick={() => (window.location.href = "/reserver")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Explorer les activités
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gray-800">
            {step === "cart"
              ? "Récapitulatif de votre panier"
              : "Vos informations"}
          </h1>
          <p className="text-gray-600 text-lg">
            {step === "cart"
              ? "Vérifiez votre commande avant de continuer"
              : "Dernière étape avant votre aventure en parapente"}
          </p>
        </div>

        {step === "cart" ? (
          // STEP 1: Cart Summary Only
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Bannière d'avertissement pour les places temporaires */}
            {cartItems.some(item => (item.type === 'STAGE' || item.type === 'BAPTEME') && item.expiresAt) && (
              <ReservationTimer cartItems={cartItems} />
            )}

            {/* Récapitulatif commande */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Votre commande
                    </h2>
                    <p className="text-sm text-gray-600">
                      {cartItems.length} article
                      {cartItems.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(groupItemsByType()).map(([type, items]) => {
                  if (items.length === 0) return null;

                  const sectionInfo = getSectionInfo(type);
                  const IconComponent = sectionInfo.icon;
                  const isCollapsed = collapsedSections[type];

                  return (
                    <div key={type} className="space-y-3">
                      {/* Section Header */}
                      <div
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${sectionInfo.bgColor} ${sectionInfo.borderColor}`}
                        onClick={() => toggleSection(type)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${sectionInfo.bgColor} border ${sectionInfo.borderColor}`}
                          >
                            <IconComponent
                              className={`w-4 h-4 ${sectionInfo.color}`}
                            />
                          </div>
                          <div>
                            <h3
                              className={`font-semibold text-sm ${sectionInfo.color}`}
                            >
                              {sectionInfo.title}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {items.length} article
                              {items.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${sectionInfo.color}`}
                          >
                            {items.reduce(
                              (total, item) => total + getItemPrice(item),
                              0
                            )}
                            €
                          </span>
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Section Items */}
                      {!isCollapsed && (
                        <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                          {items.map((item) => (
                            <>
                              <div key={item.id} className="space-y-2">
                                <div className="p-3 bg-gray-100 rounded-lg transition-all">
                                  <div
                                    className={`flex justify-between items-start ${
                                      item.type === "BAPTEME" ||
                                      item.type === "STAGE" ||
                                      item.type === "GIFT_CARD"
                                        ? "cursor-pointer"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      if (
                                        item.type === "BAPTEME" ||
                                        item.type === "STAGE" ||
                                        item.type === "GIFT_CARD"
                                      ) {
                                        toggleItemDetails(item.id);
                                      }
                                    }}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-sm text-gray-800">
                                            {getItemTitle(item)}
                                          </h4>
                                          <p className="text-xs text-gray-600">
                                            Pour:{" "}
                                            {item.participantData.firstName}{" "}
                                            {item.participantData.lastName}
                                          </p>
                                          {item.type === "BAPTEME" &&
                                            item.bapteme?.startTime &&
                                            item.bapteme?.duration && (
                                              <p className="text-xs text-blue-600 font-medium">
                                                🕐{" "}
                                                {formatTimeSlot(
                                                  item.bapteme.startTime,
                                                  item.bapteme.duration
                                                )}
                                              </p>
                                            )}
                                          {(item.type === "BAPTEME" ||
                                            item.type === "STAGE") && (
                                            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                              {expandedDetails[item.id]
                                                ? "Masquer"
                                                : "Voir"}{" "}
                                              les détails du participant
                                              <ChevronDown
                                                className={`w-3 h-3 transition-transform ${expandedDetails[item.id] ? "rotate-180" : ""}`}
                                              />
                                            </p>
                                          )}
                                          {item.type === "GIFT_CARD" && (
                                            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                              {expandedDetails[item.id]
                                                ? "Masquer"
                                                : "Voir"}{" "}
                                              les détails du bon cadeau
                                              <ChevronDown
                                                className={`w-3 h-3 transition-transform ${expandedDetails[item.id] ? "rotate-180" : ""}`}
                                              />
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      {item.type === "BAPTEME" && (
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500">
                                            Baptême:{" "}
                                            {getCategoryPrice(
                                              item.participantData
                                                .selectedCategory
                                            )}
                                            €
                                          </p>
                                          {item.participantData.hasVideo && (
                                            <p className="text-xs text-green-600">
                                              + Vidéo: 25€
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {item.type === "STAGE" && (
                                        <div className="text-right space-y-1">
                                          {item.stage?.allTimeHighPrice &&
                                            item.stage.price <
                                              item.stage.allTimeHighPrice && (
                                              <Badge
                                                variant="destructive"
                                                className="text-xs mb-1"
                                              >
                                                PROMO
                                              </Badge>
                                            )}
                                          {item.stage?.allTimeHighPrice &&
                                            item.stage.price <
                                              item.stage.allTimeHighPrice && (
                                              <p className="text-xs text-gray-400 line-through">
                                                {item.stage.allTimeHighPrice}€
                                              </p>
                                            )}
                                          <p className="text-xs text-gray-500">
                                            Prix total: {item.stage?.price}€
                                          </p>
                                          <p className="text-xs text-orange-600 font-medium">
                                            Acompte:{" "}
                                            {getStageDeposit(item.stage)}€
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Solde:{" "}
                                            {getStageRemaining(item.stage)}€
                                          </p>
                                          <p className="text-xs text-gray-400">
                                            à régler le{" "}
                                            {formatDate(item.stage?.startDate)}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-3">
                                        <p className="font-bold text-sm text-gray-800">
                                          {item.type === "STAGE"
                                            ? getStageDeposit(item.stage)
                                            : getItemPrice(item)}
                                          €
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(item);
                                          }}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto"
                                          title="Supprimer cet article"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Option vidéo pour les baptêmes - Toujours visible */}
                                  {item.type === "BAPTEME" && (
                                    <div
                                      className="mt-3 pt-3 border-t border-gray-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <VideoToggle
                                        itemId={item.id}
                                        hasVideo={
                                          item.participantData.hasVideo || false
                                        }
                                        onUpdate={loadCartItems}
                                        participantData={item.participantData}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Détails du participant pour baptêmes et stages - Affichés sur demande */}
                                {(item.type === "BAPTEME" ||
                                  item.type === "STAGE") &&
                                  expandedDetails[item.id] && (
                                    <div className="ml-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                      <EditableParticipantDetails
                                        participantData={item.participantData}
                                        type={item.type as "BAPTEME" | "STAGE"}
                                        itemId={item.id}
                                        onUpdate={loadCartItems}
                                      />
                                    </div>
                                  )}

                                {/* Détails du bon cadeau - Affichés sur demande */}
                                {item.type === "GIFT_CARD" &&
                                  expandedDetails[item.id] && (
                                    <div className="ml-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                      <GiftCardDetails
                                        participantData={item.participantData}
                                        itemId={item.id}
                                        onUpdate={loadCartItems}
                                      />
                                    </div>
                                  )}
                              </div>
                              {items.indexOf(item) < items.length - 1 && (
                                <Separator />
                              )}
                            </>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-gray-200 space-y-4">
                  {/* Prix total - légèrement mis en valeur */}
                  <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wide">
                          Prix total
                        </p>
                        <p className="text-xl font-bold text-slate-800">
                          {totalAmount.toFixed(2)}€
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">Tous produits confondus • TVA incluse</p>
                      </div>
                    </div>
                  </div>

                  {/* Détail des paiements */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <h3 className="font-semibold text-sm text-slate-800 mb-3">
                      Détail des paiements
                    </h3>

                    {/* À payer aujourd'hui */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-slate-700">
                          À payer aujourd'hui
                        </span>
                        <span className="text-slate-800">
                          {(calculateTotals().originalDepositTotal || calculateTotals().depositTotal).toFixed(2)}€
                        </span>
                      </div>
                    </div>

                    {/* Paiements futurs */}
                    {calculateTotals().remainingTotal > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-700">
                            Règlements futurs
                          </p>
                          {calculateTotals().futurePayments.map(
                            (payment, index) => (
                              <div
                                key={index}
                                className="flex justify-between text-xs pl-3"
                              >
                                <span className="text-slate-600">
                                  {payment.description}
                                  <span className="block text-slate-500 mt-0.5">
                                    À régler sur place le <span className="underline">{formatDate(payment.date)}</span>
                                  </span>
                                </span>
                                <span className="font-medium text-slate-700">
                                  {payment.amount.toFixed(2)}€
                                </span>
                              </div>
                            )
                          )}
                          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-300">
                            <span className="text-slate-700">Total des paiements à venir</span>
                            <span className="text-slate-800">
                              {calculateTotals().remainingTotal.toFixed(2)}€
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Prix total à régler aujourd'hui - un peu plus légèrement mis en valeur */}
                  <div className="bg-blue-100 rounded-lg p-4 border border-blue-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide">
                          à régler aujourd'hui
                        </p>
                        <p className="text-xl font-bold text-blue-600">
                          {(calculateTotals().originalDepositTotal || calculateTotals().depositTotal).toFixed(2)}€
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">Tous produits confondus • TVA incluse</p>
                      </div>
                    </div>
                  </div>

                {/* Info bon cadeau */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <Gift className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">
                      Vous avez un bon cadeau ?
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Vous pourrez l'appliquer à l'étape suivante pour réduire
                      le montant de votre commande.
                    </p>
                  </div>
                </div>

                {/* Bouton de validation du panier */}
                <div className="mt-6">
                  <Button
                    onClick={() => setStep("customer-info")}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                    size="lg"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Je valide mon panier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // STEP 2: Customer Information Form
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Récapitulatif commande - Version compacte */}
            <div className="space-y-6">
              {/* Bannière d'avertissement pour les places temporaires */}
              {cartItems.some(item => (item.type === 'STAGE' || item.type === 'BAPTEME') && item.expiresAt) && (
                <ReservationTimer cartItems={cartItems} compact />
              )}

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm h-fit">
                <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Récapitulatif
                    </h2>
                    <p className="text-sm text-gray-600">
                      {cartItems.length} article
                      {cartItems.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prix total - légèrement mis en valeur */}
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">
                        Prix total
                      </p>
                      <p className="text-xl font-bold text-slate-800">
                        {totalAmount.toFixed(2)}€
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Tous produits confondus • TVA incluse</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Détail des paiements */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-800 mb-3">
                    Détail des paiements
                  </h3>

                  {/* À payer aujourd'hui */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">
                        À payer aujourd'hui
                      </p>
                      
                      <div className="pl-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Prix à régler</span>
                          <span className="text-slate-800">
                            {(calculateTotals().originalDepositTotal || calculateTotals().depositTotal).toFixed(2)}€
                          </span>
                        </div>

                        {/* Section bon cadeau */}
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-green-600" />
                            <h4 className="font-medium text-xs text-green-800">
                              Appliquer un bon cadeau
                            </h4>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={giftCardCode}
                              onChange={(e) =>
                                setGiftCardCode(e.target.value.toUpperCase())
                              }
                              placeholder="SCP-XXXXX-XXXX"
                              className="flex-1 h-8 text-sm"
                              disabled={isValidatingGiftCard}
                            />
                            <Button
                              onClick={validateGiftCard}
                              disabled={
                                isValidatingGiftCard || !giftCardCode.trim()
                              }
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-8"
                            >
                              {isValidatingGiftCard ? "..." : "Appliquer"}
                            </Button>
                          </div>
                          <p className="text-xs text-green-700">
                            {appliedGiftCards.length > 0
                              ? "Vous pouvez ajouter plusieurs bons cadeaux"
                              : "Entrez votre code pour réduire le montant à payer"}
                          </p>
                        </div>

                        {/* Bons cadeaux appliqués */}
                        {appliedGiftCards.length > 0 && (
                          <div className="space-y-2">
                            {appliedGiftCards.map((giftCard) => (
                              <div key={giftCard.code} className="bg-green-50 rounded p-2 border border-green-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-green-800 flex items-center gap-1">
                                    <Gift className="w-3 h-3" />
                                    Bon cadeau: {giftCard.code}
                                  </span>
                                  <Button
                                    onClick={() => removeGiftCard(giftCard.code)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-auto p-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-green-700">Montant déduit:</span>
                                  <span className="font-semibold text-green-700">
                                    -{giftCard.usedAmount.toFixed(2)}€
                                  </span>
                                </div>
                                {giftCard.remainingAmount > 0 && (
                                  <div className="flex justify-between text-xs mt-1 pt-1 border-t border-green-200">
                                    <span className="text-green-600">Reste sur le bon:</span>
                                    <span className="font-semibold text-green-600">
                                      {giftCard.remainingAmount.toFixed(2)}€
                                    </span>
                                  </div>
                                )}
                                {giftCard.remainingAmount === 0 && (
                                  <p className="text-xs text-green-600 font-medium mt-1">
                                    ✓ Bon cadeau entièrement utilisé
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Total à payer aujourd'hui - MIS EN VALEUR */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-300 mt-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-blue-700 uppercase tracking-wide">
                                {appliedGiftCards.length > 0 ? "Reste à payer aujourd'hui" : "À payer aujourd'hui"}
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                {calculateTotals().depositTotal.toFixed(2)}€
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Paiements futurs */}
                  {calculateTotals().remainingTotal > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-700">
                          Règlements futurs
                        </p>
                        <div className="pl-3 space-y-2">
                          {calculateTotals().futurePayments.map(
                            (payment, index) => (
                              <div
                                key={index}
                                className="flex justify-between text-xs"
                              >
                                <span className="text-slate-600">
                                  {payment.description}
                                  <span className="block text-slate-500 mt-0.5">
                                    À régler sur place le {formatDate(payment.date)}
                                  </span>
                                </span>
                                <span className="font-medium text-slate-700">
                                  {payment.amount.toFixed(2)}€
                                </span>
                              </div>
                            )
                          )}
                          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-300">
                            <span className="text-slate-700">Total des paiements à venir</span>
                            <span className="text-slate-800">
                              {calculateTotals().remainingTotal.toFixed(2)}€
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setStep("cart")}
                  className="w-full"
                  size="sm"
                >
                  Modifier mon panier
                </Button>
              </CardContent>
              </Card>
            </div>

            {/* Formulaire de commande */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Vos informations
                    </h2>
                    <p className="text-sm text-gray-600">
                      Renseignez vos coordonnées pour la réservation
                    </p>
                  </div>
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
                          {...register("firstName", {
                            required: "Prénom requis",
                          })}
                          placeholder="Jean"
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="lastName">Nom *</Label>
                        <Input
                          id="lastName"
                          {...register("lastName", { required: "Nom requis" })}
                          placeholder="Dupont"
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email", { required: "Email requis" })}
                        placeholder="jean.dupont@email.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        {...register("phone", { required: "Téléphone requis" })}
                        placeholder="06 12 34 56 78"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.phone.message}
                        </p>
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
                        {...register("address", {
                          required: "Adresse requise",
                        })}
                        placeholder="123 Rue de la Paix"
                      />
                      {errors.address && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.address.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalCode">Code postal *</Label>
                        <Input
                          id="postalCode"
                          {...register("postalCode", {
                            required: "Code postal requis",
                          })}
                          placeholder="75001"
                        />
                        {errors.postalCode && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.postalCode.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="city">Ville *</Label>
                        <Input
                          id="city"
                          {...register("city", { required: "Ville requise" })}
                          placeholder="Paris"
                        />
                        {errors.city && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.city.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="country">Pays *</Label>
                      <Input
                        id="country"
                        {...register("country", { required: "Pays requis" })}
                        placeholder="France"
                        defaultValue="France"
                      />
                      {errors.country && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.country.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bouton de paiement */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                    size="lg"
                    disabled={isCreatingOrder}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isCreatingOrder ? "Création de la commande..." : "Payer"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="pt-4">
              {itemToDelete && (
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Êtes-vous sûr de vouloir supprimer cet article de votre
                    panier ?
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-semibold text-sm text-gray-800">
                      {getItemTitle(itemToDelete)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Pour: {itemToDelete.participantData.firstName}{" "}
                      {itemToDelete.participantData.lastName}
                    </p>
                    {itemToDelete.type === "BAPTEME" &&
                      itemToDelete.bapteme?.startTime &&
                      itemToDelete.bapteme?.duration && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          🕐{" "}
                          {formatTimeSlot(
                            itemToDelete.bapteme.startTime,
                            itemToDelete.bapteme.duration
                          )}
                        </p>
                      )}
                    {itemToDelete.type === "BAPTEME" &&
                      itemToDelete.participantData.hasVideo && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          + Option vidéo
                        </p>
                      )}
                    <p className="text-sm font-bold text-gray-800 mt-2">
                      {getItemPrice(itemToDelete)}€
                    </p>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveItem}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
