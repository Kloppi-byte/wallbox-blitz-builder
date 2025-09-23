import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
}

const ProgressBar = ({ progress, currentStep, totalSteps }: ProgressBarProps) => {
  return (
    <div className="w-full bg-wallbox-surface border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Schritt {currentStep} von {totalSteps}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(progress)}% abgeschlossen
          </span>
        </div>
        
        <div className="w-full h-2 bg-progress-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-hero rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;