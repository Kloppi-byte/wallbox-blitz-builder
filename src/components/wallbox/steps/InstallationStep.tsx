import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Package, Wrench, ChevronLeft } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface InstallationStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
}

const InstallationStep = ({ data, updateData, nextStep, prevStep, canGoBack }: InstallationStepProps) => {
  const options = [
    {
      id: 'nur-wallbox',
      title: 'Nur Wallbox',
      description: 'Selbstmontage oder eigener Elektriker',
      icon: Package,
      subtitle: 'Günstigste Option',
    },
    {
      id: 'wallbox-montage',
      title: 'Wallbox + Montage',
      description: 'Komplettservice mit professioneller Installation',
      icon: Wrench,
      subtitle: 'Rundum-sorglos-Paket',
      recommended: true,
    },
  ];

  const handleSelect = (option: string) => {
    updateData({ installation: option });
    setTimeout(nextStep, 200);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Brauchst du nur die Wallbox oder inkl. Montage?
        </h2>
        <p className="text-lg text-muted-foreground">
          Wähle zwischen Selbstmontage oder unserem Komplettservice
        </p>
      </div>

      {/* Options */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = data.installation === option.id;
          
          return (
            <Card
              key={option.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-elevated hover:scale-105 border-2 ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-elevated' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleSelect(option.id)}
            >
              {option.recommended && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-gradient-hero text-white rounded-full shadow-button">
                    Empfohlen
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 ${
                  isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                }`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold">{option.title}</h3>
                <p className="text-sm font-medium text-primary">{option.subtitle}</p>
              </CardHeader>
              
              <CardContent className="text-center">
                <p className="text-muted-foreground">{option.description}</p>
              </CardContent>
              
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center max-w-4xl mx-auto">
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
        
        <p className="text-sm text-muted-foreground">
          Klicke auf eine Option zum Fortfahren
        </p>
      </div>
    </div>
  );
};

export default InstallationStep;