import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

interface WelcomeTourProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "Welcome to CEKA",
    subtitle: "Educate · Amplify · Empower",
    description: "Civic Education Kenya (CEKA) is Kenya's premier open-source civic-tech movement dedicated to closing the democracy gap - equipping every citizen with the knowledge, tools, and voice to fully participate in the governance of their country.",
    icon: "/nasaka.svg",
    color: "bg-kenya-green",
    textColor: "text-white",
    isLogo: true
  },
  {
    title: "Legislative Tracker",
    subtitle: "Stay Updated with Bills and Legislative Moves",
    description: "Track bills from proposal to enactment. Understand the laws that shape our future with real-time updates.",
    icon: "/icons-v5/shield-check-svgrepo-com (1).svg",
    color: "bg-kenya-black",
    textColor: "text-white",
    image: null
  },
  {
    title: "Volunteer",
    subtitle: "Make a Difference",
    description: "Join our community of volunteers and contribute your skills to civil society in Kenya.",
    icon: "/icons-v5/plus-circle-svgrepo-com.svg",
    color: "bg-kenya-red",
    textColor: "text-white",
    image: null
  },
  {
    title: "Resource Hub",
    subtitle: "Knowledge is Power",
    description: "Access a verified library of civic documents, infographics, and educational media stored securely for you.",
    icon: "/icons-v5/book-open-svgrepo-com (1).svg",
    color: "bg-white",
    textColor: "text-kenya-black",
    image: null
  },
  {
    title: "Our Pieces",
    subtitle: "Visual Education Series",
    description: "Explore our collection of educational carousels and visual explainers designed for everyday Kenyans.",
    icon: "/icons-v5/image-1-svgrepo-com.svg",
    color: "bg-kenya-black",
    textColor: "text-white",
    image: null
  },
  {
    title: "CEKA Blog",
    subtitle: "Insights and Contributions",
    description: "Read and contribute pieces on important civic topics. Empowering through written word.",
    icon: "/icons-v5/edit-svgrepo-com.svg",
    color: "bg-white",
    textColor: "text-kenya-black",
    image: null
  }
];

const WelcomeTour = ({ onComplete }: WelcomeTourProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9
    })
  };

  const isDarkBg = slides[currentSlide].color === 'bg-kenya-black' || slides[currentSlide].color === 'bg-kenya-red' || slides[currentSlide].color === 'bg-kenya-green';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white dark:bg-[#1C1C1E] rounded-[40px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row h-auto min-h-[500px]"
      >
        {/* Left Visual Side (Mobile Top) */}
        <div className={cn(
          "w-full md:w-5/12 p-12 flex flex-col items-center justify-center transition-colors duration-700 relative",
          slides[currentSlide].color
        )}>
          {/* iOS Morphism overlay */}
          <div className="absolute inset-0 bg-white/5 pointer-events-none shadow-inner" />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-32 h-32 bg-white rounded-[32px] p-6 flex items-center justify-center shadow-ios-high transform transition-transform duration-500 hover:scale-105">
                {slides[currentSlide].isLogo ? (
                  <Logo variant="icon-only" className="w-full h-full" />
                ) : (
                  <img
                    src={slides[currentSlide].icon}
                    className="w-full h-full object-contain"
                    alt={slides[currentSlide].title}
                  />
                )}
              </div>
              
              <div className={cn(
                "px-4 py-1.5 rounded-full font-black tracking-[0.2em] text-[11px] uppercase backdrop-blur-md shadow-sm border",
                isDarkBg 
                  ? "bg-white/10 text-white border-white/20" 
                  : "bg-black/5 text-kenya-black border-black/10"
              )}>
                Step {currentSlide + 1} of {slides.length}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Content Side (Mobile Bottom) */}
        <div className="w-full md:w-7/12 bg-white dark:bg-[#1C1C1E] p-12 flex flex-col justify-between relative">
          <button
            onClick={onComplete}
            className="absolute top-8 right-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors focus:outline-none"
          >
            Skip Intro
          </button>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="space-y-6 mt-4"
            >
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-2 opacity-80">
                  {slides[currentSlide].subtitle}
                </h3>
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
                  {slides[currentSlide].title}
                </h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col gap-8">
            {/* Progress Bar (iOS style) */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 transition-all duration-500 rounded-full",
                    idx === currentSlide ? "bg-primary w-10 shadow-sm" : "bg-slate-100 dark:bg-slate-800 w-2"
                  )}
                />
              ))}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="rounded-2xl h-14 w-14 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-0 transition-all border border-slate-100 dark:border-white/5 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              <Button
                onClick={nextSlide}
                className="flex-1 rounded-2xl h-14 bg-gradient-to-br from-kenya-green to-kenya-green/80 hover:from-kenya-green/90 hover:to-kenya-green text-white font-black text-lg tracking-tight shadow-xl shadow-kenya-green/20 hover:shadow-kenya-green/30 transition-all active:scale-[0.98] group"
              >
                {currentSlide === slides.length - 1 ? (
                  <span className="flex items-center justify-center gap-3 font-black">
                    Start Exploring 
                    <Check className="w-5 h-5" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3 font-black">
                    Next 
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeTour;
