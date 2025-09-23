import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Minus, Plus, Zap, Download, Euro } from 'lucide-react';

interface WallboxOption {
  id: string;
  name: string;
  price: number;
  artikelnummer: string;
}

interface ConfigState {
  wallbox: WallboxOption;
  kabel_laenge_m: number;
  leitung: string;
  absicherung: string;
  durchbrueche: number;
  arbeitsstunden: number;
  anfahrt_zone: string;
  hauptsicherung_anpassung: boolean;
  foerderung: boolean;
  features: string[];
  kunde: {
    name: string;
    email: string;
    plz: string;
    adresse: string;
  };
}

const WallboxConfigurator = () => {
  const [config, setConfig] = useState<ConfigState>({
    wallbox: { id: "goe-11", name: "go-e 11kW", price: 390, artikelnummer: "1002" },
    kabel_laenge_m: 7.5,
    leitung: "NYY-J 5x6mm²",
    absicherung: "FI/LS",
    durchbrueche: 1,
    arbeitsstunden: 4,
    anfahrt_zone: "A",
    hauptsicherung_anpassung: false,
    foerderung: false,
    features: [],
    kunde: { name: "", email: "", plz: "", adresse: "" }
  });

  const [wallboxOptions, setWallboxOptions] = useState<WallboxOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWallboxes = async () => {
      try {
        const { data, error } = await supabase
          .from('wallboxen')
          .select('Name, "VK VK30", "Artikelnummer"')
          .order('Artikelnummer', { ascending: true });

        if (!error && data) {
          const options = data.map((item, index) => ({
            id: `wallbox-${index}`,
            name: item.Name || 'Unbekannt',
            price: parseFloat(item["VK VK30"] || "0"),
            artikelnummer: item.Artikelnummer?.toString() || ""
          }));
          setWallboxOptions(options);
          
          if (options.length > 0) {
            setConfig(prev => ({ ...prev, wallbox: options[0] }));
          }
        }
      } catch (error) {
        console.error('Error fetching wallboxes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWallboxes();
  }, []);

  const calculatePrices = () => {
    const materialkosten = config.wallbox.price + (config.kabel_laenge_m * 12) + 
                          (config.durchbrueche * 50) + (config.hauptsicherung_anpassung ? 200 : 0);
    
    const arbeitskosten = config.arbeitsstunden * 75;
    
    const anfahrtkosten = config.anfahrt_zone === 'A' ? 50 : 
                         config.anfahrt_zone === 'B' ? 75 : 100;
    
    const zwischensumme = materialkosten + arbeitskosten + anfahrtkosten;
    const foerderungsabzug = config.foerderung ? Math.min(900, zwischensumme * 0.4) : 0;
    const gesamtpreis = zwischensumme - foerderungsabzug;

    return {
      material: materialkosten,
      arbeit: arbeitskosten + anfahrtkosten,
      zwischensumme,
      foerderungsabzug,
      gesamt: gesamtpreis
    };
  };

  const prices = calculatePrices();

  const updateConfig = (key: keyof ConfigState, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateKunde = (key: keyof ConfigState['kunde'], value: string) => {
    setConfig(prev => ({
      ...prev,
      kunde: { ...prev.kunde, [key]: value }
    }));
  };

  const handleFeatureChange = (featureId: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      features: checked 
        ? [...prev.features, featureId]
        : prev.features.filter(f => f !== featureId)
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!config.kunde.name.trim()) errors.push('Name ist erforderlich');
    if (!config.kunde.email.trim() || !/\S+@\S+\.\S+/.test(config.kunde.email)) {
      errors.push('Gültige E-Mail ist erforderlich');
    }
    if (!config.kunde.plz.trim() || !/^\d{5}$/.test(config.kunde.plz)) {
      errors.push('Gültige PLZ ist erforderlich');
    }
    if (!config.kunde.adresse.trim()) errors.push('Adresse ist erforderlich');
    return errors;
  };

  const submitConfigurator = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Eingabefehler",
        description: errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to Supabase
      await supabase.from('wallbox_leads').insert({
        name: config.kunde.name,
        email: config.kunde.email,
        plz: config.kunde.plz,
        adresse: config.kunde.adresse,
        wallbox_typ: config.wallbox.artikelnummer,
        installation: 'konfigurator',
        foerderung: config.foerderung,
        features: config.features
      });

      // Send to webhook via GET (wie ursprünglich)
      const webhookUrl = new URL('https://hwg-samuel.app.n8n.cloud/webhook-test/aa9cf5bf-f3ed-4d4b-a03d-254628aeca06');
      webhookUrl.searchParams.append('name', config.kunde.name);
      webhookUrl.searchParams.append('email', config.kunde.email);
      webhookUrl.searchParams.append('plz', config.kunde.plz);
      webhookUrl.searchParams.append('adresse', config.kunde.adresse);
      webhookUrl.searchParams.append('wallbox_typ', config.wallbox.artikelnummer);
      webhookUrl.searchParams.append('installation', 'konfigurator');
      webhookUrl.searchParams.append('foerderung', String(config.foerderung));
      webhookUrl.searchParams.append('features', JSON.stringify(config.features));

      const response = await fetch(webhookUrl.toString());
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('Webhook response content-type:', contentType);
        
        if (contentType && contentType.includes('application/pdf')) {
          // Handle binary PDF response - direct download
          const blob = await response.blob();
          console.log('PDF blob size:', blob.size);
          
          // Create download with proper filename
          const fileName = `Wallbox-Angebot-${config.kunde.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
          
          // Method 1: Try direct blob download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          
          // Force download
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
          
          console.log('PDF download triggered:', fileName);
        } else if (contentType && contentType.includes('application/json')) {
          // Handle JSON response with PDF URL
          const webhookData = await response.json();
          console.log('Webhook response:', webhookData);
          
          if (webhookData && Array.isArray(webhookData) && webhookData.length > 0) {
            const pdfData = webhookData[0];
            if (pdfData.url && pdfData.name) {
              // Download PDF from URL
              console.log('Downloading PDF from URL:', pdfData.url);
              const link = document.createElement('a');
              link.href = pdfData.url;
              link.download = pdfData.name;
              link.target = '_blank'; // Fallback if download doesn't work
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                document.body.removeChild(link);
              }, 100);
            }
          }
        } else {
          // Try to parse as text/JSON anyway as fallback
          try {
            const webhookData = await response.json();
            console.log('Webhook response (fallback):', webhookData);
            
            if (webhookData && Array.isArray(webhookData) && webhookData.length > 0) {
              const pdfData = webhookData[0];
              if (pdfData.url && pdfData.name) {
                // Download PDF from URL
                console.log('Downloading PDF from fallback URL:', pdfData.url);
                const link = document.createElement('a');
                link.href = pdfData.url;
                link.download = pdfData.name;
                link.target = '_blank'; // Fallback if download doesn't work
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                  document.body.removeChild(link);
                }, 100);
              }
            }
          } catch (parseError) {
            console.error('Could not parse response as JSON:', parseError);
          }
        }

        toast({
          title: "Angebot erstellt!",
          description: "Ihr PDF-Angebot wurde erfolgreich generiert."
        });
      } else {
        throw new Error('Webhook failed');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Fehler",
        description: "Es gab ein Problem beim Erstellen des Angebots.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Lade Konfigurator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Card */}
        <Card className="mb-8 shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Zap className="h-8 w-8 text-wallbox-hero" />
              Wallbox Standardpaket
            </CardTitle>
            <p className="text-muted-foreground">
              Ihr komplettes Wallbox-Paket mit Montage und Anschluss
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <div className="inline-flex items-center gap-2 text-2xl font-bold text-wallbox-hero">
              <Euro className="h-6 w-6" />
              {prices.gesamt.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {config.foerderung && prices.foerderungsabzug > 0 && (
                <span className="text-wallbox-success">
                  (nach Förderabzug von {prices.foerderungsabzug.toFixed(2)}€)
                </span>
              )}
            </p>
            <Button 
              onClick={submitConfigurator}
              disabled={isSubmitting}
              size="lg"
              className="mt-4"
            >
              <Download className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Erstelle PDF...' : 'Sofort-Angebot als PDF'}
            </Button>
          </CardContent>
        </Card>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Package Overview */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Paketübersicht</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ihr zusammengestelltes Wallbox-Paket
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Wallbox-Modell:</span>
                  <span className="text-sm">{config.wallbox.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Kabellänge:</span>
                  <span className="text-sm">{config.kabel_laenge_m}m</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Leitungstyp:</span>
                  <span className="text-sm">{config.leitung}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Absicherung:</span>
                  <span className="text-sm">{config.absicherung}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Durchbrüche:</span>
                  <span className="text-sm">{config.durchbrueche}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Arbeitsaufwand:</span>
                  <span className="text-sm">{config.arbeitsstunden} Std</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Anfahrt:</span>
                  <span className="text-sm">Zone {config.anfahrt_zone}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Förderung:</span>
                  <span className="text-sm">{config.foerderung ? 'Ja' : 'Nein'}</span>
                </div>

                {config.features.length > 0 && (
                  <div className="pt-2">
                    <span className="text-sm font-medium block mb-2">Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {config.features.map(feature => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature === 'pv-anbindung' ? 'PV-Anbindung' :
                           feature === 'lastmanagement' ? 'Lastmanagement' : 'RFID'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Material:</span>
                  <span>{prices.material.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Arbeit + Anfahrt:</span>
                  <span>{prices.arbeit.toFixed(2)}€</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Zwischensumme:</span>
                  <span>{prices.zwischensumme.toFixed(2)}€</span>
                </div>
                {config.foerderung && prices.foerderungsabzug > 0 && (
                  <div className="flex justify-between text-sm text-wallbox-success">
                    <span>Förderabzug:</span>
                    <span>-{prices.foerderungsabzug.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-wallbox-hero">
                  <span>Gesamtpreis:</span>
                  <span>{prices.gesamt.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Configuration */}
          <div className="space-y-6">
            {/* Wallbox Selection */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Wallbox-Modell</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {wallboxOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        config.wallbox.id === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => updateConfig('wallbox', option)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{option.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Art.-Nr.: {option.artikelnummer}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{option.price}€</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Options */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Konfiguration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cable Length */}
                <div>
                  <Label className="text-sm font-medium">Kabellänge (5-25m)</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig('kabel_laenge_m', Math.max(5, config.kabel_laenge_m - 0.5))}
                      disabled={config.kabel_laenge_m <= 5}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-16 text-center">{config.kabel_laenge_m}m</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig('kabel_laenge_m', Math.min(25, config.kabel_laenge_m + 0.5))}
                      disabled={config.kabel_laenge_m >= 25}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Cable Type */}
                <div>
                  <Label className="text-sm font-medium">Leitungstyp</Label>
                  <Select value={config.leitung} onValueChange={(value) => updateConfig('leitung', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NYY-J 5x4mm²">NYY-J 5x4mm²</SelectItem>
                      <SelectItem value="NYY-J 5x6mm²">NYY-J 5x6mm²</SelectItem>
                      <SelectItem value="NYY-J 5x10mm²">NYY-J 5x10mm²</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Durchbrüche */}
                <div>
                  <Label className="text-sm font-medium">Durchbrüche (0-3)</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig('durchbrueche', Math.max(0, config.durchbrueche - 1))}
                      disabled={config.durchbrueche <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-16 text-center">{config.durchbrueche}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig('durchbrueche', Math.min(3, config.durchbrueche + 1))}
                      disabled={config.durchbrueche >= 3}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Arbeitsstunden */}
                <div>
                  <Label className="text-sm font-medium">Arbeitsstunden (1-10)</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig('arbeitsstunden', Math.max(1, config.arbeitsstunden - 1))}
                      disabled={config.arbeitsstunden <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-16 text-center">{config.arbeitsstunden}h</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig('arbeitsstunden', Math.min(10, config.arbeitsstunden + 1))}
                      disabled={config.arbeitsstunden >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Anfahrt Zone */}
                <div>
                  <Label className="text-sm font-medium">Anfahrt Zone</Label>
                  <Select value={config.anfahrt_zone} onValueChange={(value) => updateConfig('anfahrt_zone', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Zone A (50€)</SelectItem>
                      <SelectItem value="B">Zone B (75€)</SelectItem>
                      <SelectItem value="C">Zone C (100€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hauptsicherung */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hauptsicherung"
                    checked={config.hauptsicherung_anpassung}
                    onCheckedChange={(checked) => updateConfig('hauptsicherung_anpassung', checked)}
                  />
                  <Label htmlFor="hauptsicherung" className="text-sm">
                    Hauptsicherung/Zählerschrank Anpassung (+200€)
                  </Label>
                </div>

                {/* Förderung */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="foerderung"
                    checked={config.foerderung}
                    onCheckedChange={(checked) => updateConfig('foerderung', checked)}
                  />
                  <Label htmlFor="foerderung" className="text-sm">
                    KfW-Förderung beantragen (bis 900€)
                  </Label>
                </div>

                {/* Features */}
                <div>
                  <Label className="text-sm font-medium block mb-3">Zusätzliche Features</Label>
                  <div className="space-y-3">
                    {[
                      { id: 'pv-anbindung', label: 'PV-Anbindung' },
                      { id: 'lastmanagement', label: 'Lastmanagement' },
                      { id: 'rfid', label: 'RFID-Zugang' }
                    ].map((feature) => (
                      <div key={feature.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature.id}
                          checked={config.features.includes(feature.id)}
                          onCheckedChange={(checked) => handleFeatureChange(feature.id, checked as boolean)}
                        />
                        <Label htmlFor={feature.id} className="text-sm">
                          {feature.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Data */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Kundendaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={config.kunde.name}
                      onChange={(e) => updateKunde('name', e.target.value)}
                      placeholder="Ihr Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={config.kunde.email}
                      onChange={(e) => updateKunde('email', e.target.value)}
                      placeholder="ihre@email.de"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="plz">PLZ *</Label>
                    <Input
                      id="plz"
                      value={config.kunde.plz}
                      onChange={(e) => updateKunde('plz', e.target.value)}
                      placeholder="12345"
                      maxLength={5}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="adresse">Adresse *</Label>
                    <Input
                      id="adresse"
                      value={config.kunde.adresse}
                      onChange={(e) => updateKunde('adresse', e.target.value)}
                      placeholder="Straße und Hausnummer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-wallbox-surface border-t border-border shadow-elevated">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-2xl font-bold text-wallbox-hero">
                {prices.gesamt.toFixed(2)}€
              </div>
              <div className="text-sm text-muted-foreground">
                Gesamtpreis inkl. Montage
              </div>
            </div>
            <Button 
              onClick={submitConfigurator}
              disabled={isSubmitting}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Erstelle PDF...' : 'PDF-Angebot erstellen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WallboxConfigurator;