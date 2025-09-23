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
        console.error('Error submitting lead:', error);
        toast({
          title: "Fehler",
          description: "Es gab ein Problem beim Senden Ihrer Daten. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        });
        return;
      }

      // Send data to webhook
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

        await fetch(webhookUrl.toString());
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
        // Don't show error to user for webhook, continue with success flow
      }

      // Success - move to final step
      nextStep();
      
      toast({
        title: "Erfolgreich gesendet!",
        description: "Ihr Angebot wird in Kürze erstellt und an Sie versendet.",
      });
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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