import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Zap, Smartphone, ChevronLeft } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface WallboxTypeStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
}

const WallboxTypeStep = ({ data, updateData, nextStep, prevStep, canGoBack }: WallboxTypeStepProps) => {
  const options = [
    {
      id: '11kw-standard',
      title: '11 kW Standard',
      description: 'Für den täglichen Gebrauch',
      icon: Zap,
      recommended: false,
    },
    {
      id: '22kw-standard',
      title: '22 kW Standard',
      description: 'Schnelleres Laden',
      icon: Zap,
      recommended: true,
    },
    {
      id: '11kw-smart',
      title: '11 kW Smart',
      description: 'Mit App-Steuerung',
      icon: Smartphone,
      recommended: false,
    },
    {
      id: '22kw-smart',
      title: '22 kW Smart',
      description: 'Schnell + App-Steuerung',
      icon: Smartphone,
      recommended: false,
    },
  ];

  const handleSelect = (option: string) => {
    updateData({ wallbox_typ: option });
    setTimeout(nextStep, 200); // Small delay for better UX
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Welche Wallbox bevorzugst du?
        </h2>
        <p className="text-lg text-muted-foreground">
          Wähle die Wallbox, die am besten zu deinen Bedürfnissen passt
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = data.wallbox_typ === option.id;
          
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
              
              <CardHeader className="text-center pb-3">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${
                  isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">{option.title}</h3>
              </CardHeader>
              
              <CardContent className="text-center">
                <p className="text-muted-foreground">{option.description}</p>
              </CardContent>
              
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
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

export default WallboxTypeStep;