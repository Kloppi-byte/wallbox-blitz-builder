import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, User, Mail, MapPin, Home } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface ContactStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  submitLead: () => void;
  isSubmitting: boolean;
  canGoBack: boolean;
}

const ContactStep = ({ data, updateData, prevStep, submitLead, isSubmitting, canGoBack }: ContactStepProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!data.email?.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }

    if (!data.plz?.trim()) {
      newErrors.plz = 'PLZ ist erforderlich';
    } else if (!/^\d{5}$/.test(data.plz)) {
      newErrors.plz = 'PLZ muss 5 Ziffern haben';
    }

    if (!data.adresse?.trim()) {
      newErrors.adresse = 'Adresse ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      submitLead();
    }
  };

  const handleInputChange = (field: keyof WallboxData, value: string) => {
    updateData({ [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Fast geschafft! Noch deine Kontaktdaten
        </h2>
        <p className="text-lg text-muted-foreground">
          Damit wir dir dein persönliches Angebot zusenden können
        </p>
      </div>

      {/* Form */}
      <Card className="max-w-2xl mx-auto shadow-card">
        <CardHeader>
          <h3 className="text-xl font-semibold text-center">Kontaktdaten</h3>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Vollständiger Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Max Mustermann"
                value={data.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-Mail-Adresse *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="max@mustermann.de"
                value={data.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* PLZ */}
            <div className="space-y-2">
              <Label htmlFor="plz" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Postleitzahl *
              </Label>
              <Input
                id="plz"
                type="text"
                placeholder="12345"
                value={data.plz || ''}
                onChange={(e) => handleInputChange('plz', e.target.value)}
                maxLength={5}
                className={errors.plz ? 'border-destructive' : ''}
              />
              {errors.plz && (
                <p className="text-sm text-destructive">{errors.plz}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="adresse" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Straße + Hausnummer *
              </Label>
              <Input
                id="adresse"
                type="text"
                placeholder="Musterstraße 123"
                value={data.adresse || ''}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                className={errors.adresse ? 'border-destructive' : ''}
              />
              {errors.adresse && (
                <p className="text-sm text-destructive">{errors.adresse}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-6 text-lg font-semibold bg-gradient-hero hover:bg-primary-hover"
            >
              {isSubmitting ? 'Angebot wird erstellt...' : 'Angebot erstellen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Privacy Note */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs text-muted-foreground">
          ✓ Deine Daten werden sicher übertragen und nicht an Dritte weitergegeben
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-start max-w-2xl mx-auto">
        {canGoBack && (
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </Button>
        )}
      </div>
    </div>
  );
};

export default ContactStep;