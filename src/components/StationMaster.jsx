import { useState, useEffect } from 'react';

/**
 * StationMaster Component
 * Renders the interactive guide character and sequential speech bubbles.
 * 
 * @param {Array} dialogues - Array of { text: string } objects
 * @param {Function} onComplete - Callback when all dialogues are finished
 * @param {Object} assets - Object containing ttMaster and cloud image paths
 */
/**
 * StationMaster Component
 * 
 * @param {boolean} isVisible - Whether the guide is currently shown
 * @param {Array} dialogues - Array of { text: string } objects
 * @param {Function} onComplete - Callback when all dialogues are finished
 * @param {Object} assets - Object containing ttMaster and cloud image paths
 */
export default function StationMaster({ isVisible, dialogues, onComplete, assets }) {
  const [index, setIndex] = useState(0);

  const handleNext = () => {
    if (index < dialogues.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!dialogues || dialogues.length === 0) return null;

  const currentText = dialogues[index].text;

  return (
    <div 
      className={`guide-overlay ${isVisible ? 'visible' : ''} ${!isVisible && index > 0 ? 'exit' : ''}`} 
      onClick={isVisible ? handleNext : undefined}
    >
      <div className="guide-character">
        <img src={assets.ttMaster} alt="Station Master" />
        {/* Debug: Head/Mouth Reference Point */}
        <div className="debug-point master-head" />
      </div>
      <div className="guide-cloud" key={index}> 
        <img src={assets.cloud} alt="Speech Bubble" />
        <div className="cloud-text">
          <p dangerouslySetInnerHTML={{ __html: currentText.replace(/\n/g, '<br/>') }} />
          <span>(Click to continue)</span>
        </div>
        {/* Debug: Cloud Origin Reference Point */}
        <div className="debug-point cloud-origin" />
      </div>
    </div>
  );
}
