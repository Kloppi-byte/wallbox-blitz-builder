import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Zap, Clock, Shield } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface IntroStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  submitLead: () => void;
  isSubmitting: boolean;
  canGoBack: boolean;
}

const IntroStep = ({ nextStep }: IntroStepProps) => {
  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full">
          <Zap className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Wallbox Angebot erstellen
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Kundenanfrage in wenigen Schritten erfassen und Angebot generieren.
        </p>
      </div>

      {/* CTA */}
      <div className="space-y-4">
        <Button 
          onClick={nextStep}
          size="lg"
          className="w-full md:w-auto px-8 py-4 text-lg font-semibold"
        >
          Anfrage starten
        </Button>
      </div>
    </div>
  );
};

export default IntroStep;