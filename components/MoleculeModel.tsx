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

  // ==========================================
  // ESTADOS INTERNOS PARA FÍSICA Y SUAVIZADO
  // ==========================================
  const currentPos = useRef(new Vector3(0, 0, 0)); // Posición actual suavizada
  const currentQuat = useRef(new Quaternion());    // Rotación actual suavizada
  const currentScale = useRef(0);                  // Escala actual (para animaciones de entrada/salida)

  // Acumuladores de rotación
  const manualRotation = useRef({ x: 0, y: 0 });   // Rotación manual extra
  const autoRotationY = useRef(0);                 // Rotación automática acumulada

  // Helper para obtener nombre legible del elemento
  const getElementName = (type: string) => {
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

    // 1. CÁLCULO DE ESCALA OBJETIVO
    // ==========================================
    let userZoom = 1.0;
    if (handData && handData.extraScale) {
      userZoom = handData.extraScale;
    }
    const baseScale = structureData.scale || 1.0;

    // Si no es visible, colapsamos la escala a 0 para una transición suave de salida
    const targetScaleVal = isVisible ? (baseScale * userZoom) : 0;

    // Lerp (Interpolación Lineal) para suavizar cambio de tamaño
    currentScale.current += (targetScaleVal - currentScale.current) * delta * 5;
    group.scale.setScalar(currentScale.current);

    if (handData) {
      // 2. GESTIÓN DE POSICIÓN: "AGARRE" (PINCH) + SUAVIZADO DINÁMICO
      // ==========================================
      const isPinched = handData.isPinched;
      const targetPos = new Vector3(handData.position.x, handData.position.y, handData.position.z);

      // Calculamos distancia al objetivo
      const distToTarget = currentPos.current.distanceTo(targetPos);

      // Ajuste dinámico de la velocidad de seguimiento (Lerp Factor)
      // - Movimiento rápido: Factor alto (0.4) para respuesta ágil
      // - Movimiento lento/quieto: Factor bajo (0.05) para eliminar temblor de la mano
      let lerpFactor = 0.05;
      if (distToTarget > 0.5) lerpFactor = 0.4;
      else if (distToTarget > 0.1) lerpFactor = 0.2;

      // Solo movemos la molécula si el usuario está haciendo el gesto de "prey" (agarre)
      // Si suelta, la molécula se queda flotando en su última posición
      if (isPinched && isVisible) {
        currentPos.current.lerp(targetPos, lerpFactor);
      }

      group.position.copy(currentPos.current);

      // 3. GESTIÓN DE ROTACIÓN
      // ==========================================
      if (isVisible) {
        // Rotación base de la mano
        const handQuat = new Quaternion(
          handData.quaternion.x, handData.quaternion.y, handData.quaternion.z, handData.quaternion.w
        );

        // Rotación manual extra (con segunda mano)
        if (handData.extraRotation) {
          manualRotation.current.x += handData.extraRotation.x * delta * 2;
          manualRotation.current.y += handData.extraRotation.y * delta * 2;
        }

        // Rotación automática continua
        if (autoRotate) {
          const speedFactor = rotationSpeed * 0.02;
          autoRotationY.current += delta * speedFactor;
        }

        // Combinar rotaciones: Mano + Manual + Automática
        const totalY = manualRotation.current.y + autoRotationY.current;
        const offsetQuat = new Quaternion();
        offsetQuat.setFromEuler(new Euler(manualRotation.current.x, totalY, 0));

        const finalQuat = handQuat.multiply(offsetQuat);

        // Suavizado esférico (Slerp) para rotación
        currentQuat.current.slerp(finalQuat, 0.1);
        group.quaternion.copy(currentQuat.current);
      }
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      {/* RENDERIZADO DE ÁTOMOS */}
      {structureData.atoms.map((atom) => {
        // Lógica de Etiquetas: Mostrar solo si el dedo (puntero) está cerca
        let showLabel = false;
        if (handData?.secondHandPointer) {
          const atomWorldPos = currentPos.current.clone().add(
            new Vector3(...atom.position).multiplyScalar(currentScale.current)
          );

          const pointer = new Vector3(handData.secondHandPointer.x, handData.secondHandPointer.y, 0);
          const dist = atomWorldPos.distanceTo(pointer);

          if (dist < 1.5) showLabel = true;
        }

        return (
          <mesh key={`atom-${atom.id}`} position={new Vector3(...atom.position)}>
            {/* Geometría esférica para el átomo */}
            <sphereGeometry args={[ATOM_SIZES[atom.type] || 0.4, 32, 32]} />

            {/* Material PBR de alta calidad (efecto cristal/plástico pulido) */}
            <meshPhysicalMaterial
              color={ATOM_COLORS[atom.type] || ATOM_COLORS.Unknown}
              emissive={ATOM_COLORS[atom.type] || ATOM_COLORS.Unknown}
              emissiveIntensity={0.25}
              roughness={0.05}
              metalness={0.3}
              transmission={0.1}
              clearcoat={1}
              clearcoatRoughness={0.05}
              reflectivity={1}
            />

            {/* Etiqueta flotante HTML */}
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

      {/* RENDERIZADO DE ENLACES (BONDS) */}
      {structureData.bonds.map((bond) => {
        const startAtom = structureData.atoms.find((a) => a.id === bond.source);
        const endAtom = structureData.atoms.find((a) => a.id === bond.target);

        if (!startAtom || !endAtom) return null;

        const start = new Vector3(...startAtom.position);
        const end = new Vector3(...endAtom.position);
        const distance = start.distanceTo(end);
        const midPoint = start.clone().add(end).multiplyScalar(0.5);

        // Calcular rotación del cilindro para conectar los dos puntos
        const direction = end.clone().sub(start).normalize();
        const quaternion = new Quaternion();
        quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);

        // Grosor según tipo de enlace
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