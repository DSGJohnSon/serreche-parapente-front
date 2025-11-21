'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, ArrowRight, Mountain, Plane, Gift, Clock } from 'lucide-react';
import Link from 'next/link';
import { MdCardGiftcard } from 'react-icons/md';

const PRODUCTS = [
  {
    id: 'stage',
    title: 'Stage de Parapente',
    description: 'Apprenez à voler en parapente avec nos stages adaptés à tous les niveaux.',
    icon: Mountain,
    href: '/reserver/stage',
    features: ['Formation complète', 'Encadrement professionnel', 'Matériel fourni'],
    popular: false,
    isDisabled: false
  },
  {
    id: 'bapteme',
    title: 'Baptême de l\'Air',
    description: 'Découvrez les sensations du vol en parapente lors d\'un baptême aérien.',
    icon: Plane,
    href: '/reserver/bapteme',
    features: ['Vol découverte', 'Vue panoramique', 'Souvenir photo/vidéo'],
    popular: true,
    isDisabled: false
  },
  {
    id: 'bon-cadeau',
    title: 'Bon Cadeau',
    description: 'Offrez à vos proches une place en stage ou baptême à réserver quand ils le souhaitent.',
    icon: Gift,
    href: '/reserver/carte-cadeau',
    features: ['1 place pour un stage / baptême', 'Valable 1 an', 'Message personnalisé'],
    popular: false,
    isDisabled: true
  },
  {
    id: 'carte-cadeau',
    title: 'Carte Cadeau',
    description: 'Offrez à vos proches un montant personalisé à dépenser sur notre boutique.',
    icon: MdCardGiftcard,
    href: '/reserver/carte-cadeau',
    features: ['Montant personnalisable', 'Valable 1 an', 'Message personnalisé'],
    popular: false,
    isDisabled: false
  },
];

export default function ReserverPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Réservez votre expérience parapente
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Découvrez nos différentes formules pour vivre une aventure aérienne unique dans les Alpes.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {PRODUCTS.map((product) => {
            const IconComponent = product.icon;
            return (
              <Card
                key={product.id}
                className={`relative transition-all hover:shadow-lg hover:-translate-y-1 ${
                  product.popular ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {product.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Plus populaire
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <IconComponent className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl text-slate-800">
                    {product.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <p className="text-slate-600 text-center">
                    {product.description}
                  </p>

                  <div className="space-y-2">
                    {product.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span className="text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href={product.href} className="block">
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      disabled={product.isDisabled}
                    >
                      {product.isDisabled ? "Bientôt disponible" : "Réserver maintenant"}
                      {product.isDisabled ? <Clock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional info */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg p-8 shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-slate-800 mb-1">Réservation flexible</h3>
                <p className="text-sm text-slate-600">Modifiez ou annulez gratuitement jusqu'à 48h avant</p>
              </div>
              <div className="flex flex-col items-center">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-slate-800 mb-1">Équipe expérimentée</h3>
                <p className="text-sm text-slate-600">Pilotes professionnels et moniteurs qualifiés</p>
              </div>
              <div className="flex flex-col items-center">
                <Mountain className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-slate-800 mb-1">Sites d'exception</h3>
                <p className="text-sm text-slate-600">Les plus beaux spots de vol des Alpes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}