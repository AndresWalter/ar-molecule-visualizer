import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import MoleculeModel from './MoleculeModel';
import { MoleculeStructure, HandOrientation } from '../types';

interface ARCanvasProps {
  handData: HandOrientation | null;
  moleculeData: MoleculeStructure;
  isVisible: boolean;
  autoRotate: boolean;
  rotationSpeed: number;
}

const ARCanvas: React.FC<ARCanvasProps> = ({
  handData,
  moleculeData,
  isVisible,
  autoRotate,
  rotationSpeed
}) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }} // Antialias off often recommended for postprocessing
      dpr={[1, 2]} // Handle high DPI screens
    >
      {/* Lighting Setup for Realism */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />
      <pointLight position={[-10, 0, 10]} intensity={0.5} color="#44aaff" />
      <pointLight position={[10, 0, 10]} intensity={0.5} color="#ffaa44" />

      {/* Realistic Reflections */}
      <Environment preset="studio" />

      <MoleculeModel
        handData={handData}
        isVisible={isVisible}
        structureData={moleculeData}
        autoRotate={autoRotate}
        rotationSpeed={rotationSpeed}
      />


    </Canvas>
  );
};

export default ARCanvas;