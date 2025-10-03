'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Clock, ChevronRight } from 'lucide-react';
import { useAvailability } from '@/hooks/useAvailability';
import { ParticipantFormModal } from './ParticipantFormModal';

interface Stage {
  id: string;
  startDate: string;
  duration: number;
  places: number;
  price: number;
  type: string;
}

interface Bapteme {
  id: string;
  date: string;
  duration: number;
  places: number;
  categories: string[];
}

interface SlotSelectionModalProps {
  type: 'stage' | 'bapteme';
  stageType?: 'INITIATION' | 'PROGRESSION' | 'AUTONOMIE';
  filters: {
    category?: string;
    year: number;
    month: number;
  };
  onClose: () => void;
}

export function SlotSelectionModal({ type, stageType, filters, onClose }: SlotSelectionModalProps) {
  const [slots, setSlots] = useState<(Stage | Bapteme)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Stage | Bapteme | null>(null);
  const [showParticipantForm, setShowParticipantForm] = useState(false);

  useEffect(() => {
    loadAvailableSlots();
  }, [type, stageType, filters]);

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      
      let url = `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/api/${type === 'stage' ? 'stages' : 'baptemes'}/getAll`;
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        let filteredSlots = data.data;
        
        // Filtrer par type de stage si spécifié
        if (type === 'stage' && stageType) {
          filteredSlots = filteredSlots.filter((stage: Stage) => stage.type === stageType);
        }
        
        // Filtrer par catégorie pour les baptêmes
        if (type === 'bapteme' && filters.category) {
          filteredSlots = filteredSlots.filter((bapteme: Bapteme) =>
            bapteme.categories.includes(filters.category as any)
          );
        }
        
        // Filtrer par année et mois
        const startOfMonth = new Date(filters.year, filters.month - 1, 1);
        const endOfMonth = new Date(filters.year, filters.month, 0, 23, 59, 59);
        
        filteredSlots = filteredSlots.filter((slot: Stage | Bapteme) => {
          const slotDate = new Date(type === 'stage' ? (slot as Stage).startDate : (slot as Bapteme).date);
          return slotDate >= startOfMonth && slotDate <= endOfMonth;
        });
        
        // Filtrer les créneaux futurs
        const now = new Date();
        filteredSlots = filteredSlots.filter((slot: Stage | Bapteme) => {
          const slotDate = new Date(type === 'stage' ? (slot as Stage).startDate : (slot as Bapteme).date);
          return slotDate > now;
        });
        
        // Trier par date
        filteredSlots.sort((a: any, b: any) => {
          const dateA = new Date(type === 'stage' ? a.startDate : a.date);
          const dateB = new Date(type === 'stage' ? b.startDate : b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        setSlots(filteredSlots);
      }
    } catch (error) {
      console.error('Erreur chargement créneaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSlotSelect = (slot: Stage | Bapteme) => {
    setSelectedSlot(slot);
    setShowParticipantForm(true);
  };

  const getSelectedCategoryInfo = () => {
    if (type === 'stage' || !filters.category) return null;
    
    const categoryPrices: Record<string, { name: string; price: number }> = {
      'AVENTURE': { name: 'Baptême Aventure', price: 110 },
      'DUREE': { name: 'Baptême Durée', price: 150 },
      'LONGUE_DUREE': { name: 'Baptême Longue Durée', price: 185 },
      'ENFANT': { name: 'Baptême Enfant', price: 90 },
      'HIVER': { name: 'Baptême Hiver', price: 130 },
    };
    
    return categoryPrices[filters.category];
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  };

  if (showParticipantForm && selectedSlot) {
    return (
      <ParticipantFormModal
        type={type}
        item={selectedSlot}
        preselectedCategory={filters.category}
        onClose={() => {
          setShowParticipantForm(false);
          setSelectedSlot(null);
        }}
        onSuccess={() => {
          setShowParticipantForm(false);
          setSelectedSlot(null);
          onClose(); // Fermer aussi le modal de sélection
        }}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {type === 'stage'
              ? `Choisir un créneau - Stage ${stageType}`
              : `Choisir un créneau - ${getSelectedCategoryInfo()?.name || 'Baptême'}`
            }
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="w-6 h-6 animate-spin mr-2" />
            Chargement des créneaux disponibles...
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Aucun créneau disponible pour le moment</p>
            <p className="text-sm text-gray-500 mt-2">
              Contactez-nous pour plus d'informations
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Récapitulatif de la sélection amélioré */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-4 text-blue-800 text-lg">✨ Votre sélection</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Formule :</span>
                    <p className="font-semibold text-lg text-blue-700">
                      {getSelectedCategoryInfo()?.name || `Stage ${stageType}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Période :</span>
                    <p className="font-medium text-gray-800">
                      {getMonthName(filters.month)} {filters.year}
                    </p>
                  </div>
                </div>
                <div className="text-right md:text-right">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Prix de base :</span>
                    <p className="font-bold text-2xl text-blue-600">
                      {getSelectedCategoryInfo()?.price || `${(slots[0] as Stage)?.price || 0}`}€
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 bg-white/70 rounded px-2 py-1">
                    💡 Option vidéo disponible lors de la réservation (+25€)
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-3 text-gray-800">
                📅 Créneaux disponibles
              </h4>
              <p className="text-gray-600 mb-4">
                Sélectionnez le créneau qui vous convient. Vous pourrez ajouter l'option vidéo lors de la finalisation de votre réservation.
              </p>
            </div>
            
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {slots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  type={type}
                  filters={filters}
                  onSelect={() => handleSlotSelect(slot)}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Composant pour afficher un créneau
function SlotCard({
  slot,
  type,
  filters,
  onSelect
}: {
  slot: Stage | Bapteme;
  type: 'stage' | 'bapteme';
  filters: { category?: string; year: number; month: number };
  onSelect: () => void;
}) {
  const { availability, loading } = useAvailability(type, slot.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    // Capitaliser la première lettre
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSlotDate = () => {
    return type === 'stage' ? (slot as Stage).startDate : (slot as Bapteme).date;
  };

  const getSlotPrice = () => {
    if (type === 'stage') {
      return (slot as Stage).price;
    }
    // Pour les baptêmes, utiliser le prix de la catégorie sélectionnée
    const categoryPrices: Record<string, number> = {
      'AVENTURE': 110,
      'DUREE': 150,
      'LONGUE_DUREE': 185,
      'ENFANT': 90,
      'HIVER': 130,
    };
    return categoryPrices[filters.category || ''] || 110;
  };

  const isAvailable = availability?.available ?? true; // Par défaut disponible
  const availablePlaces = availability?.availablePlaces ?? slot.places;

  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${!isAvailable ? 'opacity-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div>
                <h3 className="font-semibold">
                  {formatDate(getSlotDate())}
                </h3>
                <p className="text-sm text-gray-600">
                  {formatTime(getSlotDate())}
                  {type === 'stage' && ` - ${(slot as Stage).duration} jours`}
                  {type === 'bapteme' && ` - ${(slot as Bapteme).duration} min`}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {loading ? (
                  <span className="text-sm text-gray-500">Vérification...</span>
                ) : (
                  <Badge variant={isAvailable ? 'default' : 'destructive'}>
                    {isAvailable 
                      ? `${availablePlaces} place${availablePlaces > 1 ? 's' : ''}`
                      : 'Complet'
                    }
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg text-blue-600">
                {getSlotPrice()}€
              </span>
              
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