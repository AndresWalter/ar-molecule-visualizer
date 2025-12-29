import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group, Quaternion, Euler } from 'three';
import { Html } from '@react-three/drei';
import { ATOM_COLORS, ATOM_SIZES, ELEMENT_LIBRARY } from '../constants';
import { MoleculeStructure, HandOrientation } from '../types';

interface MoleculeModelProps {
  handData: HandOrientation | null;
  isVisible: boolean;
  structureData: MoleculeStructure;
  autoRotate: boolean;
  rotationSpeed: number;
}

const MoleculeModel: React.FC<MoleculeModelProps> = ({
  handData,
  isVisible,
  structureData,
  autoRotate,
  rotationSpeed
}) => {
  const groupRef = useRef<Group>(null);

  // Internal state
  const currentPos = useRef(new Vector3(0, 0, 0));
  const currentQuat = useRef(new Quaternion());
  const currentScale = useRef(0);

  // Rotation accumulators
  const manualRotation = useRef({ x: 0, y: 0 });
  const autoRotationY = useRef(0);

  // Helper to get element name
  const getElementName = (type: string) => {
    // Reverse lookup or explicit map could work, here quick hack or usage of lib
    // For now simple map or just returning type if not found
    const names: Record<string, string> = {
      'H': 'Hidrógeno', 'C': 'Carbono', 'O': 'Oxígeno', 'N': 'Nitrógeno',
      'P': 'Fósforo', 'S': 'Azufre', 'Cl': 'Cloro', 'Na': 'Sodio',
      'Au': 'Oro', 'Fe': 'Hierro', 'He': 'Helio'
    };
    return names[type] || type;
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const group = groupRef.current;

    // 1. Calculate Target Scale
    let userZoom = 1.0;
    if (handData && handData.extraScale) {
      userZoom = handData.extraScale;
    }
    const baseScale = structureData.scale || 1.0;

    // Si no está visible, escala 0. Si está visible, escala calculada.
    const targetScaleVal = isVisible ? (baseScale * userZoom) : 0;

    // Lerp scale
    currentScale.current += (targetScaleVal - currentScale.current) * delta * 5;
    group.scale.setScalar(currentScale.current);

    if (handData) {
      // 2. Position Handling: "Pinch to Move" + Dynamic Smoothing

      // Solo actualizamos el target si hay PINCH. Si no, se queda donde estaba.
      // (O si es la primera vez que se detecta para que no aparezca en 0,0,0)
      const isPinched = handData.isPinched;

      const targetPos = new Vector3(handData.position.x, handData.position.y, handData.position.z);

      // Distancia entre posición actual y nueva objetivo
      const distToTarget = currentPos.current.distanceTo(targetPos);

      // SUAVIZADO DINÁMICO
      // Si se mueve rápido (dist > 0.5), lerp alto (0.3). 
      // Si se mueve lento o está quieto, lerp bajo (0.05) para estabilidad extrema.
      let lerpFactor = 0.05;
      if (distToTarget > 0.5) lerpFactor = 0.4;
      else if (distToTarget > 0.1) lerpFactor = 0.2;

      // Aplicar movimiento solo si hay "Agarre" (Pinch)
      // Si soltamos, el modelo flota en su sitio (no actualizamos currentPos hacia targetPos)
      if (isPinched && isVisible) {
        currentPos.current.lerp(targetPos, lerpFactor);
      }

      group.position.copy(currentPos.current);

      // 3. Rotation Handling
      if (isVisible) {
        const handQuat = new Quaternion(
          handData.quaternion.x, handData.quaternion.y, handData.quaternion.z, handData.quaternion.w
        );

        if (handData.extraRotation) {
          manualRotation.current.x += handData.extraRotation.x * delta * 2;
          manualRotation.current.y += handData.extraRotation.y * delta * 2;
        }

        if (autoRotate) {
          const speedFactor = rotationSpeed * 0.02;
          autoRotationY.current += delta * speedFactor;
        }

        const totalY = manualRotation.current.y + autoRotationY.current;
        const offsetQuat = new Quaternion();
        offsetQuat.setFromEuler(new Euler(manualRotation.current.x, totalY, 0));

        const finalQuat = handQuat.multiply(offsetQuat);
        currentQuat.current.slerp(finalQuat, 0.1);
        group.quaternion.copy(currentQuat.current);
      }
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      {/* Atoms */}
      {structureData.atoms.map((atom) => {
        // Lógica de Etiquetas: Visibilidad basada en proximidad de la SEGUNDA MANO
        let showLabel = false;
        if (handData?.secondHandPointer) {
          // Posición mundo del átomo: GroupPos + (AtomLocalPos * GroupScale)
          // Aprox para interacción rápida:
          const atomWorldPos = currentPos.current.clone().add(
            new Vector3(...atom.position).multiplyScalar(currentScale.current)
          );

          const pointer = new Vector3(handData.secondHandPointer.x, handData.secondHandPointer.y, 0);
          const dist = atomWorldPos.distanceTo(pointer);

          // Si el dedo está cerca (< 1 unidad visual aprox)
          if (dist < 1.5) showLabel = true;
        }

        return (
          <mesh key={`atom-${atom.id}`} position={new Vector3(...atom.position)}>
            <sphereGeometry args={[ATOM_SIZES[atom.type] || 0.4, 32, 32]} />
            <meshPhysicalMaterial
              color={ATOM_COLORS[atom.type] || ATOM_COLORS.Unknown}
              emissive={ATOM_COLORS[atom.type] || ATOM_COLORS.Unknown}
              emissiveIntensity={0.25} // Un poco más brillante
              roughness={0.05} // Muy liso (cristal/metal pulido)
              metalness={0.3}
              transmission={0.1}
              clearcoat={1}
              clearcoatRoughness={0.05}
              reflectivity={1}
            />
            {showLabel && (
              <Html position={[0, 0.6, 0]} center>
                <div className="pointer-events-none px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-white text-xs font-bold whitespace-nowrap animate-fade-in-up">
                  {getElementName(atom.type)}
                </div>
              </Html>
            )}
          </mesh>
        );
      })}

      {/* Bonds */}
      {structureData.bonds.map((bond) => {
        const startAtom = structureData.atoms.find((a) => a.id === bond.source);
        const endAtom = structureData.atoms.find((a) => a.id === bond.target);

        if (!startAtom || !endAtom) return null;

        const start = new Vector3(...startAtom.position);
        const end = new Vector3(...endAtom.position);
        const distance = start.distanceTo(end);
        const midPoint = start.clone().add(end).multiplyScalar(0.5);

        const direction = end.clone().sub(start).normalize();
        const quaternion = new Quaternion();
        quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);

        const radius = bond.type === 'double' ? 0.12 : (bond.type === 'triple' ? 0.15 : 0.08);

        return (
          <mesh
            key={`bond-${bond.id}`}
            position={midPoint}
            quaternion={quaternion}
          >
            <cylinderGeometry args={[radius, radius, distance, 16]} />
            <meshPhysicalMaterial
              color="#DDDDDD"
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default MoleculeModel;