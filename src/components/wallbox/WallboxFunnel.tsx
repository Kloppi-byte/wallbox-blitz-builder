import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import IntroStep from './steps/IntroStep';
import WallboxTypeStep from './steps/WallboxTypeStep';
import InstallationStep from './steps/InstallationStep';
import FoerderungStep from './steps/FoerderungStep';
import FeaturesStep from './steps/FeaturesStep';
import ContactStep from './steps/ContactStep';
import SuccessStep from './steps/SuccessStep';
import ProgressBar from './ProgressBar';

export interface WallboxData {
  wallbox_typ?: string;
  installation?: string;
  foerderung?: boolean;
  features?: string[];
  name?: string;
  email?: string;
  plz?: string;
  adresse?: string;
  pdfUrl?: string;
  pdfName?: string;
}

const WallboxFunnel = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<WallboxData>({});
  const { toast } = useToast();

  const steps = [
    { component: IntroStep, title: "Willkommen" },
    { component: WallboxTypeStep, title: "Wallbox-Typ" },
    { component: InstallationStep, title: "Installation" },
    { component: FoerderungStep, title: "Förderung" },
    { component: FeaturesStep, title: "Extras" },
    { component: ContactStep, title: "Kontakt" },
    { component: SuccessStep, title: "Fertig" }
  ];

  const totalSteps = steps.length - 1; // Exclude intro step from progress
  const progressPercentage = currentStep === 0 ? 0 : ((currentStep - 1) / (totalSteps - 2)) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (newData: Partial<WallboxData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const submitLead = async () => {
    setIsSubmitting(true);
    
    let supabaseSuccess = false;
    let webhookSuccess = false;
    
    // Try to save to Supabase
    try {
      const { error } = await supabase
        .from('wallbox_leads')
        .insert([{
          name: data.name || '',
          email: data.email || '',
          plz: data.plz || '',
          adresse: data.adresse || '',
          wallbox_typ: data.wallbox_typ || '',
          installation: data.installation || '',
          foerderung: data.foerderung || false,
          features: data.features || []
        }]);

      if (error) {
        console.error('Supabase error:', error);
      } else {
        supabaseSuccess = true;
      }
    } catch (error) {
      console.error('Supabase unexpected error:', error);
    }

    // Call the webhook
    try {
      const webhookUrl = new URL('https://hwg-samuel.app.n8n.cloud/webhook-test/aa9cf5bf-f3ed-4d4b-a03d-254628aeca06');
      webhookUrl.searchParams.append('name', data.name || '');
      webhookUrl.searchParams.append('email', data.email || '');
      webhookUrl.searchParams.append('plz', data.plz || '');
      webhookUrl.searchParams.append('adresse', data.adresse || '');
      webhookUrl.searchParams.append('wallbox_typ', data.wallbox_typ || '');
      webhookUrl.searchParams.append('installation', data.installation || '');
      webhookUrl.searchParams.append('foerderung', String(data.foerderung || false));
      webhookUrl.searchParams.append('features', JSON.stringify(data.features || []));

      const response = await fetch(webhookUrl.toString());
      if (response.ok) {
        const webhookData = await response.json();
        console.log('Webhook response:', webhookData);
        
        // Extract PDF URL from webhook response
        if (webhookData && Array.isArray(webhookData) && webhookData.length > 0) {
          const pdfData = webhookData[0];
          if (pdfData.url && pdfData.name) {
            updateData({
              pdfUrl: pdfData.url,
              pdfName: pdfData.name
            });
          }
        }
        webhookSuccess = true;
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
    }

    // Show appropriate message and proceed
    if (webhookSuccess) {
      nextStep();
      toast({
        title: "Angebot erstellt!",
        description: "Ihr PDF-Angebot wurde erfolgreich generiert.",
      });
    } else {
      toast({
        title: "Fehler",
        description: "Es gab ein Problem beim Erstellen des Angebots. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
    
    setIsSubmitting(false);
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Progress Bar - only show after intro */}
      {currentStep > 0 && currentStep < steps.length - 1 && (
        <ProgressBar 
          progress={progressPercentage} 
          currentStep={currentStep}
          totalSteps={totalSteps}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="max-w-2xl mx-auto"
          >
            <CurrentStepComponent
              data={data}
              updateData={updateData}
              nextStep={nextStep}
              prevStep={prevStep}
              submitLead={submitLead}
              isSubmitting={isSubmitting}
              canGoBack={currentStep > 1}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WallboxFunnel;