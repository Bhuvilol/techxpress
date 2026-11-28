import faceUrl from './rajesh-face.webp';

// Rajesh's head and shoulders, cropped from the waving platform figure
// (assets/stage/rajesh-b.webp) so the helper is visibly the same character as
// the one standing in the scene. Decorative: his name is always printed beside it.
export default function RajeshAvatar({ size = 36 }) {
  return <img className="gs-avatar" src={faceUrl} width={size} height={size} alt="" draggable="false" />;
}
