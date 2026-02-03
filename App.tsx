import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Vector3, Quaternion, Matrix4 } from 'three';
import ARCanvas from './components/ARCanvas';
import { MOLECULE_LIBRARY, ELEMENT_LIBRARY, ATOM_COLORS } from './constants';
import { MoleculeStructure, HandOrientation, EducationLevel, AtomType } from './types';

// ==========================================
// CONFIGURACIÓN DE CÁMARA Y ESPACIO 3D
// ==========================================
const CAMERA_Z = 10;
const FOV_ANGLE = 50;
const WORLD_HEIGHT = 2 * CAMERA_Z * Math.tan((FOV_ANGLE * Math.PI) / 180 / 2);

const App: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // ==========================================
    // ESTADOS: FLUJO DE USUARIO
    // ==========================================
    const [hasStarted, setHasStarted] = useState(false); // Controla la pantalla de bienvenida
    const [tutorialDismissed, setTutorialDismissed] = useState(false); // Controla el tutorial inicial de mano
    const [permissionGranted, setPermissionGranted] = useState(false); // Estado de permisos de cámara

    // ==========================================
    // ESTADOS: LÓGICA DE LA APLICACIÓN
    // ==========================================
    const [activeMolecule, setActiveMolecule] = useState<MoleculeStructure>(MOLECULE_LIBRARY[0]);
    const [category, setCategory] = useState<EducationLevel | 'all'>('primary');
    const [handData, setHandData] = useState<HandOrientation | null>(null);
    const [isHandDetected, setIsHandDetected] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [worldScale, setWorldScale] = useState({ x: 1, y: 1 });

    // ==========================================
    // ESTADOS: CONFIGURACIÓN
    // ==========================================
    const [autoRotate, setAutoRotate] = useState(false);
    const [rotationSpeed, setRotationSpeed] = useState(20);

    // ==========================================
    // ESTADOS: INTERFAZ DE USUARIO (UI)
    // ==========================================
    const [uiVisible, setUiVisible] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [userNotes, setUserNotes] = useState('');
    const [pinNotes, setPinNotes] = useState(false);
    const [showTopBar, setShowTopBar] = useState(true);
    const [showBottomBar, setShowBottomBar] = useState(true);
    const [showDescription, setShowDescription] = useState(true);

    // ==========================================
    // ESTADOS: MODO AHORRO DE ENERGÍA
    // ==========================================
    const [isCameraSleeping, setIsCameraSleeping] = useState(false);
    const cameraInstanceRef = useRef<any>(null);

    // Filtrado de Moléculas según categoría y búsqueda
    const filteredMolecules = MOLECULE_LIBRARY.filter(m =>
        (category === 'all' || m.category === category) &&
        (m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.formula.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Ajuste dinámico de escala del mundo basado en el tamaño de la ventana
    useEffect(() => {
        const updateScale = () => {
            const aspect = window.innerWidth / window.innerHeight;
            setWorldScale({ y: WORLD_HEIGHT, x: WORLD_HEIGHT * aspect });
        };
        window.addEventListener('resize', updateScale);
        updateScale();
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // ==========================================
    // LÓGICA CORE: PROCESAMIENTO DE MANOS (MEDIAPIPE)
    // ==========================================
    const onResults = useCallback((results: any) => {

        // Si no se detectan manos, limpiamos el estado
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            setIsHandDetected(false);
            setHandData(null);
            return;
        }

        // Si detectamos mano por primera vez, ocultamos el tutorial
        setIsHandDetected(true);
        if (!tutorialDismissed) {
            setTutorialDismissed(true);
        }

        // --- MANO PRINCIPAL (Controla posición y rotación) ---
        const h1 = results.multiHandLandmarks[0];

        // Detección de Gesto "Pinch" (Índice + Pulgar)
        // Usamos los landmarks 4 (punta pulgar) y 8 (punta índice)
        const thumbTip = h1[4];
        const indexTip = h1[8];
        const pinchDist = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2) +
            Math.pow(thumbTip.z - indexTip.z, 2)
        );
        
        // Umbral para considerar que hay un "agarre"
        const isPinched = pinchDist < 0.05;

        // Cálculo del centro de la mano (promedio de muñeca, índice y meñique)
        const cx = (h1[0].x + h1[5].x + h1[17].x) / 3;
        const cy = (h1[0].y + h1[5].y + h1[17].y) / 3;

        // Mapeo de coordenadas normalizadas (0-1) a coordenadas de mundo 3D
        const worldX = (0.5 - cx) * worldScale.x;
        const worldY = (0.5 - cy) * worldScale.y;

        // Cálculo de Rotación (Quaternion) basado en la orientación de la mano
        const vWrist = new Vector3(h1[0].x, h1[0].y, h1[0].z);
        const vMiddle = new Vector3(h1[9].x, h1[9].y, h1[9].z);
        const vIndex = new Vector3(h1[5].x, h1[5].y, h1[5].z);
        const vPinky = new Vector3(h1[17].x, h1[17].y, h1[17].z);

        const vForward = new Vector3().subVectors(vMiddle, vWrist).normalize();
        const vSide = new Vector3().subVectors(vPinky, vIndex).normalize();
        const vNormal = new Vector3().crossVectors(vForward, vSide).normalize();

        const matrix = new Matrix4();
        matrix.makeBasis(vSide, vNormal.negate(), vForward);
        const quaternion = new Quaternion();
        quaternion.setFromRotationMatrix(matrix);

        // --- MANO SECUNDARIA (Control de Zoom, Rotación Extra e Interacción) ---
        let extraRotation = { x: 0, y: 0 };
        let extraScale = 1.0;
        let secondHandPointer = undefined;

        if (results.multiHandLandmarks.length > 1) {
            const h2 = results.multiHandLandmarks[1];
            
            // Centro de la segunda mano
            const h2cx = (h2[0].x + h2[5].x + h2[17].x) / 3;
            const h2cy = (h2[0].y + h2[5].y + h2[17].y) / 3;

            // Puntero para interacción (punta del índice)
            const pX = (0.5 - h2[8].x) * worldScale.x;
            const pY = (0.5 - h2[8].y) * worldScale.y;
            secondHandPointer = { x: pX, y: pY, z: 0 };

            // Diferencia entre ambas manos para rotación extra
            const dx = (h2cx - cx) * 2;
            const dy = (h2cy - cy) * 2;

            const deadzone = 0.2; // Zona muerta para evitar movimientos involuntarios
            if (Math.abs(dx) > deadzone) extraRotation.y = (dx - (Math.sign(dx) * deadzone)) * 2;
            if (Math.abs(dy) > deadzone) extraRotation.x = (dy - (Math.sign(dy) * deadzone)) * 2;

            // Distancia entre manos para Zoom
            const dist = Math.sqrt(Math.pow(h2cx - cx, 2) + Math.pow(h2cy - cy, 2));
            extraScale = Math.min(Math.max(dist * 3, 0.5), 2.5);
        }

        setHandData({
            position: { x: worldX, y: worldY, z: 0 },
            quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
            extraRotation,
            extraScale,
            isPinched,
            secondHandPointer
        });

    }, [worldScale, tutorialDismissed]);

    // ==========================================
    // INICIALIZACIÓN DE MEDIAPIPE
    // ==========================================
    useEffect(() => {
        if (!hasStarted) return;

        // Gestión del modo descanso (detener cámara si está activo)
        if (isCameraSleeping) {
            if (cameraInstanceRef.current) {
                cameraInstanceRef.current.stop();
            }
            return;
        }

        const initMediaPipe = async () => {
            // @ts-ignore
            const Hands = (window as any).Hands;
            // @ts-ignore
            const Camera = (window as any).Camera;

            if (!Hands || !Camera) {
                console.error("Scripts de MediaPipe no cargados.");
                return;
            }

            const hands = new Hands({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1, // 1: Balance entre velocidad y precisión. 2: Máxima precisión (más lento en móviles)
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults((results: any) => {
                onResults(results);
            });

            if (videoRef.current) {
                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        if (videoRef.current) await hands.send({ image: videoRef.current });
                    },
                    width: 1280,
                    height: 720
                });

                cameraInstanceRef.current = camera;

                camera.start()
                    .then(() => setPermissionGranted(true))
                    .catch(err => {
                        console.error(err);
                        alert("Se requiere acceso a la cámara para la experiencia AR.");
                    });
            }
        };

        initMediaPipe();

        return () => {
            if (cameraInstanceRef.current) {
                cameraInstanceRef.current.stop();
            }
        };
    }, [hasStarted, isCameraSleeping, onResults]);

    // ==========================================
    // LÓGICA DE BÚSQUEDA Y SELECCIÓN
    // ==========================================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;

        // 1. Buscar en librería existente
        const existing = MOLECULE_LIBRARY.find(m => m.name.toLowerCase() === searchQuery.toLowerCase() || m.formula.toLowerCase() === searchQuery.toLowerCase());
        if (existing) {
            setActiveMolecule(existing);
            setSearchQuery('');
            return;
        }

        // 2. Si no existe, intentar generar elemento básico
        const lowerQuery = searchQuery.toLowerCase();
        const elementSymbol = ELEMENT_LIBRARY[lowerQuery] || (ATOM_COLORS[searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)] ? searchQuery : null);

        if (elementSymbol) {
            const nameCap = lowerQuery.charAt(0).toUpperCase() + lowerQuery.slice(1);
            const newMolecule: MoleculeStructure = {
                name: nameCap,
                formula: (elementSymbol as string).length <= 2 ? elementSymbol as string : nameCap,
                category: 'element',
                description: `Un solo átomo de ${nameCap}.`,
                atoms: [{ id: 0, type: (ELEMENT_LIBRARY[lowerQuery] || 'Unknown') as AtomType, position: [0, 0, 0] }],
                bonds: [],
                scale: 1.5
            };
            setActiveMolecule(newMolecule);
            setSearchQuery('');
        } else {
            alert("Molécula no encontrada. Prueba con: Agua, Oro, Hierro, Sal, Cafeína...");
        }
    };

    const CategoryButton = ({ id, label }: { id: EducationLevel | 'all', label: string }) => (
        <button
            onClick={() => setCategory(id)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${category === id ? 'bg-white text-black border-white' : 'bg-black/40 text-gray-400 border-gray-600 hover:border-white'}`}
        >
            {label}
        </button>
    );

    // ==========================================
    // RENDERIZADO
    // ==========================================

    // 1. PANTALLA DE BIENVENIDA
    if (!hasStarted) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40 pointer-events-none"></div>

                <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-6 drop-shadow-lg">
                    Molecule AR
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-lg font-light">
                    Visualiza química compleja flotando en la palma de tu mano.
                </p>

                <button
                    onClick={() => setHasStarted(true)}
                    className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg tracking-wide hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                >
                    <span className="relative z-10">Iniciar Experiencia</span>
                    <div className="absolute inset-0 rounded-full bg-white blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <p className="mt-8 text-xs text-gray-500">Requiere acceso a cámara • Procesamiento en dispositivo</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none text-white">
            <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover opacity-100" playsInline muted />
            <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
                <ARCanvas
                    handData={handData}
                    isVisible={isHandDetected}
                    moleculeData={activeMolecule}
                    autoRotate={autoRotate}
                    rotationSpeed={rotationSpeed}
                />
            </div>

            {/* 2. OVERLAY DE TUTORIAL (Desaparece al detectar mano) */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none transition-opacity duration-1000 ${tutorialDismissed ? 'opacity-0' : 'opacity-100'}`}>
                <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 flex flex-col items-center animate-pulse">
                    <svg className="w-24 h-24 text-white/80 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                    <h2 className="text-2xl font-bold text-center">Muestra tu palma</h2>
                    <p className="text-sm text-gray-300 mt-2">Centra tu mano frente a la cámara</p>
                </div>
            </div>

            {/* 3. INTERFAZ PRINCIPAL (Visible tras tutorial) */}
            {tutorialDismissed && (
                <>
                    {/* BOTONES FLOTANTES: MODO DESCANSO Y UI */}
                    <button
                        onClick={() => setIsCameraSleeping(!isCameraSleeping)}
                        className="absolute top-4 right-16 z-50 p-2 bg-black/40 backdrop-blur rounded-full hover:bg-white/20 transition-colors border border-white/10"
                        title={isCameraSleeping ? "Activar Cámara" : "Modo Descanso"}
                    >
                        <span className="text-xl">{isCameraSleeping ? '🌙' : '📷'}</span>
                    </button>

                    <button
                        onClick={() => setUiVisible(!uiVisible)}
                        className="absolute top-4 right-4 z-50 p-2 bg-black/40 backdrop-blur rounded-full hover:bg-white/20 transition-colors border border-white/10"
                        title={uiVisible ? "Ocultar Interfaz" : "Mostrar Interfaz"}
                    >
                        <span className="text-xl">{uiVisible ? '👁️' : '🕶️'}</span>
                    </button>

                    {/* VISUALIZADOR DE NOTAS (Solo en modo inmersivo) */}
                    {!uiVisible && pinNotes && userNotes.length > 0 && (
                        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-3xl px-6 pointer-events-none">
                            <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl text-center">
                                <p className="text-2xl font-bold text-white leading-relaxed drop-shadow-md">
                                    {userNotes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* BARRA SUPERIOR: INFORMACIÓN Y BÚSQUEDA */}
                    {showTopBar && (
                        <div className={`absolute top-0 left-0 w-full p-4 z-30 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent transition-transform duration-500 ${uiVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                            <div>
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                    Molecule.AR
                                </h1>
                                <p className="text-xs text-gray-300">
                                    {activeMolecule.name} <span className="opacity-50">|</span> {activeMolecule.formula}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mr-10">
                                <form onSubmit={handleSearchSubmit} className="flex">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar: Oro, Cafeína..."
                                        className="bg-white/10 backdrop-blur border border-white/20 rounded-l-lg px-3 py-1.5 text-sm outline-none focus:bg-white/20 w-32 md:w-48 text-white placeholder-gray-400"
                                    />
                                    <button type="submit" className="bg-blue-600 px-3 py-1.5 rounded-r-lg text-sm font-bold hover:bg-blue-500 transition-colors">
                                        🔍
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* PANEL LATERAL DE CONFIGURACIÓN */}
                    <div className={`absolute top-24 left-0 z-40 transition-transform duration-300 ${uiVisible ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="flex items-start">
                            {showConfig && (
                                <div className="bg-black/90 backdrop-blur-md border-r border-t border-b border-white/20 p-4 w-72 rounded-r-xl shadow-2xl h-[70vh] flex flex-col gap-4 overflow-y-auto custom-scrollbar">

                                    {/* Configuración de Animación */}
                                    <div>
                                        <h3 className="text-xs font-bold text-blue-300 mb-2 uppercase tracking-wide border-b border-white/10 pb-1">✨ Animación</h3>
                                        <label className="flex items-center justify-between mb-2 cursor-pointer group">
                                            <span className="text-sm text-gray-200">Rotación Automática</span>
                                            <input
                                                type="checkbox"
                                                checked={autoRotate}
                                                onChange={(e) => setAutoRotate(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-white/10"
                                            />
                                        </label>
                                        <div className={`transition-opacity duration-300 ${autoRotate ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>Velocidad</span>
                                                <span>{rotationSpeed}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={rotationSpeed}
                                                onChange={(e) => setRotationSpeed(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Configuración de Visualización */}
                                    <div>
                                        <h3 className="text-xs font-bold text-purple-300 mb-2 uppercase tracking-wide border-b border-white/10 pb-1">👁️ Elementos en Pantalla</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                                <input type="checkbox" checked={showTopBar} onChange={e => setShowTopBar(e.target.checked)} className="rounded bg-white/10 border-gray-500" />
                                                Barra Superior
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                                <input type="checkbox" checked={showBottomBar} onChange={e => setShowBottomBar(e.target.checked)} className="rounded bg-white/10 border-gray-500" />
                                                Menú Inferior
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                                <input type="checkbox" checked={showDescription} onChange={e => setShowDescription(e.target.checked)} className="rounded bg-white/10 border-gray-500" />
                                                Descripción
                                            </label>
                                        </div>
                                    </div>

                                    {/* Block de Notas */}
                                    <div className="flex-1 flex flex-col">
                                        <h3 className="text-xs font-bold text-green-300 mb-2 uppercase tracking-wide border-b border-white/10 pb-1">📝 Notas</h3>
                                        <textarea
                                            className="w-full flex-1 bg-white/5 rounded-lg p-3 text-sm text-white resize-none outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500 border border-white/10"
                                            placeholder="Escribe aquí tus apuntes..."
                                            value={userNotes}
                                            onChange={(e) => setUserNotes(e.target.value)}
                                        />
                                        <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setPinNotes(!pinNotes)}>
                                            <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${pinNotes ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}>
                                                {pinNotes && <span className="text-[10px] text-white">✓</span>}
                                            </div>
                                            <span className="text-xs text-gray-400 select-none">Fijar al ocultar UI</span>
                                        </div>
                                    </div>

                                </div>
                            )}
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className="h-12 w-9 bg-gray-800/90 rounded-r-xl flex flex-col items-center justify-center gap-1 mt-4 hover:bg-gray-700 transition-colors shadow-lg border-y border-r border-white/20 text-gray-200"
                                title="Configuración"
                            >
                                {showConfig ? '◀' : '⚙️'}
                            </button>
                        </div>
                    </div>

                    {/* ALERTA DE MANO PERDIDA */}
                    {!isHandDetected && uiVisible && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                            <div className="bg-black/60 backdrop-blur px-6 py-4 rounded-2xl border border-white/10 animate-fade-in">
                                <p className="text-lg animate-pulse">✋ Mano perdida</p>
                                <p className="text-sm text-gray-400 mt-1">Vuelve a mostrar tu palma</p>
                            </div>
                        </div>
                    )}

                    {/* PANEL INFERIOR: SELECTOR DE MOLÉCULAS */}
                    {showBottomBar && (
                        <div className={`absolute bottom-0 left-0 w-full z-30 flex flex-col items-center pb-6 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent transition-transform duration-500 ${uiVisible ? 'translate-y-0' : 'translate-y-full'}`}>

                            <div className="flex space-x-3 mb-4">
                                <CategoryButton id="primary" label="Primaria" />
                                <CategoryButton id="secondary" label="Secundaria" />
                                <CategoryButton id="university" label="Universidad" />
                                <CategoryButton id="all" label="Todas" />
                            </div>

                            <div className="flex space-x-3 overflow-x-auto w-full px-6 no-scrollbar pb-2 max-w-4xl mx-auto justify-start md:justify-center">
                                {filteredMolecules.map((mol, idx) => (
                                    <button
                                        key={mol.name + idx}
                                        onClick={() => setActiveMolecule(mol)}
                                        className={`flex-shrink-0 relative group rounded-xl overflow-hidden border transition-all duration-300 w-24 h-24 flex flex-col items-center justify-center
                                ${activeMolecule.name === mol.name ? 'bg-blue-600 border-blue-400 scale-110 shadow-lg shadow-blue-500/30' : 'bg-white/10 border-white/10 hover:bg-white/20'}
                            `}
                                    >
                                        <span className="text-xl font-bold mb-1">{mol.formula.slice(0, 4)}..</span>
                                        <span className="text-[10px] text-center leading-tight px-1 opacity-80">{mol.name}</span>
                                    </button>
                                ))}
                            </div>

                            {showDescription && (
                                <div className="mt-4 px-6 text-center max-w-lg text-sm text-gray-300 font-light italic">
                                    {activeMolecule.description}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* 4. OVERLAY DE MODO DESCANSO */}
            {isCameraSleeping && (
                <div
                    onClick={() => setIsCameraSleeping(false)}
                    className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer animate-in fade-in duration-500"
                >
                    <div className="text-center group">
                        <div className="text-8xl mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-500">🌙</div>
                        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">Modo Descanso</h2>
                        <p className="text-gray-400 text-lg font-light">Cámara suspendida para ahorrar energía</p>
                        <div className="mt-12 flex flex-col items-center">
                            <div className="px-8 py-3 bg-white/10 border border-white/20 rounded-full font-bold text-white hover:bg-white/20 transition-all">
                                Toca para reactivar
                            </div>
                            <span className="mt-4 text-xs text-gray-500 animate-pulse">La experiencia se reanudará instantáneamente</span>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;