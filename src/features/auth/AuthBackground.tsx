import ParticleField from './ParticleField';
import NeuralField from './NeuralField';

interface Props {
  cursor: React.MutableRefObject<{ x: number; y: number }>;
  neuralState: string;
}

/** Layered background: grid, atmosphere, cursor lighting, particles, neural field. */
export default function AuthBackground({ cursor, neuralState }: Props) {
  return (
    <div className="ax-bg" aria-hidden="true">
      <div className="ax-bg-grid" />
      <div className="ax-bg-orb ax-bg-orb-1" />
      <div className="ax-bg-orb ax-bg-orb-2" />
      <div className="ax-bg-orb ax-bg-orb-3" />
      <div className="ax-bg-cursor" />
      <NeuralField cursor={cursor} state={neuralState} />
      <ParticleField cursor={cursor} />
    </div>
  );
}
