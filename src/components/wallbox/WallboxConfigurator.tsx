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
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { Minus, Plus, Zap, Download, Euro } from 'lucide-react';
interface WallboxOption {
  id: string;
  name: string;
  price: number;
  artikelnummer: string;
}
interface CableOption {
  name: string;
  price: number;
  artikelnummer: string;
}
interface ConfigState {
  wallbox: WallboxOption;
  kabel_laenge_m: number;
  leitung: CableOption;
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
    wallbox: {
      id: "goe-11",
      name: "go-e 11kW",
      price: 390,
      artikelnummer: "1002"
    },
    kabel_laenge_m: 7.5,
    leitung: {
      name: "NYY-J 5x6mm²",
      price: 0,
      artikelnummer: ""
    },
    absicherung: "FI/LS",
    durchbrueche: 1,
    arbeitsstunden: 4,
    anfahrt_zone: "A",
    hauptsicherung_anpassung: false,
    foerderung: false,
    features: [],
    kunde: {
      name: "",
      email: "",
      plz: "",
      adresse: ""
    }
  });
  const [wallboxOptions, setWallboxOptions] = useState<WallboxOption[]>([]);
  const [cableOptions, setCableOptions] = useState<CableOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const {
    addItem,
    setCustomerData
  } = useCart();
  const {
    toast
  } = useToast();
  useEffect(() => {
    const fetchWallboxesAndCables = async () => {
      try {
        // Fetch Wallboxes
        const {
          data: wallboxData,
          error: wallboxError
        } = await supabase.from('wallboxen').select('Name, "VK VK30", "Artikelnummer", Kategorie').eq('Kategorie', 'Wallbox').order('Artikelnummer', {
          ascending: true
        });

        // Fetch Cables
        const {
          data: cableData,
          error: cableError
        } = await supabase.from('wallboxen').select('Name, "VK VK30", "Artikelnummer", Kategorie').eq('Kategorie', 'Kabel').order('Artikelnummer', {
          ascending: true
        });
        if (!wallboxError && wallboxData) {
          const options = wallboxData.map((item, index) => ({
            id: `wallbox-${index}`,
            name: item.Name || 'Unbekannt',
            price: parseFloat(item["VK VK30"] || "0"),
            artikelnummer: item.Artikelnummer?.toString() || ""
          }));
          setWallboxOptions(options);
          if (options.length > 0) {
            setConfig(prev => ({
              ...prev,
              wallbox: options[0]
            }));
          }
        }
        if (!cableError && cableData) {
          const cableOpts = cableData.map(item => ({
            name: item.Name || 'Unbekannt',
            price: parseFloat(item["VK VK30"] || "0"),
            artikelnummer: item.Artikelnummer?.toString() || ""
          }));
          setCableOptions(cableOpts);
          if (cableOpts.length > 0) {
            setConfig(prev => ({
              ...prev,
              leitung: cableOpts[0]
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching wallboxes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWallboxesAndCables();
  }, []);
  const calculatePrices = () => {
    const materialkosten = config.wallbox.price + config.leitung.price * config.kabel_laenge_m + config.durchbrueche * 50 + (config.hauptsicherung_anpassung ? 200 : 0);
    const arbeitskosten = config.arbeitsstunden * 75;
    const anfahrtkosten = config.anfahrt_zone === 'A' ? 50 : config.anfahrt_zone === 'B' ? 75 : 100;
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
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const updateKunde = (key: keyof ConfigState['kunde'], value: string) => {
    setConfig(prev => ({
      ...prev,
      kunde: {
        ...prev.kunde,
        [key]: value
      }
    }));
  };
  const handleFeatureChange = (featureId: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      features: checked ? [...prev.features, featureId] : prev.features.filter(f => f !== featureId)
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

      // Send to webhook via GET mit gesamter Konfiguration
      const webhookUrl = new URL('https://hwg-samuel.app.n8n.cloud/webhook-test/aa9cf5bf-f3ed-4d4b-a03d-254628aeca06');
      webhookUrl.searchParams.append('name', config.kunde.name);
      webhookUrl.searchParams.append('email', config.kunde.email);
      webhookUrl.searchParams.append('plz', config.kunde.plz);
      webhookUrl.searchParams.append('adresse', config.kunde.adresse);
      webhookUrl.searchParams.append('wallbox_typ', config.wallbox.artikelnummer);
      webhookUrl.searchParams.append('installation', 'konfigurator');
      webhookUrl.searchParams.append('foerderung', String(config.foerderung));
      webhookUrl.searchParams.append('konfiguration', JSON.stringify(config));
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
  const addToCart = () => {
    const prices = calculatePrices();
    const cartItem = {
      productType: 'wallbox' as const,
      name: `${config.wallbox.name} - Wallbox Installation`,
      configuration: {
        wallbox: config.wallbox,
        kabel_laenge_m: config.kabel_laenge_m,
        leitung: config.leitung,
        absicherung: config.absicherung,
        durchbrueche: config.durchbrueche,
        arbeitsstunden: config.arbeitsstunden,
        anfahrt_zone: config.anfahrt_zone,
        hauptsicherung_anpassung: config.hauptsicherung_anpassung,
        foerderung: config.foerderung
      },
      pricing: {
        materialCosts: prices.material,
        laborCosts: prices.arbeit,
        travelCosts: 0,
        // included in arbeit
        subtotal: prices.zwischensumme,
        subsidy: prices.foerderungsabzug,
        total: prices.gesamt
      }
    };
    addItem(cartItem);
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Lade Konfigurator...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-subtle pb-24">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header with Cart */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.location.href = '/'} className="text-muted-foreground hover:text-foreground">
              ← Zurück zur Hauptseite
            </Button>
            
          </div>
          <CartIcon onClick={() => setIsCartOpen(true)} />
        </div>

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
                  <span className="text-sm">{config.leitung.name}</span>
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
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Material:</span>
                  <span className="mx-[200px]">{prices.material.toFixed(2)}€</span>
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
                {config.foerderung && prices.foerderungsabzug > 0 && <div className="flex justify-between text-sm text-wallbox-success">
                    <span>Förderabzug:</span>
                    <span>-{prices.foerderungsabzug.toFixed(2)}€</span>
                  </div>}
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
              <CardContent className="space-y-6">
                {/* Wallbox Selection */}
                <div className="space-y-2">
                  <Label>Wallbox auswählen</Label>
                  <Select value={config.wallbox.artikelnummer} onValueChange={value => {
                  const selectedWallbox = wallboxOptions.find(option => option.artikelnummer === value);
                  if (selectedWallbox) {
                    updateConfig('wallbox', selectedWallbox);
                  }
                }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Wallbox wählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {wallboxOptions.map(option => <SelectItem key={option.artikelnummer} value={option.artikelnummer}>
                          {option.name} - {option.price}€
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Wallbox Display */}
                <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{config.wallbox.name}</h3>
                      <p className="text-sm text-muted-foreground">Art.-Nr.: {config.wallbox.artikelnummer}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">{config.wallbox.price}€</span>
                    </div>
                  </div>
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
                    <Button variant="outline" size="sm" onClick={() => updateConfig('kabel_laenge_m', Math.max(5, config.kabel_laenge_m - 0.5))} disabled={config.kabel_laenge_m <= 5}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-16 text-center">{config.kabel_laenge_m}m</span>
                    <Button variant="outline" size="sm" onClick={() => updateConfig('kabel_laenge_m', Math.min(25, config.kabel_laenge_m + 0.5))} disabled={config.kabel_laenge_m >= 25}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Cable Type */}
                <div>
                  <Label className="text-sm font-medium">Leitungstyp</Label>
                  <Select value={config.leitung.artikelnummer} onValueChange={value => {
                  const selectedCable = cableOptions.find(cable => cable.artikelnummer === value);
                  if (selectedCable) {
                    updateConfig('leitung', selectedCable);
                  }
                }}>
                    <SelectTrigger className="mt-2 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {cableOptions.map(cable => <SelectItem key={cable.artikelnummer} value={cable.artikelnummer}>
                          {cable.name} - {cable.price}€/m
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Durchbrüche */}
                <div>
                  <Label className="text-sm font-medium">Durchbrüche (0-3)</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Button variant="outline" size="sm" onClick={() => updateConfig('durchbrueche', Math.max(0, config.durchbrueche - 1))} disabled={config.durchbrueche <= 0}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-16 text-center">{config.durchbrueche}</span>
                    <Button variant="outline" size="sm" onClick={() => updateConfig('durchbrueche', Math.min(3, config.durchbrueche + 1))} disabled={config.durchbrueche >= 3}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Arbeitsstunden */}
                <div>
                  <Label className="text-sm font-medium">Arbeitsstunden (1-10)</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Button variant="outline" size="sm" onClick={() => updateConfig('arbeitsstunden', Math.max(1, config.arbeitsstunden - 1))} disabled={config.arbeitsstunden <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-16 text-center">{config.arbeitsstunden}h</span>
                    <Button variant="outline" size="sm" onClick={() => updateConfig('arbeitsstunden', Math.min(10, config.arbeitsstunden + 1))} disabled={config.arbeitsstunden >= 10}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Anfahrt Zone */}
                <div>
                  <Label className="text-sm font-medium">Anfahrt Zone</Label>
                  <Select value={config.anfahrt_zone} onValueChange={value => updateConfig('anfahrt_zone', value)}>
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
                  <Switch id="hauptsicherung" checked={config.hauptsicherung_anpassung} onCheckedChange={checked => updateConfig('hauptsicherung_anpassung', checked)} />
                  <Label htmlFor="hauptsicherung" className="text-sm">
                    Hauptsicherung/Zählerschrank Anpassung (+200€)
                  </Label>
                </div>

                {/* Förderung */}
                <div className="flex items-center space-x-2">
                  <Switch id="foerderung" checked={config.foerderung} onCheckedChange={checked => updateConfig('foerderung', checked)} />
                  <Label htmlFor="foerderung" className="text-sm">
                    KfW-Förderung beantragen (bis 900€)
                  </Label>
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
            <div className="flex gap-3">
              <Button onClick={addToCart} variant="outline" size="lg">
                Zum Warenkorb hinzufügen
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cart Sheet */}
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>;
};
export default WallboxConfigurator;