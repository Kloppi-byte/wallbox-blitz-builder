import { CartSummary } from "@/components/cart/CartSummary";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Checkout = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <CartSummary />
        </div>
      </div>
    </div>
  );
};

export default Checkout;