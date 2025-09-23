import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Zap, Smartphone, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WallboxData } from '../WallboxFunnel';

interface WallboxTypeStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
}

interface WallboxOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  recommended: boolean;
  price?: string;
}

const WallboxTypeStep = ({ data, updateData, nextStep, prevStep, canGoBack }: WallboxTypeStepProps) => {
  const [options, setOptions] = useState<WallboxOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallboxen = async () => {
      try {
        const { data: wallboxen, error } = await (supabase as any)
          .from('wallboxen')
          .select('*')
          .order('"Artikelnummer"');
          
        if (error) {
          console.error('Error fetching wallboxen:', error);
          return;
        }

        if (wallboxen && wallboxen.length > 0) {
          const mappedOptions: WallboxOption[] = wallboxen.map((wallbox: any, index: number) => ({
            id: wallbox.Artikelnummer?.toString() || index.toString(),
            title: wallbox.Name || 'Wallbox',
            description: wallbox.Beschreibung ? wallbox.Beschreibung.substring(0, 100) + '...' : '',
            price: wallbox['VK VK30'] ? `€${wallbox['VK VK30']}` : '',
            icon: wallbox.Name?.toLowerCase().includes('smart') ? Smartphone : Zap,
            recommended: index === 0, // First one is recommended
          }));

          setOptions(mappedOptions);
          
          // Set first option as default if no selection exists
          if (!data.wallbox_typ && mappedOptions.length > 0) {
            updateData({ wallbox_typ: mappedOptions[0].id });
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching wallboxen:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWallboxen();
  }, [data.wallbox_typ, updateData]);

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
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-muted-foreground">Wallboxen werden geladen...</p>
          </div>
        ) : options.map((option) => {
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
              
              <CardContent className="text-center space-y-2">
                <p className="text-muted-foreground">{option.description}</p>
                {option.price && (
                  <p className="text-lg font-semibold text-primary">{option.price}</p>
                )}
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