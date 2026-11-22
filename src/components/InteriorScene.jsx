import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import interiorVideoAsset from "../assets/train_bg_optimized.mp4";
import interiorMaskPngAsset from "../assets/train_interior_pov_masked1_optimized.png";
import interiorMaskWebpAsset from "../assets/train_interior_pov_masked1_optimized.webp";
import "./InteriorScene.css";
import SeatNavigation from "./SeatNavigation";

const ASSETS = {
  video: interiorVideoAsset,
  mask: interiorMaskPngAsset,
  maskWebp: interiorMaskWebpAsset,
};

export default function InteriorScene({ onNavigate }) {
  const revealRef = useRef(null);

  const [isAssetsReady, setIsAssetsReady] = useState(false);
  const loadedAssets = useRef(new Set());
  const TOTAL_ASSETS = 2; // Background video & foreground interior mask

  const handleLoaded = (assetName) => {
    loadedAssets.current.add(assetName);
    if (loadedAssets.current.size >= TOTAL_ASSETS) {
      setIsAssetsReady(true);
    }
  };

  useEffect(() => {
    // Reveal animation once train interior assets are fully ready
    if (isAssetsReady && revealRef.current) {
      gsap.to(revealRef.current, {
        opacity: 0,
        duration: 0.55,
        ease: "power2.inOut",
        delay: 0.1,
      });
    }
  }, [isAssetsReady]);

  return (
    <div className="interior-scene">
      {/* 1. Background Video Layer (Train window scenery in motion) */}
      <div className="interior-video-container">
        <video
          src={ASSETS.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="interior-video"
          onLoadedData={() => handleLoaded('video')}
        />
      </div>

      {/* 2. Foreground Mask Layer (Train interior, seats, ceiling, windows) */}
      <div className="interior-mask-container">
        <picture className="interior-mask-picture">
          <source srcSet={ASSETS.maskWebp} type="image/webp" />
          <img
            src={ASSETS.mask}
            alt="Train interior"
            className="interior-mask"
            fetchPriority="high"
            decoding="async"
            onLoad={() => handleLoaded('mask')}
          />
        </picture>
      </div>

      {/* 3. Initial Reveal Overlay (Blackout lifts on arrival) */}
      <div className="interior-reveal-overlay" ref={revealRef} />

      {/* 4. Seat Screen Navigation Layout (Always accessible without popup interruptions) */}
      <SeatNavigation isVisible={isAssetsReady} onNavigate={onNavigate} />
    </div>
  );
}
