import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calculator, Zap } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Konfigurator
          </h1>
          <p className="text-xl text-muted-foreground">
            Wählen Sie Ihren gewünschten Konfigurator
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Zählerschrank</CardTitle>
              <CardDescription>
                Konfigurieren Sie Ihren Zählerschrank mit Live-Preiskalkulation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => navigate('/zaehler')}
                className="w-full"
                size="lg"
              >
                Zählerschrank konfigurieren
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Wallbox</CardTitle>
              <CardDescription>
                Konfigurieren Sie Ihre Wallbox-Installation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => navigate('/wallbox')}
                className="w-full"
                size="lg"
              >
                Wallbox konfigurieren
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;