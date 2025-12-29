import { MoleculeStructure, Atom, AtomType } from './types';

export const ATOM_COLORS: Record<string, string> = {
  C: '#333333', // Carbono - Negro/Gris
  O: '#FF2D2D', // Oxígeno - Rojo
  N: '#3050F8', // Nitrógeno - Azul
  H: '#E0E0E0', // Hidrógeno - Blanco
  P: '#FF8000', // Fósforo - Naranja
  Cl: '#1FF01F', // Cloro - Verde
  Na: '#AB5CF2', // Sodio - Morado
  S: '#FFFF30', // Azufre - Amarillo
  Au: '#FFD700', // Oro
  Fe: '#E06633', // Hierro - Óxido
  He: '#FFC0CB', // Helio - Rosa
  Unknown: '#FF00FF' // Magenta para errores
};

export const ATOM_SIZES: Record<string, number> = {
  H: 0.25,
  C: 0.4,
  N: 0.39,
  O: 0.38,
  P: 0.45,
  S: 0.43,
  Cl: 0.45,
  Na: 0.5,
  Au: 0.6,
  He: 0.3,
  Unknown: 0.4
};

// --- HELPER BUILDER ---
const createMolecule = (
  name: string, 
  formula: string, 
  category: any, 
  desc: string,
  atomConfigs: [number, string, number, number, number][], // id, type, x, y, z
  bondConfigs: [number, number, number, string][] // id, source, target, type
): MoleculeStructure => {
  return {
    name,
    formula,
    category,
    description: desc,
    atoms: atomConfigs.map(a => ({ id: a[0], type: a[1] as any, position: [a[2], a[3], a[4]] })),
    bonds: bondConfigs.map(b => ({ id: b[0], source: b[1], target: b[2], type: b[3] as any })),
    scale: 1.0
  };
};

// --- BIBLIOTECA DE MOLÉCULAS (TRADUCIDA) ---

export const MOLECULE_LIBRARY: MoleculeStructure[] = [
  // PRIMARIA
  createMolecule('Agua', 'H₂O', 'primary', 'Esencial para todas las formas de vida conocidas.', 
    [[0,'O',0,0,0], [1,'H',0.75,-0.6,0], [2,'H',-0.75,-0.6,0]], 
    [[0,0,1,'single'], [1,0,2,'single']]
  ),
  createMolecule('Oxígeno', 'O₂', 'primary', 'El gas vital que respiramos.', 
    [[0,'O',-0.6,0,0], [1,'O',0.6,0,0]], 
    [[0,0,1,'double']]
  ),
  createMolecule('Dióxido de Carbono', 'CO₂', 'primary', 'Producido por la respiración y combustión.', 
    [[0,'C',0,0,0], [1,'O',-1.2,0,0], [2,'O',1.2,0,0]], 
    [[0,0,1,'double'], [1,0,2,'double']]
  ),

  // SECUNDARIA
  createMolecule('Metano', 'CH₄', 'secondary', 'El alcano más simple y componente principal del gas natural.',
    [[0,'C',0,0,0], [1,'H',0,1,0], [2,'H',-0.9,-0.3,0], [3,'H',0.4,-0.3,0.8], [4,'H',0.4,-0.3,-0.8]],
    [[0,0,1,'single'], [1,0,2,'single'], [2,0,3,'single'], [3,0,4,'single']]
  ),
  createMolecule('Sal (Cloruro de Sodio)', 'NaCl', 'secondary', 'Estructura cristalina común de la sal de mesa.',
    [[0,'Na',-0.6,0,0], [1,'Cl',0.6,0,0]],
    [[0,0,1,'single']]
  ),
  createMolecule('Amoníaco', 'NH₃', 'secondary', 'Utilizado en fertilizantes y productos de limpieza.',
    [[0,'N',0,0.2,0], [1,'H',-0.9,-0.4,0], [2,'H',0.4,-0.4,0.8], [3,'H',0.4,-0.4,-0.8]],
    [[0,0,1,'single'], [1,0,2,'single'], [2,0,3,'single']]
  ),
  createMolecule('Etanol', 'C₂H₅OH', 'secondary', 'Alcohol presente en bebidas fermentadas.',
    [[0,'C',-1.2,0,0], [1,'C',0,0.5,0], [2,'O',1.2,-0.2,0], [3,'H',-1.2,-1.1,0], [4,'H',-2.1,0.4,0], [5,'H',-1.2,0.4,0.9], [6,'H',0,1.6,0], [7,'H',0,0.5,-1.1], [8,'H',2.0,0.3,0]],
    [[0,0,1,'single'], [1,1,2,'single'], [2,0,3,'single'], [3,0,4,'single'], [4,0,5,'single'], [5,1,6,'single'], [6,1,7,'single'], [7,2,8,'single']]
  ),

  // UNIVERSIDAD
  createMolecule('Benceno', 'C₆H₆', 'university', 'Un hidrocarburo aromático fundamental.',
    // Anillo C
    [[0,'C',1.4,0,0], [1,'C',0.7,1.2,0], [2,'C',-0.7,1.2,0], [3,'C',-1.4,0,0], [4,'C',-0.7,-1.2,0], [5,'C',0.7,-1.2,0],
     // Hidrógenos
     [6,'H',2.5,0,0], [7,'H',1.2,2.2,0], [8,'H',-1.2,2.2,0], [9,'H',-2.5,0,0], [10,'H',-1.2,-2.2,0], [11,'H',1.2,-2.2,0]],
    [[0,0,1,'double'], [1,1,2,'single'], [2,2,3,'double'], [3,3,4,'single'], [4,4,5,'double'], [5,5,0,'single'],
     [6,0,6,'single'], [7,1,7,'single'], [8,2,8,'single'], [9,3,9,'single'], [10,4,10,'single'], [11,5,11,'single']]
  ),
  {
    name: 'Cafeína',
    formula: 'C₈H₁₀N₄O₂',
    category: 'university',
    description: 'Estimulante del sistema nervioso central.',
    scale: 0.7,
    atoms: [
        {id:0,type:'N',position:[-0.5,-1,0]},{id:1,type:'C',position:[0.5,-1.5,0]},{id:2,type:'N',position:[1.5,-0.8,0]},
        {id:3,type:'C',position:[1.2,0.5,0]},{id:4,type:'C',position:[0,1,0]},{id:5,type:'C',position:[-0.8,0.2,0]},
        {id:6,type:'O',position:[0.5,-2.7,0]},{id:7,type:'O',position:[-2,0.5,0]},{id:8,type:'N',position:[0.8,2,0]},
        {id:9,type:'C',position:[1.8,1.5,0]},{id:10,type:'C',position:[-1.5,-2,0]},{id:11,type:'C',position:[2.8,-1.5,0]},
        {id:12,type:'C',position:[0.5,3.2,0]}
    ],
    bonds: [
        {id:0,source:0,target:1,type:'single'},{id:1,source:1,target:2,type:'single'},{id:2,source:2,target:3,type:'single'},
        {id:3,source:3,target:4,type:'double'},{id:4,source:4,target:5,type:'single'},{id:5,source:5,target:0,type:'single'},
        {id:6,source:4,target:8,type:'single'},{id:7,source:8,target:9,type:'single'},{id:8,source:9,target:3,type:'double'},
        {id:9,source:1,target:6,type:'double'},{id:10,source:5,target:7,type:'double'},{id:11,source:0,target:10,type:'single'},
        {id:12,source:2,target:11,type:'single'},{id:13,source:8,target:12,type:'single'}
    ]
  }
];

// Mapeo de elementos en Español e Inglés
export const ELEMENT_LIBRARY: Record<string, AtomType> = {
  // Español
  'oro': 'Au', 'hierro': 'Fe', 'helio': 'He', 'sodio': 'Na', 'cloro': 'Cl', 'azufre': 'S',
  'hidrogeno': 'H', 'hidrógeno': 'H', 'carbono': 'C', 'oxigeno': 'O', 'oxígeno': 'O', 'nitrogeno': 'N', 'nitrógeno': 'N',
  // Inglés / Símbolos
  'gold': 'Au', 'au': 'Au',
  'iron': 'Fe', 'fe': 'Fe',
  'helium': 'He', 'he': 'He',
  'sodium': 'Na', 'na': 'Na',
  'chlorine': 'Cl', 'cl': 'Cl',
  'sulfur': 'S', 's': 'S'
};
