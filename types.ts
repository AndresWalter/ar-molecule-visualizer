export type AtomType = 'C' | 'O' | 'N' | 'H' | 'P' | 'Cl' | 'Na' | 'Au' | 'He' | 'Fe' | 'S' | 'Unknown';

export type EducationLevel = 'primary' | 'secondary' | 'university' | 'element';

export interface Atom {
  id: number;
  type: AtomType;
  position: [number, number, number];
}

export interface Bond {
  id: number;
  source: number;
  target: number;
  type: 'single' | 'double' | 'triple';
}

export interface MoleculeStructure {
  name: string;
  formula: string;
  category: EducationLevel;
  description: string;
  atoms: Atom[];
  bonds: Bond[];
  scale?: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandOrientation {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  extraRotation?: { x: number; y: number }; // Added for 2-hand control
  extraScale?: number; // Added for 2-hand control
  isPinched: boolean; // Gesto de agarre (Pinch)
  secondHandPointer?: { x: number; y: number; z: number }; // Puntero de mano secundaria
}
