import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calculator, Zap, Wrench } from "lucide-react";
import { CartIcon } from "@/components/cart/CartIcon";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-end mb-8">
          <CartIcon onClick={() => navigate('/checkout')} />
        </div>
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Konfigurator
          </h1>
          <p className="text-xl text-muted-foreground">
            Wählen Sie Ihren gewünschten Konfigurator
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Zählerschrank</CardTitle>
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

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Wrench className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Elektrosanierung</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => navigate('/elektrosanierung')}
                className="w-full"
                size="lg"
              >
                Elektrosanierung konfigurieren
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;