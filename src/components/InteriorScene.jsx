import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./InteriorScene.css";
import StationMaster from "./StationMaster";
import SeatNavigation from "./SeatNavigation";

const ASSETS = {
  video: "/assets/train_bg.mp4",
  mask: "/assets/train_interior_pov_masked1.png",
  ttMaster: "/assets/TT_master_wbg.png",
  cloud: "/assets/cloud_wbg.png",
  vendor1: "/assets/Vendor1.png",
  vendor2: "/assets/Vendor2.png",
  vendor3: "/assets/Vendor3.png",
  vendor4: "/assets/Vendor4.png",
  vendor6: "/assets/Vendor6.png",
};

const INTERIOR_DIALOGUE = [
  {
    text: "Welcome to techxpress\n we are glad that you boarded this train\n",
  },
  {
    text: "We hope that you're enjoying your journey so far\n Our attendees will be joining you shortly \n",
  },
  {
    text: "If you want to visit any other compartment, you can access the screen infront of you for help"
  }
];

const VENDOR_DATA = [
  { image: ASSETS.vendor1, text: "Welcome! I'm your first vendor guide.\nI'll be walking you through our platform's basics." },
  { image: ASSETS.vendor6, text: "Ready to explore? Feel free to browse our main features on the display." }
];

export default function InteriorScene({ onNavigate }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const revealRef = useRef(null);

  const [isAssetsReady, setIsAssetsReady] = useState(false);
  const loadCount = useRef(0);
  const TOTAL_ASSETS = 4 + VENDOR_DATA.length; // Video, Mask, Master, Cloud, and Vendors

  // Transitions: 0: LOADING, 1: STATION_MASTER, 2: VENDORS, 3: FINISHED
  const [activeStage, setActiveStage] = useState(0);

  const handleLoaded = () => {
    loadCount.current += 1;
    if (loadCount.current >= TOTAL_ASSETS) {
      setIsAssetsReady(true);
    }
  };

  useEffect(() => {
    // Reveal animation once ALL assets are fully ready
    if (isAssetsReady) {
      gsap.to(revealRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        delay: 0.2,
        onComplete: () => {
          // Start the journey with the Station Master or skip if opted out
          const skipGuides = window.SKIP_GUIDES === true;
          setActiveStage(skipGuides ? 3 : 1);
        },
      });
    }
  }, [isAssetsReady]);

  return (
    <div className="interior-scene" ref={containerRef}>
      {/* 1. Background Video Layer */}
      <div className="interior-video-container">
        <video
          ref={videoRef}
          src={ASSETS.video}
          autoPlay
          muted
          loop
          playsInline
          className="interior-video"
          onCanPlayThrough={handleLoaded}
        />
      </div>

      {/* 2. Foreground Mask Layer */}
      <div className="interior-mask-container">
        <img
          src={ASSETS.mask}
          alt="Train Interior Mask"
          className="interior-mask"
          onLoad={handleLoaded}
          onError={handleLoaded}
        />
      </div>

      {/* 3. Initial Reveal Overlay (Blackout) */}
      <div className="interior-reveal-overlay" ref={revealRef} />

      {/* 4. Station Master Guide (Rajesh inside the train) */}
      <StationMaster
        isVisible={activeStage === 1}
        dialogues={INTERIOR_DIALOGUE}
        assets={ASSETS}
        variant="left"
        onComplete={() => setActiveStage(2)}
      />

      {/* 5. Actor 2: Vendor Experts (Bottom-Right, same style) */}
      <StationMaster 
        isVisible={activeStage === 2}
        dialogues={VENDOR_DATA}
        assets={ASSETS}
        variant="right"
        showSkipOption={true}
        onComplete={() => setActiveStage(3)}
      />

      {/* 6. Seat Screen Navigation Layout */}
      <SeatNavigation isVisible={activeStage >= 1} onNavigate={onNavigate} />

      {/* Hidden pre-loaders to ensure assets are ready */}
      <div style={{ display: "none" }}>
        <img src={ASSETS.ttMaster} onLoad={handleLoaded} alt="" />
        <img src={ASSETS.cloud} onLoad={handleLoaded} alt="" />
        {VENDOR_DATA.map((v, i) => (
           <img key={i} src={v.image} onLoad={handleLoaded} alt="" />
        ))}
      </div>

      {/* 6. Destination Content */}
      <div className={`journey-overlay ${activeStage === 3 ? 'active' : ''}`}>
        {/* Placeholder for future TechXpress content */}
      </div>
    </div>
  );
}
