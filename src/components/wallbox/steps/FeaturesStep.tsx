import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sun, Zap, CreditCard, ChevronLeft } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface FeaturesStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
}

const FeaturesStep = ({ data, updateData, nextStep, prevStep, canGoBack }: FeaturesStepProps) => {
  const features = [
    {
      id: 'pv-anbindung',
      title: 'PV-Anbindung',
      description: 'Lade dein Auto mit Solarstrom von deiner eigenen Anlage',
      icon: Sun,
    },
    {
      id: 'lastmanagement',
      title: 'Lastmanagement',
      description: 'Intelligente Verteilung der verfügbaren Stromleistung',
      icon: Zap,
    },
    {
      id: 'rfid-zugang',
      title: 'RFID / Zugangskontrolle',
      description: 'Sichere Zugangskontrolle für deine Wallbox',
      icon: CreditCard,
    },
  ];

  const handleContinue = () => {
    nextStep();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Welche Extras sind dir wichtig?
        </h2>
        <p className="text-lg text-muted-foreground">
          Wähle zusätzliche Features für deine Wallbox (optional)
        </p>
      </div>

      {/* Features */}
      <div className="space-y-4 max-w-2xl mx-auto">
        {features.map((feature) => {
          const Icon = feature.icon;
          
          return (
            <Card
              key={feature.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-card border-2 border-border hover:border-primary/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <Checkbox 
                    checked={false}
                    className="mt-1"
                  />
                  
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Du kannst auch keine Extras auswählen und trotzdem fortfahren
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center max-w-2xl mx-auto">
        {canGoBack ? (
          <Button
            variant="outline"
            onClick={prevStep}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </Button>
        ) : (
          <div />
        )}
        
        <Button
          onClick={handleContinue}
          className="bg-gradient-hero hover:bg-primary-hover"
        >
          Weiter
        </Button>
      </div>
    </div>
  );
};

export default FeaturesStep;