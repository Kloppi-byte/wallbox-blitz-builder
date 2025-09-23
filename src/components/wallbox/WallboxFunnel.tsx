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
    
    // Skip webhook and database - just display the provided file
    const samplePdfData = {
      url: "https://pdf-temp-files.s3.us-west-2.amazonaws.com/LUAYKYZGKKCW5SVU4C2QPFZRM2YRSTGO/htmltopdf.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIZJDPLX6D7EHVCKA%2F20250923%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250923T115753Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=75334a7cd0694725d8c22e13243c52cb05d437e186d5fbd9ad6a87d17df6b187",
      name: "htmltopdf.pdf"
    };
    
    // Set the PDF data for display
    updateData({
      pdfUrl: samplePdfData.url,
      pdfName: samplePdfData.name
    });
    
    // Move to final step
    nextStep();
    
    toast({
      title: "Angebot erstellt!",
      description: "Ihr PDF-Angebot ist bereit zur Ansicht.",
    });
    
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