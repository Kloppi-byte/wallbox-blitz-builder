import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle, Mail, Clock, Download, FileText, ExternalLink } from 'lucide-react';
import { WallboxData } from '../WallboxFunnel';

interface SuccessStepProps {
  data: WallboxData;
  updateData: (data: Partial<WallboxData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  submitLead: () => void;
  isSubmitting: boolean;
  canGoBack: boolean;
}

const SuccessStep = ({ data }: SuccessStepProps) => {
  const handleRestart = () => {
    window.location.reload();
  };

  const handleDownload = () => {
    if (data.pdfUrl && data.pdfName) {
      const link = document.createElement('a');
      link.href = data.pdfUrl;
      link.download = data.pdfName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleViewPdf = () => {
    if (data.pdfUrl) {
      window.open(data.pdfUrl, '_blank');
    }
  };

  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-wallbox-success/10 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-wallbox-success" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Perfekt! Dein Angebot ist unterwegs
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Vielen Dank für dein Interesse, {data.name}! Wir erstellen jetzt dein persönliches 
          Wallbox-Angebot und senden es in wenigen Minuten an deine E-Mail-Adresse.
        </p>
      </div>

      {/* Success Details */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="border-0 shadow-card bg-wallbox-surface-elevated">
          <CardHeader className="pb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-wallbox-success/10 rounded-lg mb-2">
              <Mail className="w-6 h-6 text-wallbox-success" />
            </div>
            <h3 className="font-semibold">E-Mail versendet</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Angebot wird an {data.email} gesendet
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-wallbox-surface-elevated">
          <CardHeader className="pb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-2">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Innerhalb von 5 Min</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dein Angebot wird schnell bearbeitet
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-wallbox-surface-elevated">
          <CardHeader className="pb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-2">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">PDF-Angebot</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Detailliertes Angebot als PDF
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="max-w-2xl mx-auto shadow-card">
        <CardHeader>
          <h3 className="text-xl font-semibold">Deine Auswahl im Überblick</h3>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wallbox-Typ:</span>
            <span className="font-medium">{data.wallbox_typ}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Installation:</span>
            <span className="font-medium">{data.installation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Förderung:</span>
            <span className="font-medium">{data.foerderung ? 'Ja' : 'Nein'}</span>
          </div>
          {data.features && data.features.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extras:</span>
              <span className="font-medium">{data.features.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Display and Download */}
      {data.pdfUrl && (
        <div className="space-y-4">
          <Card className="max-w-4xl mx-auto bg-wallbox-success/5 border-wallbox-success/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-wallbox-success/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-wallbox-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Dein Angebot ist fertig!</h4>
                    <p className="text-sm text-muted-foreground">{data.pdfName || 'Wallbox-Angebot.pdf'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleViewPdf} variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Ansehen
                  </Button>
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="w-4 h-4" />
                    Herunterladen
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Next Steps */}
      <Card className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">Was passiert als nächstes?</h4>
          <ul className="text-sm text-muted-foreground space-y-1 text-left">
            <li>• Du erhältst dein PDF-Angebot per E-Mail</li>
            <li>• Bei Fragen melden wir uns telefonisch bei dir</li>
            <li>• Bei Interesse vereinbaren wir einen Beratungstermin</li>
          </ul>
        </CardContent>
      </Card>

      {/* Action */}
      <div className="space-y-4">
        <Button 
          onClick={handleRestart}
          variant="outline"
          className="px-8"
        >
          Neues Angebot erstellen
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Du kannst dieses Fenster jetzt schließen
        </p>
      </div>
    </div>
  );
};

export default SuccessStep;