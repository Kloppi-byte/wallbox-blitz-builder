import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
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
          .select('Name, "VK VK30", "Artikelnummer"')
          .order('"Artikelnummer"');

        if (error) {
          console.error('Error fetching wallboxen:', error);
          return;
        }

        const mapped: WallboxOption[] = (wallboxen || []).map((row: any, index: number) => ({
          id: row.Artikelnummer?.toString() || String(index),
          title: row.Name,
          price: row['VK VK30'] ? `€${row['VK VK30']}` : undefined,
        }));

        setOptions(mapped);
        if (!data.wallbox_typ && mapped.length > 0) {
          updateData({ wallbox_typ: mapped[0].id });
        }
      } catch (e) {
        console.error('Unexpected error fetching wallboxen:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchWallboxen();
  }, [data.wallbox_typ, updateData]);

  const handleSelect = (optionId: string) => {
    updateData({ wallbox_typ: optionId });
    setTimeout(nextStep, 150);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">Welche Wallbox bevorzugst du?</h2>
        <p className="text-lg text-muted-foreground">Wähle eine Option – Name links, Preis rechts</p>
      </div>

      {/* Options Grid */}
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-muted-foreground">Wallboxen werden geladen...</p>
          </div>
        ) : options.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-muted-foreground">Keine Wallboxen gefunden.</p>
          </div>
        ) : (
          options.map((option) => {
            const isSelected = data.wallbox_typ === option.id;
            return (
              <Card
                key={option.id}
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-elevated hover:scale-105 border-2 ${
                  isSelected ? 'border-primary bg-primary/5 shadow-elevated' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleSelect(option.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">{option.title}</span>
                    <span className="text-lg font-semibold text-primary">{option.price || ''}</span>
                  </div>
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
          })
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center max-w-4xl mx-auto">
        {canGoBack ? (
          <Button variant="outline" onClick={prevStep} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </Button>
        ) : (
          <div />
        )}

        <p className="text-sm text-muted-foreground">Klicke auf eine Option zum Fortfahren</p>
      </div>
    </div>
  );
};

export default WallboxTypeStep;
