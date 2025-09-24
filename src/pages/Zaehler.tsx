import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ShoppingCart } from "lucide-react";
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartSheet } from '@/components/cart/CartSheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface ZaehlerOption {
  artikelnummer: number;
  name: string;
  price: number;
  beschreibung?: string;
  kategorie?: string;
}
interface ZaehlerConfig {
  schrank: ZaehlerOption;
  zaehlerplaetze: number;
  reiheneinbaugeraete: number;
  rcd_typA: boolean;
  ueberspannungsschutz: boolean;
  hauptschalter: boolean;
  sammelschiene_zubehoer: boolean;
  feldnachruestung: number;
  leitungsanpassungen_m: number;
  altbau: boolean;
  anfahrt_zone: 'A' | 'B' | 'C';
  inbetriebsetzung_vnb: boolean;
  plombierung_noetig: boolean;
  dokumentation_protokolle: boolean;
  entsorgung_altmaterial: boolean;
  arbeitsstunden_manuell?: number;
}
interface CalculationResult {
  input: ZaehlerConfig;
  details: {
    materialkosten: number;
    arbeitsstunden: number;
    arbeitskosten: number;
    anfahrtkosten: number;
    orga: number;
  };
  summe: {
    netto: number;
    mwst_satz_prozent: number;
    mwst_betrag: number;
    brutto: number;
  };
}
const Zaehler = () => {
  const navigate = useNavigate();
  const {
    addItem
  } = useCart();
  const {
    toast
  } = useToast();
  const [zaehlerOptions, setZaehlerOptions] = useState<ZaehlerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ZaehlerConfig>({
    schrank: {
      artikelnummer: 0,
      name: "",
      price: 0
    },
    zaehlerplaetze: 1,
    reiheneinbaugeraete: 6,
    rcd_typA: false,
    ueberspannungsschutz: false,
    hauptschalter: false,
    sammelschiene_zubehoer: false,
    feldnachruestung: 0,
    leitungsanpassungen_m: 6,
    altbau: false,
    anfahrt_zone: 'A',
    inbetriebsetzung_vnb: false,
    plombierung_noetig: false,
    dokumentation_protokolle: false,
    entsorgung_altmaterial: false
  });
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Fetch Zählerschränke from Supabase
  useEffect(() => {
    const fetchZaehlerOptions = async () => {
      try {
        const {
          data,
          error
        } = await (supabase as any).from('zählerschränke').select('Name, "VK VK30", "Artikelnummer", Beschreibung, Kategorie').order('"Artikelnummer"');
        if (error) {
          toast({
            title: "Fehler beim Laden",
            description: "Zählerschränke konnten nicht geladen werden.",
            variant: "destructive"
          });
          return;
        }
        if (data && data.length > 0) {
          const options: ZaehlerOption[] = data.map(item => {
            const raw = (item["VK VK30"] ?? null) as string | null;
            const price = raw ? Number(String(raw).replace(/\./g, '').replace(',', '.')) : 520;
            return {
              artikelnummer: item.Artikelnummer,
              name: item.Name || `Artikel ${item.Artikelnummer}`,
              price,
              beschreibung: item.Beschreibung,
              kategorie: item.Kategorie
            };
          });
          setZaehlerOptions(options);

          // Set first option as default
          if (options.length > 0) {
            setConfig(prev => ({
              ...prev,
              schrank: options[0]
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching Zählerschränke:', error);
        toast({
          title: "Fehler",
          description: "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchZaehlerOptions();
  }, [toast]);
  function calculateZaehlerPrices(cfg: ZaehlerConfig): CalculationResult {
    const PREISE = {
      rcd_typA: 95,
      spd_typ2: 110,
      hauptschalter: 65,
      reiheneinbaugeraet: 14,
      sammelschiene_zubehoer: 35,
      feld: 120,
      leitungsanpassung_m: 8
    };
    const STUNDENSATZ = 75;
    const MWST_SATZ = 19;
    const materialkosten = (cfg.schrank?.price || 0) + cfg.reiheneinbaugeraete * PREISE.reiheneinbaugeraet + (cfg.rcd_typA ? PREISE.rcd_typA : 0) + (cfg.ueberspannungsschutz ? PREISE.spd_typ2 : 0) + (cfg.hauptschalter ? PREISE.hauptschalter : 0) + (cfg.sammelschiene_zubehoer ? PREISE.sammelschiene_zubehoer : 0) + cfg.feldnachruestung * PREISE.feld + cfg.leitungsanpassungen_m * PREISE.leitungsanpassung_m;
    const basisStd = 2.5 + Math.max(0, cfg.zaehlerplaetze - 1) * 0.8 + cfg.feldnachruestung * 0.7 + cfg.leitungsanpassungen_m * 0.1;
    const altbauFaktor = cfg.altbau ? 1.25 : 1.0;
    const arbeitsstunden_auto = Math.round(basisStd * altbauFaktor);
    const arbeitsstunden = cfg.arbeitsstunden_manuell ?? arbeitsstunden_auto;
    const arbeitskosten = arbeitsstunden * STUNDENSATZ;
    const anfahrtkosten = cfg.anfahrt_zone === 'A' ? 50 : cfg.anfahrt_zone === 'B' ? 75 : 100;
    const ORGA = {
      anmeld_vnb: 120,
      plombierer: 45,
      dokumentation: 60,
      entsorgung: 25
    };
    const orga = (cfg.inbetriebsetzung_vnb ? ORGA.anmeld_vnb : 0) + (cfg.plombierung_noetig ? ORGA.plombierer : 0) + (cfg.dokumentation_protokolle ? ORGA.dokumentation : 0) + (cfg.entsorgung_altmaterial ? ORGA.entsorgung : 0);
    const zwischensumme = materialkosten + arbeitskosten + anfahrtkosten + orga;
    const netto = Math.max(0, zwischensumme);
    const mwst = netto * (MWST_SATZ / 100);
    const brutto = netto + mwst;
    return {
      input: cfg,
      details: {
        materialkosten: +materialkosten.toFixed(2),
        arbeitsstunden: Math.round(arbeitsstunden),
        arbeitskosten: +arbeitskosten.toFixed(2),
        anfahrtkosten: +anfahrtkosten.toFixed(2),
        orga: +orga.toFixed(2)
      },
      summe: {
        netto: +netto.toFixed(2),
        mwst_satz_prozent: MWST_SATZ,
        mwst_betrag: +mwst.toFixed(2),
        brutto: +brutto.toFixed(2)
      }
    };
  }
  useEffect(() => {
    const result = calculateZaehlerPrices(config);
    setCalculation(result);
  }, [config]);
  const updateConfig = (key: keyof ZaehlerConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const addToCart = () => {
    if (calculation) {
      addItem({
        productType: 'other',
        name: `Zählerschrank - ${config.schrank.name}`,
        configuration: config,
        pricing: {
          materialCosts: calculation.details.materialkosten,
          laborCosts: calculation.details.arbeitskosten,
          travelCosts: calculation.details.anfahrtkosten,
          subtotal: calculation.summe.netto,
          subsidy: 0,
          total: calculation.summe.brutto
        }
      });
    }
  };
  const exportJSON = () => {
    if (calculation) {
      const dataStr = JSON.stringify(calculation, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = 'zaehler-kalkulation.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Zählerschränke...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
            ← Zurück zur Hauptseite
          </Button>
          <h1 className="text-xl font-semibold mx-[260px]">Zählerschrank Konfigurator</h1>
          <div className="flex-1" />
          <CartIcon onClick={() => setCartOpen(true)} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 pb-32">

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Package Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Paketübersicht</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ihr zusammengestelltes Zählerschrank-Paket
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculation && <>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Schrank-Modell:</span>
                      <span>{config.schrank.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Zählerplätze:</span>
                      <span>{config.zaehlerplaetze}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Reiheneinbaugeräte:</span>
                      <span>{config.reiheneinbaugeraete}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Leitungsanpassungen:</span>
                      <span>{config.leitungsanpassungen_m}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Arbeitsaufwand:</span>
                      <span>{calculation.details.arbeitsstunden} Std</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Anfahrt:</span>
                      <span>Zone {config.anfahrt_zone}</span>
                    </div>
                    {config.altbau && <div className="flex justify-between">
                        <span className="font-medium">Altbau:</span>
                        <span>Ja</span>
                      </div>}
                  </div>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Material:</span>
                      <span>{calculation.details.materialkosten.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arbeit + Anfahrt:</span>
                      <span>{(calculation.details.arbeitskosten + calculation.details.anfahrtkosten).toFixed(2)}€</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Zwischensumme:</span>
                      <span>{calculation.summe.brutto.toFixed(2)}€</span>
                    </div>
                  </div>

                  <Button onClick={addToCart} className="w-full mt-4" size="lg">
                    In den Warenkorb
                  </Button>
                </>}
            </CardContent>
          </Card>

          {/* Right Column - Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Schrank-Modell</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schrank Selection */}
              <div className="space-y-2">
                <Label>Zählerschrank auswählen</Label>
                <Select value={config.schrank.artikelnummer.toString()} onValueChange={value => {
                const selectedSchrank = zaehlerOptions.find(option => option.artikelnummer.toString() === value);
                if (selectedSchrank) {
                  updateConfig('schrank', selectedSchrank);
                }
              }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Zählerschrank wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {zaehlerOptions.map(option => <SelectItem key={option.artikelnummer} value={option.artikelnummer.toString()}>
                        {option.name} - {option.price}€
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Schrank Display */}
              <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{config.schrank.name}</h3>
                    <p className="text-sm text-muted-foreground">Art.-Nr.: {config.schrank.artikelnummer}</p>
                    {config.schrank.beschreibung && <p className="text-sm text-muted-foreground mt-1">{config.schrank.beschreibung}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{config.schrank.price}€</span>
                  </div>
                </div>
              </div>

              {/* Configuration Options */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zaehlerplaetze">Zählerplätze</Label>
                    <Input id="zaehlerplaetze" type="number" min={1} max={3} value={config.zaehlerplaetze} onChange={e => updateConfig('zaehlerplaetze', parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label htmlFor="reiheneinbaugeraete">Reiheneinbaugeräte</Label>
                    <Input id="reiheneinbaugeraete" type="number" min={0} max={24} value={config.reiheneinbaugeraete} onChange={e => updateConfig('reiheneinbaugeraete', parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feldnachruestung">Feldnachrüstung</Label>
                    <Input id="feldnachruestung" type="number" min={0} max={3} value={config.feldnachruestung} onChange={e => updateConfig('feldnachruestung', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label htmlFor="leitungsanpassungen_m">Leitungsanpassungen (m)</Label>
                    <Input id="leitungsanpassungen_m" type="number" min={0} max={50} value={config.leitungsanpassungen_m} onChange={e => updateConfig('leitungsanpassungen_m', parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rcd_typA" checked={config.rcd_typA} onCheckedChange={checked => updateConfig('rcd_typA', checked)} />
                    <Label htmlFor="rcd_typA">RCD Typ A (+95€)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="ueberspannungsschutz" checked={config.ueberspannungsschutz} onCheckedChange={checked => updateConfig('ueberspannungsschutz', checked)} />
                    <Label htmlFor="ueberspannungsschutz">Überspannungsschutz (+110€)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="hauptschalter" checked={config.hauptschalter} onCheckedChange={checked => updateConfig('hauptschalter', checked)} />
                    <Label htmlFor="hauptschalter">Hauptschalter (+65€)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="sammelschiene_zubehoer" checked={config.sammelschiene_zubehoer} onCheckedChange={checked => updateConfig('sammelschiene_zubehoer', checked)} />
                    <Label htmlFor="sammelschiene_zubehoer">Sammelschiene Zubehör (+35€)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="altbau" checked={config.altbau} onCheckedChange={checked => updateConfig('altbau', checked)} />
                    <Label htmlFor="altbau">Altbau (Arbeitszeit +25%)</Label>
                  </div>
                </div>

                {/* Anfahrt Zone */}
                <div className="space-y-3">
                  <Label>Anfahrt Zone</Label>
                  <RadioGroup value={config.anfahrt_zone} onValueChange={value => updateConfig('anfahrt_zone', value as 'A' | 'B' | 'C')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="zone-a" />
                      <Label htmlFor="zone-a">Zone A (50€)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="zone-b" />
                      <Label htmlFor="zone-b">Zone B (75€)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="zone-c" />
                      <Label htmlFor="zone-c">Zone C (100€)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Orga Checkboxes */}
                <div className="space-y-3">
                  <Label>Organisation</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="inbetriebsetzung_vnb" checked={config.inbetriebsetzung_vnb} onCheckedChange={checked => updateConfig('inbetriebsetzung_vnb', checked)} />
                      <Label htmlFor="inbetriebsetzung_vnb">Inbetriebsetzung VNB (+120€)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="plombierung_noetig" checked={config.plombierung_noetig} onCheckedChange={checked => updateConfig('plombierung_noetig', checked)} />
                      <Label htmlFor="plombierung_noetig">Plombierung nötig (+45€)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="dokumentation_protokolle" checked={config.dokumentation_protokolle} onCheckedChange={checked => updateConfig('dokumentation_protokolle', checked)} />
                      <Label htmlFor="dokumentation_protokolle">Dokumentation/Protokolle (+60€)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="entsorgung_altmaterial" checked={config.entsorgung_altmaterial} onCheckedChange={checked => updateConfig('entsorgung_altmaterial', checked)} />
                      <Label htmlFor="entsorgung_altmaterial">Entsorgung Altmaterial (+25€)</Label>
                    </div>
                  </div>
                </div>


                {/* Manuelle Arbeitsstunden */}
                <div className="space-y-2">
                  <Label htmlFor="arbeitsstunden_manuell">Arbeitsstunden (manuell)</Label>
                  <Input id="arbeitsstunden_manuell" type="number" step={1} value={config.arbeitsstunden_manuell || ''} onChange={e => updateConfig('arbeitsstunden_manuell', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto-Berechnung" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      {calculation && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-primary">
                  {calculation.summe.brutto.toFixed(2)}€
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
      )}
      
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>;
};
export default Zaehler;