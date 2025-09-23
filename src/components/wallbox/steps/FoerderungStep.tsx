import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Euro, X, ChevronLeft } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface FoerderungStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
}

const FoerderungStep = ({ data, updateData, nextStep, prevStep, canGoBack }: FoerderungStepProps) => {
  const options = [
    {
      id: true,
      title: 'Ja, Förderung beantragen',
      description: 'Wir unterstützen dich bei der Förderungsabwicklung',
      icon: Euro,
      subtitle: 'Bis zu 900€ sparen',
      color: 'success',
    },
    {
      id: false,
      title: 'Nein',
      description: 'Förderung ist nicht gewünscht',
      icon: X,
      subtitle: 'Ohne Förderung',
      color: 'neutral',
    },
  ];

  const handleSelect = (option: boolean) => {
    updateData({ foerderung: option });
    setTimeout(nextStep, 200);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Möchtest du die staatliche Förderung nutzen?
        </h2>
        <p className="text-lg text-muted-foreground">
          Nutze staatliche Zuschüsse für deine Wallbox-Installation
        </p>
        
        {/* Info Card */}
        <Card className="max-w-xl mx-auto bg-wallbox-success/5 border-wallbox-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wallbox-success/10 rounded-lg flex items-center justify-center">
                <Euro className="w-5 h-5 text-wallbox-success" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-wallbox-success">KfW-Förderung verfügbar</h4>
                <p className="text-sm text-muted-foreground">
                  Bis zu 900€ Zuschuss für deine Wallbox
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = data.foerderung === option.id;
          
          return (
            <Card
              key={option.id.toString()}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-elevated hover:scale-105 border-2 ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-elevated' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleSelect(option.id)}
            >
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 ${
                  isSelected ? 'bg-primary text-white' : 
                  option.color === 'success' ? 'bg-wallbox-success/10 text-wallbox-success' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold">{option.title}</h3>
                <p className={`text-sm font-medium ${
                  option.color === 'success' ? 'text-wallbox-success' : 'text-muted-foreground'
                }`}>
                  {option.subtitle}
                </p>
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

export default FoerderungStep;