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
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-hero rounded-full shadow-elevated">
          <Zap className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Blitz-Angebot für deine{' '}
          <span className="text-transparent bg-gradient-hero bg-clip-text">
            Wallbox
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Beantworte ein paar kurze Fragen und erhalte dein persönliches PDF-Angebot in{' '}
          <span className="font-semibold text-primary">60 Sekunden</span>.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="border-0 shadow-card bg-wallbox-surface-elevated">
          <CardHeader className="pb-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mb-2">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">60 Sekunden</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Schnell und unkompliziert zu deinem Angebot
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-wallbox-surface-elevated">
          <CardHeader className="pb-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mb-2">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Kostenlos</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Unverbindliches Angebot ohne versteckte Kosten
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-wallbox-surface-elevated">
          <CardHeader className="pb-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Förderung inklusive</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Staatliche Förderung wird automatisch berücksichtigt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="space-y-4">
        <Button 
          onClick={nextStep}
          size="lg"
          className="w-full md:w-auto px-12 py-6 text-lg font-semibold bg-gradient-hero hover:bg-primary-hover shadow-button transition-all duration-200 hover:shadow-elevated hover:scale-105"
        >
          Jetzt starten
        </Button>
        
        <p className="text-xs text-muted-foreground">
          ✓ 100% kostenlos ✓ Keine Anmeldung erforderlich ✓ Sofortiges Angebot
        </p>
      </div>
    </div>
  );
};

export default IntroStep;