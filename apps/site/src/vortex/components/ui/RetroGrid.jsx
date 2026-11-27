import { cn } from '../../utils/cn.js';
import skyUrl from '../../assets/sky-wide.webp';

// TechXpress Express Railway Tracks & Perspective Ambient Stage.
// High-speed tracks converging toward the horizon under the authentic TechXpress midnight sky,
// with glowing track signals and overhead catenary perspective lines.

export const RetroGrid = ({ className, angle = 65 }) => (
  <div
    className={cn(
      'pointer-events-none absolute h-full w-full overflow-hidden opacity-40 select-none',
      className,
    )}
  >
    {/* Authentic TechXpress Night Sky Backdrop */}
    <div
      className="absolute top-0 inset-x-0 h-[600px] bg-cover bg-top opacity-20 pointer-events-none"
      style={{ backgroundImage: `url(${skyUrl})` }}
    />

    {/* Perspective Grid & Railway Tracks */}
    <div
      className="absolute inset-0 [perspective:350px]"
      style={{ '--grid-angle': `${angle}deg` }}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className={cn(
            'animate-grid',
            '[background-repeat:repeat] [background-size:80px_80px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw]',
            '[background-image:linear-gradient(to_right,rgba(245,184,0,0.08)_1px,transparent_0),linear-gradient(to_bottom,rgba(24,179,176,0.08)_1px,transparent_0)]',
          )}
        />
        {/* Converging Express Central Tracks */}
        <div className="absolute left-1/2 top-0 h-full w-96 -translate-x-1/2 [background-image:linear-gradient(to_right,transparent,rgba(245,184,0,0.18)_2px,transparent_4px,transparent_calc(100%-4px),rgba(245,184,0,0.18)_calc(100%-2px),transparent)]" />
      </div>
    </div>

    {/* Horizon Fog & Radial Ambience */}
    <div className="absolute inset-0 bg-gradient-to-t from-bg-void via-transparent to-bg-void/90" />
    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-bg-void to-transparent" />
  </div>
);
