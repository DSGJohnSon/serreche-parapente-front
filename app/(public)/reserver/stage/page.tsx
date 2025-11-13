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

interface StageCategory {
  id: string;
  name: string;
  price: number;
  description: string;
  duration: number;
}

interface Stage {
  id: string;
  startDate: string;
  duration: number;
  places: number;
  price: number;
  type: string;
  allTimeHighPrice?: number;
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

const STAGE_CATEGORIES: StageCategory[] = [
  {
    id: "INITIATION",
    name: "Stage Initiation",
    price: 450,
    description:
      "Découvrez le parapente et apprenez les bases du pilotage. 5 jours de formation.",
    duration: 5,
  },
  {
    id: "PROGRESSION",
    name: "Stage Progression",
    price: 550,
    description:
      "Perfectionnez votre technique et gagnez en autonomie. 5 jours de formation.",
    duration: 5,
  },
  {
    id: "AUTONOMIE",
    name: "Stage Autonomie",
    price: 650,
    description:
      "Devenez pilote autonome et préparez votre brevet. 5 jours de formation intensive.",
    duration: 5,
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

function StageReservationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Paramètres URL
  const preselectedCategory = searchParams.get("stageType") as
    | "INITIATION"
    | "PROGRESSION"
    | "AUTONOMIE";

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
  const [selectedSlot, setSelectedSlot] = useState<Stage | null>(null);

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
  const [slots, setSlots] = useState<Stage[]>([]);
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

  // Mettre à jour les mois disponibles quand l'année change
  useEffect(() => {
    if (selectedYear && availableYears.length > 1) {
      updateAvailableMonths();
    }
  }, [selectedYear]);

  const updateAvailableMonths = async () => {
    if (!selectedYear) return;

    try {
      // Récupérer tous les stages
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/stages/getAll`,
        {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        let stages = data.data;

        // Filtrer par type de stage (inclure DOUBLE pour INITIATION et PROGRESSION)
        stages = stages.filter((stage: Stage) => {
          if (stage.type === selectedCategory) return true;
          if (stage.type === "DOUBLE" &&
              (selectedCategory === "INITIATION" || selectedCategory === "PROGRESSION")) {
            return true;
          }
          return false;
        });

        // Filtrer les stages futurs
        const now = new Date();
        stages = stages.filter((stage: Stage) => {
          const stageDate = new Date(stage.startDate);
          return stageDate > now;
        });

        // Filtrer par année sélectionnée
        stages = stages.filter((stage: Stage) => {
          const date = new Date(stage.startDate);
          return date.getFullYear() === selectedYear;
        });

        // Calculer les mois disponibles
        const monthMap = new Map<number, number>();
        stages.forEach((stage: Stage) => {
          const date = new Date(stage.startDate);
          const month = date.getMonth() + 1;
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
        });

        const months = Array.from(monthMap.entries())
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month - b.month);

        setAvailableMonths(months);
      }
    } catch (error) {
      console.error("Erreur mise à jour mois disponibles:", error);
    }
  };

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

      // Récupérer tous les stages
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/stages/getAll`,
        {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        let stages = data.data;

        // Filtrer par type de stage (inclure DOUBLE pour INITIATION et PROGRESSION)
        stages = stages.filter((stage: Stage) => {
          if (stage.type === selectedCategory) return true;
          if (stage.type === "DOUBLE" &&
              (selectedCategory === "INITIATION" || selectedCategory === "PROGRESSION")) {
            return true;
          }
          return false;
        });

        // Filtrer les stages futurs
        const now = new Date();
        stages = stages.filter((stage: Stage) => {
          const stageDate = new Date(stage.startDate);
          return stageDate > now;
        });

        // Calculer les années et mois disponibles
        const yearMonthMap = new Map<number, Map<number, number>>();

        stages.forEach((stage: Stage) => {
          const date = new Date(stage.startDate);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;

          if (!yearMonthMap.has(year)) {
            yearMonthMap.set(year, new Map());
          }

          const monthMap = yearMonthMap.get(year)!;
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
        });

        // Convertir en format attendu
        const years = Array.from(yearMonthMap.entries())
          .map(([year, monthMap]) => ({
            year,
            count: Array.from(monthMap.values()).reduce((a, b) => a + b, 0),
          }))
          .sort((a, b) => a.year - b.year);

        setAvailableYears(years);

        // Si une seule année disponible, la sélectionner automatiquement
        if (years.length === 1) {
          const year = years[0].year;
          setSelectedYear(year);
          
          const monthMap = yearMonthMap.get(year)!;
          const months = Array.from(monthMap.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month - b.month);
          
          setAvailableMonths(months);

          // Si un seul mois disponible, le sélectionner automatiquement
          if (months.length === 1) {
            setSelectedMonth(months[0].month);
          }
        } else if (years.length > 1 && selectedYear) {
          // Mettre à jour les mois pour l'année sélectionnée
          const monthMap = yearMonthMap.get(selectedYear);
          if (monthMap) {
            const months = Array.from(monthMap.entries())
              .map(([month, count]) => ({ month, count }))
              .sort((a, b) => a.month - b.month);
            setAvailableMonths(months);
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
        `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/stages/getAll`,
        {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        let filteredSlots = data.data;

        // Filtrer par type de stage
        // Les stages "DOUBLE" sont inclus pour INITIATION et PROGRESSION
        filteredSlots = filteredSlots.filter((stage: Stage) => {
          if (stage.type === selectedCategory) return true;
          if (stage.type === "DOUBLE" &&
              (selectedCategory === "INITIATION" || selectedCategory === "PROGRESSION")) {
            return true;
          }
          return false;
        });

        // Filtrer par année et mois
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

        filteredSlots = filteredSlots.filter((slot: Stage) => {
          const slotDate = new Date(slot.startDate);
          return slotDate >= startOfMonth && slotDate <= endOfMonth;
        });

        // Filtrer les créneaux futurs
        const now = new Date();
        filteredSlots = filteredSlots.filter((slot: Stage) => {
          const slotDate = new Date(slot.startDate);
          return slotDate > now;
        });

        // Trier par date
        filteredSlots.sort((a: Stage, b: Stage) => {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
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

  const handleSlotSelect = (slot: Stage) => {
    setSelectedSlot(slot);
    setShowForm(true);
    // Initialiser participantType à "self" par défaut
    setValue("participantType", "self");
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
            type: "STAGE",
            itemId: selectedSlot.id,
            participantData: {
              ...data,
              weight: Number(data.weight),
              height: Number(data.height),
              selectedStageType: selectedCategory,
            },
            quantity: 1,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Déclencher un événement pour rafraîchir le panier
        window.dispatchEvent(new CustomEvent("cartUpdated"));

        // Afficher un toast informatif sur le blocage de la place
        toast({
          title: "Place réservée temporairement",
          description: "Cette place est bloquée pendant 1h00. Finalisez votre paiement pour confirmer la réservation.",
          duration: 5000,
        });

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      INITIATION: "Stage Initiation",
      PROGRESSION: "Stage Progression",
      AUTONOMIE: "Stage Autonomie",
    };
    return labels[category] || category;
  };

  const getSelectedCategoryInfo = () => {
    return STAGE_CATEGORIES.find((cat) => cat.id === selectedCategory);
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
              Réserver un stage
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
              Sélectionnez votre type de stage et la période souhaitée
            </p>
          </div>

          {/* Sélection de catégorie pour les stages */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-slate-800">
              Type de stage
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
                <SelectValue placeholder="Sélectionnez un type de stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_CATEGORIES.map((category) => (
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
                        {getSelectedCategoryInfo()?.duration} jours
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
                          Aucun créneau disponible pour ce type de stage
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
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-slate-800 mb-3">
                              Créneau sélectionné
                            </h3>
                            <div className="space-y-2">
                              <p className="font-semibold text-lg text-slate-800">
                                Du {formatDate(selectedSlot.startDate)}
                              </p>
                              <p className="text-slate-600">
                                au {(() => {
                                  const start = new Date(selectedSlot.startDate);
                                  const end = new Date(start);
                                  end.setDate(start.getDate() + selectedSlot.duration - 1);
                                  return formatDate(end.toISOString());
                                })()} ({selectedSlot.duration} jours)
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              {selectedSlot.allTimeHighPrice && selectedSlot.price < selectedSlot.allTimeHighPrice && (
                                <>
                                  <Badge variant="destructive" className="text-xs mb-1">
                                    PROMO
                                  </Badge>
                                  <p className="text-sm text-slate-500 line-through">
                                    {selectedSlot.allTimeHighPrice}€
                                  </p>
                                </>
                              )}
                              <p className="font-bold text-2xl text-blue-600">
                                {selectedSlot.price}€
                              </p>
                              <p className="text-xs text-slate-500">par participant</p>
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
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-lg text-slate-800">
                          Du {formatDate(selectedSlot.startDate)}
                        </p>
                        <p className="text-slate-600">
                          au {(() => {
                            const start = new Date(selectedSlot.startDate);
                            const end = new Date(start);
                            end.setDate(start.getDate() + selectedSlot.duration - 1);
                            return formatDate(end.toISOString());
                          })()} ({selectedSlot.duration} jours)
                        </p>
                      </div>
                      <div className="text-right">
                        {selectedSlot.allTimeHighPrice && selectedSlot.price < selectedSlot.allTimeHighPrice && (
                          <>
                            <Badge variant="destructive" className="text-xs mb-1">
                              PROMO
                            </Badge>
                            <p className="text-sm text-slate-500 line-through">
                              {selectedSlot.allTimeHighPrice}€
                            </p>
                          </>
                        )}
                        <p className="font-bold text-2xl text-blue-600">
                          {selectedSlot.price}€
                        </p>
                        <p className="text-xs text-slate-500">par participant</p>
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
                      
                      <div>
                        <Label htmlFor="birthDate">Date de naissance *</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          {...register("birthDate", {
                            required: "Date de naissance requise",
                          })}
                          className="mt-1"
                        />
                        {errors.birthDate && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.birthDate.message}
                          </p>
                        )}
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
                          {selectedSlot.price}€
                        </span>
                      </div>
                      <hr className="border-slate-300" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xl text-slate-800">
                          Total
                        </span>
                        <span className="font-bold text-2xl text-blue-600">
                          {selectedSlot.price}€
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
              Place réservée !
            </DialogTitle>
            <DialogDescription className="text-center text-base space-y-2">
              <p className="font-semibold text-slate-800">
                Votre place est bloquée pendant 1h00
              </p>
              <p className="text-sm">
                Cette place est temporairement réservée pour vous. Finalisez votre paiement dans l'heure pour confirmer votre réservation.
              </p>
              <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 p-2 rounded-lg mt-3">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Temps restant: 60:00</span>
              </div>
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
function SlotCard({ slot, onSelect }: { slot: Stage; onSelect: () => void }) {
  const { availability, loading } = useAvailability("stage", slot.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getEndDate = (startDate: string, duration: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);
    return formatDate(end.toISOString());
  };

  const isOnSale = slot.allTimeHighPrice && slot.price < slot.allTimeHighPrice;

  const isAvailable = availability?.available ?? true;
  const availablePlaces = availability?.availablePlaces ?? slot.places;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${!isAvailable ? "opacity-50" : ""}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Dates */}
            <div>
              <h3 className="font-semibold text-lg text-slate-800">
                Du {formatDate(slot.startDate)}
              </h3>
              <p className="text-sm text-slate-600">
                au {getEndDate(slot.startDate, slot.duration)} ({slot.duration} jours)
              </p>
            </div>

            {/* Places disponibles */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              {loading ? (
                <span className="text-sm text-slate-500">
                  Vérification...
                </span>
              ) : (
                <Badge variant={isAvailable ? "default" : "destructive"}>
                  {isAvailable
                    ? `${availablePlaces} place${availablePlaces > 1 ? "s" : ""} disponible${availablePlaces > 1 ? "s" : ""}`
                    : "Complet"}
                </Badge>
              )}
            </div>

            {/* Bouton */}
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

          {/* Prix */}
          <div className="text-right">
            {isOnSale && (
              <div className="mb-1">
                <Badge variant="destructive" className="text-xs">
                  PROMO
                </Badge>
              </div>
            )}
            <div className="space-y-1">
              {isOnSale && (
                <p className="text-sm text-slate-500 line-through">
                  {slot.allTimeHighPrice}€
                </p>
              )}
              <p className="font-bold text-2xl text-blue-600">
                {slot.price}€
              </p>
              <p className="text-xs text-slate-500">par participant</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StageReservationPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <StageReservationPageContent />
    </Suspense>
  );
}