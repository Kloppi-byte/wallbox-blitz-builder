import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calculator, Zap, Wrench } from "lucide-react";
import { CartIcon } from "@/components/cart/CartIcon";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
const Landing = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Fehler beim Abmelden");
    } else {
      toast.success("Erfolgreich abgemeldet");
    }
  };
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4 items-center">
            {session ? (
              <>
                <span className="text-sm text-muted-foreground">{session.user.email}</span>
                <Button variant="outline" onClick={handleLogout}>
                  Abmelden
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                Anmelden
              </Button>
            )}
          </div>
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
              
              <CardTitle className="text-2xl">Zählerschrank</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/zaehler')} className="w-full" size="lg">
                Zählerschrank konfigurieren
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              
              <CardTitle className="text-2xl">Wallbox</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/wallbox')} className="w-full" size="lg">
                Wallbox konfigurieren
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              
              <CardTitle className="text-2xl">Elektrosanierung</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/elektrosanierung')} className="w-full" size="lg">
                Elektrosanierung konfigurieren
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Landing;