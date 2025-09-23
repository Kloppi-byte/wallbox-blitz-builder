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
import { ArrowLeft, Download } from "lucide-react";

interface ZaehlerConfig {
  schrank: { name: string; price: number };
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
  rabatt_prozent: number;
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
    rabatt: number;
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

  const [config, setConfig] = useState<ZaehlerConfig>({
    schrank: { name: "Zählerschrank 3-reihig TAB-konform", price: 520 },
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
    entsorgung_altmaterial: false,
    rabatt_prozent: 0,
  });

  const [calculation, setCalculation] = useState<CalculationResult | null>(null);

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

    const materialkosten =
        (cfg.schrank?.price || 0)
      + (cfg.reiheneinbaugeraete * PREISE.reiheneinbaugeraet)
      + (cfg.rcd_typA ? PREISE.rcd_typA : 0)
      + (cfg.ueberspannungsschutz ? PREISE.spd_typ2 : 0)
      + (cfg.hauptschalter ? PREISE.hauptschalter : 0)
      + (cfg.sammelschiene_zubehoer ? PREISE.sammelschiene_zubehoer : 0)
      + (cfg.feldnachruestung * PREISE.feld)
      + (cfg.leitungsanpassungen_m * PREISE.leitungsanpassung_m);

    const basisStd = 2.5
                   + Math.max(0, (cfg.zaehlerplaetze - 1)) * 0.8
                   + (cfg.feldnachruestung * 0.7)
                   + (cfg.leitungsanpassungen_m * 0.1);
    const altbauFaktor = cfg.altbau ? 1.25 : 1.0;
    const arbeitsstunden_auto = +(basisStd * altbauFaktor).toFixed(1);
    const arbeitsstunden = (cfg.arbeitsstunden_manuell ?? arbeitsstunden_auto);
    const arbeitskosten  = arbeitsstunden * STUNDENSATZ;

    const anfahrtkosten = cfg.anfahrt_zone === 'A' ? 50 : (cfg.anfahrt_zone === 'B' ? 75 : 100);

    const ORGA = {
      anmeld_vnb: 120, plombierer: 45, dokumentation: 60, entsorgung: 25
    };
    const orga =
        (cfg.inbetriebsetzung_vnb ? ORGA.anmeld_vnb : 0)
      + (cfg.plombierung_noetig ? ORGA.plombierer : 0)
      + (cfg.dokumentation_protokolle ? ORGA.dokumentation : 0)
      + (cfg.entsorgung_altmaterial ? ORGA.entsorgung : 0);

    const zwischensumme = materialkosten + arbeitskosten + anfahrtkosten + orga;
    const rabatt = cfg.rabatt_prozent ? zwischensumme * (cfg.rabatt_prozent / 100) : 0;
    const netto = Math.max(0, zwischensumme - rabatt);
    const mwst = netto * (MWST_SATZ / 100);
    const brutto = netto + mwst;

    return {
      input: cfg,
      details: {
        materialkosten: +materialkosten.toFixed(2),
        arbeitsstunden: +arbeitsstunden.toFixed(1),
        arbeitskosten: +arbeitskosten.toFixed(2),
        anfahrtkosten: +anfahrtkosten.toFixed(2),
        orga: +orga.toFixed(2),
        rabatt: +rabatt.toFixed(2)
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
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const exportJSON = () => {
    if (calculation) {
      const dataStr = JSON.stringify(calculation, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'zaehler-kalkulation.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Auswahl
          </Button>
          
          {calculation && (
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">
                {calculation.summe.brutto.toFixed(2)} €
              </div>
              <div className="text-sm text-muted-foreground">
                Netto: {calculation.summe.netto.toFixed(2)} € | 
                MwSt: {calculation.summe.mwst_betrag.toFixed(2)} €
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Zählerschrank Konfiguration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Schrank */}
                <div className="space-y-2">
                  <Label htmlFor="schrank">Schrank</Label>
                  <Select 
                    value={config.schrank.name} 
                    onValueChange={(value) => updateConfig('schrank', { name: value, price: 520 })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Zählerschrank 3-reihig TAB-konform">
                        Zählerschrank 3-reihig TAB-konform (520 €)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Zählerplätze */}
                <div className="space-y-2">
                  <Label htmlFor="zaehlerplaetze">Zählerplätze</Label>
                  <Input
                    id="zaehlerplaetze"
                    type="number"
                    min={1}
                    max={3}
                    value={config.zaehlerplaetze}
                    onChange={(e) => updateConfig('zaehlerplaetze', parseInt(e.target.value) || 1)}
                  />
                </div>

                {/* Reiheneinbaugeräte */}
                <div className="space-y-2">
                  <Label htmlFor="reiheneinbaugeraete">Reiheneinbaugeräte</Label>
                  <Input
                    id="reiheneinbaugeraete"
                    type="number"
                    min={0}
                    max={24}
                    value={config.reiheneinbaugeraete}
                    onChange={(e) => updateConfig('reiheneinbaugeraete', parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Checkboxen */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rcd_typA"
                      checked={config.rcd_typA}
                      onCheckedChange={(checked) => updateConfig('rcd_typA', checked)}
                    />
                    <Label htmlFor="rcd_typA">RCD Typ A (95 €)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ueberspannungsschutz"
                      checked={config.ueberspannungsschutz}
                      onCheckedChange={(checked) => updateConfig('ueberspannungsschutz', checked)}
                    />
                    <Label htmlFor="ueberspannungsschutz">Überspannungsschutz (110 €)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hauptschalter"
                      checked={config.hauptschalter}
                      onCheckedChange={(checked) => updateConfig('hauptschalter', checked)}
                    />
                    <Label htmlFor="hauptschalter">Hauptschalter (65 €)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sammelschiene_zubehoer"
                      checked={config.sammelschiene_zubehoer}
                      onCheckedChange={(checked) => updateConfig('sammelschiene_zubehoer', checked)}
                    />
                    <Label htmlFor="sammelschiene_zubehoer">Sammelschiene Zubehör (35 €)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="altbau"
                      checked={config.altbau}
                      onCheckedChange={(checked) => updateConfig('altbau', checked)}
                    />
                    <Label htmlFor="altbau">Altbau (Arbeitszeit +25%)</Label>
                  </div>
                </div>

                {/* Feldnachrüstung */}
                <div className="space-y-2">
                  <Label htmlFor="feldnachruestung">Feldnachrüstung</Label>
                  <Input
                    id="feldnachruestung"
                    type="number"
                    min={0}
                    max={3}
                    value={config.feldnachruestung}
                    onChange={(e) => updateConfig('feldnachruestung', parseInt(e.target.value) || 0)}
                  />
                  <div className="text-sm text-muted-foreground">120 € pro Feld</div>
                </div>

                {/* Leitungsanpassungen */}
                <div className="space-y-2">
                  <Label htmlFor="leitungsanpassungen_m">Leitungsanpassungen (m)</Label>
                  <Input
                    id="leitungsanpassungen_m"
                    type="number"
                    min={0}
                    max={50}
                    value={config.leitungsanpassungen_m}
                    onChange={(e) => updateConfig('leitungsanpassungen_m', parseInt(e.target.value) || 0)}
                  />
                  <div className="text-sm text-muted-foreground">8 € pro Meter</div>
                </div>

                {/* Anfahrt Zone */}
                <div className="space-y-3">
                  <Label>Anfahrt Zone</Label>
                  <RadioGroup 
                    value={config.anfahrt_zone} 
                    onValueChange={(value) => updateConfig('anfahrt_zone', value as 'A' | 'B' | 'C')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="zone-a" />
                      <Label htmlFor="zone-a">Zone A (50 €)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="zone-b" />
                      <Label htmlFor="zone-b">Zone B (75 €)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="zone-c" />
                      <Label htmlFor="zone-c">Zone C (100 €)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Orga Checkboxen */}
                <div className="space-y-3">
                  <Label>Organisation</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="inbetriebsetzung_vnb"
                        checked={config.inbetriebsetzung_vnb}
                        onCheckedChange={(checked) => updateConfig('inbetriebsetzung_vnb', checked)}
                      />
                      <Label htmlFor="inbetriebsetzung_vnb">Inbetriebsetzung VNB (120 €)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="plombierung_noetig"
                        checked={config.plombierung_noetig}
                        onCheckedChange={(checked) => updateConfig('plombierung_noetig', checked)}
                      />
                      <Label htmlFor="plombierung_noetig">Plombierung nötig (45 €)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dokumentation_protokolle"
                        checked={config.dokumentation_protokolle}
                        onCheckedChange={(checked) => updateConfig('dokumentation_protokolle', checked)}
                      />
                      <Label htmlFor="dokumentation_protokolle">Dokumentation/Protokolle (60 €)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="entsorgung_altmaterial"
                        checked={config.entsorgung_altmaterial}
                        onCheckedChange={(checked) => updateConfig('entsorgung_altmaterial', checked)}
                      />
                      <Label htmlFor="entsorgung_altmaterial">Entsorgung Altmaterial (25 €)</Label>
                    </div>
                  </div>
                </div>

                {/* Rabatt */}
                <div className="space-y-2">
                  <Label htmlFor="rabatt_prozent">Rabatt (%)</Label>
                  <Input
                    id="rabatt_prozent"
                    type="number"
                    min={0}
                    max={30}
                    value={config.rabatt_prozent}
                    onChange={(e) => updateConfig('rabatt_prozent', parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Manuelle Arbeitsstunden */}
                <div className="space-y-2">
                  <Label htmlFor="arbeitsstunden_manuell">Arbeitsstunden (manuell)</Label>
                  <Input
                    id="arbeitsstunden_manuell"
                    type="number"
                    step={0.1}
                    value={config.arbeitsstunden_manuell || ''}
                    onChange={(e) => updateConfig('arbeitsstunden_manuell', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Auto-Berechnung"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calculation */}
          <div className="space-y-6">
            {calculation && (
              <Card>
                <CardHeader>
                  <CardTitle>Kostenaufschlüsselung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Material:</span>
                      <span>{calculation.details.materialkosten.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arbeitskosten ({calculation.details.arbeitsstunden}h):</span>
                      <span>{calculation.details.arbeitskosten.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anfahrt:</span>
                      <span>{calculation.details.anfahrtkosten.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Organisation:</span>
                      <span>{calculation.details.orga.toFixed(2)} €</span>
                    </div>
                    {calculation.details.rabatt > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Rabatt:</span>
                        <span>-{calculation.details.rabatt.toFixed(2)} €</span>
                      </div>
                    )}
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Netto:</span>
                      <span>{calculation.summe.netto.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MwSt ({calculation.summe.mwst_satz_prozent}%):</span>
                      <span>{calculation.summe.mwst_betrag.toFixed(2)} €</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-xl font-bold">
                      <span>Brutto:</span>
                      <span>{calculation.summe.brutto.toFixed(2)} €</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    JSON anzeigen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-96 overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Kalkulation JSON</DialogTitle>
                  </DialogHeader>
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                    {JSON.stringify(calculation, null, 2)}
                  </pre>
                </DialogContent>
              </Dialog>

              <Button onClick={exportJSON} className="w-full flex items-center gap-2">
                <Download className="w-4 h-4" />
                JSON exportieren
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Zaehler;