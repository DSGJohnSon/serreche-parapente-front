"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, ChevronRight, ArrowLeft, ShoppingCart, Plus } from "lucide-react";
import { useAvailability } from "@/hooks/useAvailability";
import { SessionManager } from "@/lib/sessionManager";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface BaptemeCategory {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Bapteme {
  id: string;
  date: string;
  duration: number;
  places: number;
  categories: string[];
}

interface ParticipantFormData {
  participantType: "self" | "other";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  weight: number;
  height: number;
  birthDate?: string;
}

const BAPTEME_CATEGORIES: BaptemeCategory[] = [
  {
    id: "AVENTURE",
    name: "Baptême Aventure",
    price: 110,
    description:
      "Vivez votre baptême aérien : liberté, frissons et vue imprenable. 15 minutes de vol.",
  },
  {
    id: "DUREE",
    name: "Baptême Durée",
    price: 150,
    description:
      "Plus long, plus haut, plus fort. Adrénaline garantie. 30 minutes de vol.",
  },
  {
    id: "LONGUE_DUREE",
    name: "Baptême Longue Durée",
    price: 185,
    description:
      "Plus on reste dans le ciel, plus le plaisir grandit. 45 minutes de vol.",
  },
  {
    id: "ENFANT",
    name: "Baptême Enfant",
    price: 90,
    description:
      "Pour les p'tits loups dans l'aventure et la montagne. 10 minutes de vol.",
  },
  {
    id: "HIVER",
    name: "Baptême Hiver",
    price: 130,
    description: "Les sommets enneigés à perte de vue, en toute liberté.",
  },
];

const MONTHS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

function BaptemeReservationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Paramètres URL
  const preselectedCategory = searchParams.get("category") as
    | "AVENTURE"
    | "DUREE"
    | "LONGUE_DUREE"
    | "ENFANT"
    | "HIVER";

  //Etat de scroll de la page
  const [isScrolled, setIsScrolled] = useState(false);

  // États du formulaire
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ParticipantFormData>();
  const [isLoading, setIsLoading] = useState(false);

  // États de sélection
  const [selectedCategory, setSelectedCategory] = useState<string>(
    preselectedCategory || ""
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Bapteme | null>(null);
  const [hasVideo, setHasVideo] = useState(false);

  // États pour l'affichage progressif
  const [showSlots, setShowSlots] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // États de données
  const [availableYears, setAvailableYears] = useState<
    { year: number; count: number }[]
  >([]);
  const [availableMonths, setAvailableMonths] = useState<
    { month: number; count: number }[]
  >([]);
  const [slots, setSlots] = useState<Bapteme[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const participantType = watch("participantType");

  // SetState du scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Charger les données utilisateur depuis localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("userInfo");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setValue("firstName", parsedData.firstName || "");
        setValue("lastName", parsedData.lastName || "");
        setValue("email", parsedData.email || "");
        setValue("phone", parsedData.phone || "");
        setValue("weight", parsedData.weight || "");
        setValue("height", parsedData.height || "");
        setValue("birthDate", parsedData.birthDate || "");
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données utilisateur:",
          error
        );
      }
    }
  }, [setValue]);

  // Charger les périodes disponibles quand la catégorie change
  useEffect(() => {
    if (selectedCategory) {
      loadAvailablePeriods();
    }
  }, [selectedCategory]);

  // Charger les créneaux quand année/mois changent
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      loadAvailableSlots();
      setShowSlots(true);
      setShowForm(false);
      setSelectedSlot(null);
    }
  }, [selectedYear, selectedMonth, selectedCategory]);

  const loadAvailablePeriods = async () => {
    try {
      setLoadingPeriods(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/availability/periods`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
          body: JSON.stringify({
            type: "bapteme",
            category: selectedCategory,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableYears(data.data.years || []);

          // Si une seule année disponible, la sélectionner automatiquement
          if (data.data.years && data.data.years.length === 1) {
            setSelectedYear(data.data.years[0].year);
            const monthsForYear =
              data.data.monthsByYear[data.data.years[0].year] || [];
            setAvailableMonths(monthsForYear);

            // Si un seul mois disponible, le sélectionner automatiquement
            if (monthsForYear.length === 1) {
              setSelectedMonth(monthsForYear[0].month);
            }
          }
        }
      }
    } catch (error) {
      console.error("Erreur chargement périodes disponibles:", error);
    } finally {
      setLoadingPeriods(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedYear || !selectedMonth) return;

    try {
      setLoadingSlots(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/baptemes/getAll`,
        {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        let filteredSlots = data.data;

        // Filtrer par catégorie - inclut les baptêmes qui ont la catégorie recherchée parmi leurs catégories
        filteredSlots = filteredSlots.filter((bapteme: Bapteme) => {
          // Vérifier si le baptême a la catégorie sélectionnée dans son tableau de catégories
          return (
            bapteme.categories && bapteme.categories.includes(selectedCategory)
          );
        });

        // Filtrer par année et mois
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

        filteredSlots = filteredSlots.filter((slot: Bapteme) => {
          const slotDate = new Date(slot.date);
          return slotDate >= startOfMonth && slotDate <= endOfMonth;
        });

        // Filtrer les créneaux futurs
        const now = new Date();
        filteredSlots = filteredSlots.filter((slot: Bapteme) => {
          const slotDate = new Date(slot.date);
          return slotDate > now;
        });

        // Trier par date
        filteredSlots.sort((a: Bapteme, b: Bapteme) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setSlots(filteredSlots);
      }
    } catch (error) {
      console.error("Erreur chargement créneaux:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot: Bapteme) => {
    setSelectedSlot(slot);
    setShowForm(true);
    // Scroll vers le formulaire
    setTimeout(() => {
      const formElement = document.getElementById("participant-form-separator");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const saveUserInfo = (data: ParticipantFormData) => {
    if (participantType === "self") {
      const userInfo = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        weight: data.weight,
        height: data.height,
        birthDate: data.birthDate,
      };
      localStorage.setItem("userInfo", JSON.stringify(userInfo));
    }
  };

  const onSubmit = async (data: ParticipantFormData) => {
    if (!selectedSlot) return;

    setIsLoading(true);

    try {
      saveUserInfo(data);

      const sessionId = SessionManager.getOrCreateSessionId();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/cart/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
          body: JSON.stringify({
            type: "BAPTEME",
            itemId: selectedSlot.id,
            participantData: {
              ...data,
              weight: Number(data.weight),
              height: Number(data.height),
              selectedCategory: selectedCategory,
              hasVideo: hasVideo,
            },
            quantity: 1,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Déclencher un événement pour rafraîchir le panier
        window.dispatchEvent(new CustomEvent("cartUpdated"));

        // Afficher la popup de confirmation
        setShowSuccessDialog(true);
      } else {
        toast({
          title: "Erreur",
          description: result.message || "Erreur lors de l'ajout au panier",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur ajout panier:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout au panier",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBaptemePrice = (category: string) => {
    const prices: Record<string, number> = {
      AVENTURE: 110,
      DUREE: 150,
      LONGUE_DUREE: 185,
      ENFANT: 90,
      HIVER: 130,
    };
    return prices[category] || 110;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      AVENTURE: "Baptême Aventure",
      DUREE: "Baptême Durée",
      LONGUE_DUREE: "Baptême Longue Durée",
      ENFANT: "Baptême Enfant",
      HIVER: "Baptême Hiver",
    };
    return labels[category] || category;
  };

  const getSelectedCategoryInfo = () => {
    return BAPTEME_CATEGORIES.find((cat) => cat.id === selectedCategory);
  };

  const getMonthLabel = (month: number) => {
    return MONTHS.find((m) => m.value === month)?.label || `Mois ${month}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTotalPrice = () => {
    return getBaptemePrice(selectedCategory) + (hasVideo ? 25 : 0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div
        className={cn(
          "bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm",
          "transition-all ease-in-out duration-300",
          isScrolled ? "pt-0 pb-0" : "pt-12 pb-4"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/reserver">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">
              Réserver un baptême
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pt-24 space-y-12">
        {/* Section 1: Sélection catégorie, année, mois */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Choisissez votre formule et période
            </h2>
            <p className="text-slate-600">
              Sélectionnez votre formule de baptême et la période souhaitée
            </p>
          </div>

          {/* Sélection de catégorie pour les baptêmes */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-slate-800">
              Type de baptême
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
                setSelectedYear(null);
                setSelectedMonth(null);
                setShowSlots(false);
                setShowForm(false);
                setSelectedSlot(null);
              }}
            >
              <SelectTrigger className="h-12 bg-white">
                <SelectValue placeholder="Sélectionnez un type de baptême" />
              </SelectTrigger>
              <SelectContent>
                {BAPTEME_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} - {category.price}€
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Présentation de la catégorie sélectionnée */}
            {selectedCategory && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <h3 className="font-semibold text-xl text-blue-600 mb-2">
                        {getSelectedCategoryInfo()?.name}
                      </h3>
                      <p className="text-slate-600">
                        {getSelectedCategoryInfo()?.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-blue-600">
                        {getSelectedCategoryInfo()?.price}€
                      </p>
                      <p className="text-sm text-slate-500">
                        + Option vidéo : 25€
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sélection année et mois */}
          {selectedCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Année */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate-800">
                  Année
                </Label>
                {loadingPeriods ? (
                  <div className="flex items-center justify-center py-4 border rounded-lg">
                    <Clock className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Chargement...</span>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedYear?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedYear(parseInt(value));
                        setSelectedMonth(null);
                        setShowSlots(false);
                        setShowForm(false);
                        setSelectedSlot(null);
                      }}
                      disabled={availableYears.length === 0}
                    >
                      <SelectTrigger className="h-12 bg-white">
                        <SelectValue placeholder="Sélectionner une année" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((yearData) => (
                          <SelectItem
                            key={yearData.year}
                            value={yearData.year.toString()}
                          >
                            {yearData.year} - {yearData.count} créneau
                            {yearData.count > 1 ? "x" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {availableYears.length === 0 && (
                      <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-center mt-2">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                        <p className="text-slate-600 font-medium text-sm">
                          Aucun créneau disponible
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Aucun créneau disponible pour cette formule de baptême
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Mois */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate-800">
                  Mois
                </Label>
                <Select
                  value={selectedMonth?.toString() || ""}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  disabled={!selectedYear || availableMonths.length === 0}
                >
                  <SelectTrigger className="h-12 bg-white">
                    <SelectValue placeholder="Sélectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((monthData) => (
                      <SelectItem
                        key={monthData.month}
                        value={monthData.month.toString()}
                      >
                        {getMonthLabel(monthData.month)} - {monthData.count}{" "}
                        créneau{monthData.count > 1 ? "x" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Sélection du créneau - Affichée progressivement */}
        {showSlots && selectedYear && selectedMonth && (
          <>
            <Separator />
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  Choisissez votre créneau
                </h2>
                <p className="text-slate-600">
                  Sélectionnez le créneau qui vous convient pour{" "}
                  {getMonthLabel(selectedMonth)} {selectedYear}
                </p>
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="w-6 h-6 animate-spin mr-2" />
                  Chargement des créneaux disponibles...
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600 text-lg">
                    Aucun créneau disponible pour cette période
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {!selectedSlot ? (
                    <>
                      <h3 className="font-semibold text-lg text-slate-800">
                        Créneaux disponibles
                      </h3>
                      <div className="grid gap-4">
                        {slots.map((slot) => (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            onSelect={() => handleSlotSelect(slot)}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <Card className="border-2 border-blue-600">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-800 mb-2">
                              Créneau sélectionné
                            </h3>
                            <p className="font-semibold text-lg">
                              {formatDate(selectedSlot.date)}
                            </p>
                            <p className="text-slate-600">
                              {formatTime(selectedSlot.date)} -{" "}
                              {selectedSlot.duration} min
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedSlot(null);
                              setShowForm(false);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Modifier
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Section 3: Informations participant - Affichée après sélection du créneau */}
        {showForm && selectedSlot && (
          <>
            <Separator id="participant-form-separator" />
            <div
              id="participant-form"
              className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500"
            >
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">
                    Vos informations
                  </h2>
                  <p className="text-slate-600">
                    Renseignez les informations du participant pour finaliser la
                    réservation
                  </p>
                </div>

                {/* Récapitulatif créneau sélectionné */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg text-slate-800 mb-4">
                      Créneau sélectionné
                    </h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">
                          {formatDate(selectedSlot.date)}
                        </p>
                        <p className="text-slate-600">
                          {formatTime(selectedSlot.date)}-{" "}
                          {selectedSlot.duration} min
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-blue-600">
                          {getBaptemePrice(selectedCategory)}€
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Sélection participant */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold text-slate-800">
                      Pour qui réservez-vous ?
                    </Label>
                    <RadioGroup
                      defaultValue="self"
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      onValueChange={(value) =>
                        setValue("participantType", value as "self" | "other")
                      }
                    >
                      <div className="relative">
                        <RadioGroupItem
                          value="self"
                          id="self"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="self"
                          className={`flex items-center justify-center p-6 bg-slate-50 border-2 rounded-lg cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
                            participantType === "self"
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="text-center">
                            <div
                              className={`font-semibold text-lg ${participantType === "self" ? "text-blue-700" : "text-slate-800"}`}
                            >
                              Pour moi
                            </div>
                            <div
                              className={`text-sm mt-1 ${participantType === "self" ? "text-blue-600" : "text-slate-600"}`}
                            >
                              Mes informations seront sauvegardées
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem
                          value="other"
                          id="other"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="other"
                          className={`flex items-center justify-center p-6 bg-slate-50 border-2 rounded-lg cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
                            participantType === "other"
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="text-center">
                            <div
                              className={`font-semibold text-lg ${participantType === "other" ? "text-blue-700" : "text-slate-800"}`}
                            >
                              Pour quelqu'un d'autre
                            </div>
                            <div
                              className={`text-sm mt-1 ${participantType === "other" ? "text-blue-600" : "text-slate-600"}`}
                            >
                              Cadeau ou réservation tierce
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Informations participant */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Informations{" "}
                      {participantType === "self"
                        ? "personnelles"
                        : "du participant"}
                    </h3>

                    {/* Identité */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-700 border-l-4 border-blue-600 pl-3">
                        Identité
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Prénom *</Label>
                          <Input
                            id="firstName"
                            {...register("firstName", {
                              required: "Prénom requis",
                            })}
                            placeholder={
                              participantType === "self"
                                ? "Votre prénom"
                                : "Prénom du participant"
                            }
                            className="mt-1"
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
                            {...register("lastName", {
                              required: "Nom requis",
                            })}
                            placeholder={
                              participantType === "self"
                                ? "Votre nom"
                                : "Nom du participant"
                            }
                            className="mt-1"
                          />
                          {errors.lastName && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-700 border-l-4 border-blue-600 pl-3">
                        Contact
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            {...register("email", { required: "Email requis" })}
                            placeholder="email@exemple.com"
                            className="mt-1"
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
                            {...register("phone", {
                              required: "Téléphone requis",
                            })}
                            placeholder="06 12 34 56 78"
                            className="mt-1"
                          />
                          {errors.phone && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.phone.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informations physiques */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-700 border-l-4 border-blue-600 pl-3">
                        Informations physiques
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="weight">Poids (kg) *</Label>
                          <Input
                            id="weight"
                            type="number"
                            {...register("weight", {
                              required: "Poids requis",
                              min: { value: 20, message: "Poids minimum 20kg" },
                              max: {
                                value: 120,
                                message: "Poids maximum 120kg",
                              },
                            })}
                            placeholder="70"
                            className="mt-1"
                          />
                          {errors.weight && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.weight.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="height">Taille (cm) *</Label>
                          <Input
                            id="height"
                            type="number"
                            {...register("height", {
                              required: "Taille requise",
                              min: {
                                value: 120,
                                message: "Taille minimum 120cm",
                              },
                              max: {
                                value: 220,
                                message: "Taille maximum 220cm",
                              },
                            })}
                            placeholder="175"
                            className="mt-1"
                          />
                          {errors.height && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.height.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Option vidéo pour baptêmes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Options
                    </h3>

                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-100 ${
                        hasVideo
                          ? "bg-blue-50 border-blue-600 ring-2 ring-blue-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                      onClick={() => setHasVideo(!hasVideo)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎥</span>
                          <div>
                            <div
                              className={`font-semibold text-lg ${hasVideo ? "text-blue-700" : "text-slate-800"}`}
                            >
                              Option vidéo souvenir
                            </div>
                            <p
                              className={`text-sm ${hasVideo ? "text-blue-600" : "text-slate-600"}`}
                            >
                              Immortalisez votre vol avec une vidéo
                              professionnelle
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600">
                              +25€
                            </p>
                          </div>
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              hasVideo
                                ? "bg-blue-600 border-blue-600"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            {hasVideo && (
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif prix */}
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      Récapitulatif de votre commande
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">
                          {getCategoryLabel(selectedCategory)}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {getBaptemePrice(selectedCategory)}€
                        </span>
                      </div>
                      {hasVideo && (
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-700">
                            Option vidéo
                          </span>
                          <span className="font-semibold text-slate-800">
                            +25€
                          </span>
                        </div>
                      )}
                      <hr className="border-slate-300" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xl text-slate-800">
                          Total
                        </span>
                        <span className="font-bold text-2xl text-blue-600">
                          {getTotalPrice()}€
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedSlot(null);
                        setShowForm(false);
                      }}
                      className="flex-1 h-12"
                      size="lg"
                    >
                      Modifier le créneau
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-12"
                      size="lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-spin" />
                          Ajout en cours...
                        </div>
                      ) : (
                        "Ajouter au panier"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dialog de confirmation après ajout au panier */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          setShowSuccessDialog(open);
          // Si la popup est fermée sans action, rediriger vers /reserver
          if (!open) {
            router.push("/reserver");
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
              Ajouté au panier !
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre baptême a été ajouté avec succès à votre panier.
              <br />
              Que souhaitez-vous faire ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push("/checkout");
              }}
              className="w-full gap-2"
              size="lg"
            >
              <ShoppingCart className="w-4 h-4" />
              Voir mon panier
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push("/reserver");
              }}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <Plus className="w-4 h-4" />
              Continuer mes achats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant pour afficher un créneau
function SlotCard({ slot, onSelect }: { slot: Bapteme; onSelect: () => void }) {
  const { availability, loading } = useAvailability("bapteme", slot.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAvailable = availability?.available ?? true;
  const availablePlaces = availability?.availablePlaces ?? slot.places;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${!isAvailable ? "opacity-50" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h3 className="font-semibold">{formatDate(slot.date)}</h3>
                <p className="text-sm text-slate-600">
                  {formatTime(slot.date)}- {slot.duration} min
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {loading ? (
                  <span className="text-sm text-slate-500">
                    Vérification...
                  </span>
                ) : (
                  <Badge variant={isAvailable ? "default" : "destructive"}>
                    {isAvailable
                      ? `${availablePlaces} place${availablePlaces > 1 ? "s" : ""}`
                      : "Complet"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                onClick={onSelect}
                disabled={!isAvailable}
                size="sm"
                className="gap-1"
              >
                Choisir ce créneau
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BaptemeReservationPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <BaptemeReservationPageContent />
    </Suspense>
  );
}
