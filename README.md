# Molecule AR - Visualizador de Moléculas en Realidad Aumentada

**Molecule AR** es una aplicación web interactiva que utiliza **Realidad Aumentada (AR)** basada en visión por computadora para visualizar y manipular estructuras moleculares en 3D directamente con tus manos. Utilizando una cámara web estándar y bibliotecas como **Three.js**, **React Three Fiber** y **MediaPipe Hands**, esta herramienta ofrece una experiencia educativa inmersiva sin necesidad de hardware VR/AR costoso.

## 🚀 Características Principales

*   **Interacción Natural con Manos**: Controla la rotación y posición de las moléculas usando gestos naturales (detección de palma y dedos).
*   **Gestos Avanzados**:
    *   **Zoom**: Separa tus manos para ampliar o reducir el modelo.
    *   **Agarre (Pinch)**: Junta el índice y pulgar para "agarrar" la molécula y moverla por la pantalla.
*   **Visualización Realista**: Renderizado PBR (Physically Based Rendering) con materiales de cristal/plástico pulido, iluminación de estudio y efectos de post-procesado (Bloom).
*   **Librería Educativa**: Explora una colección de moléculas clasificadas por nivel educativo (Primaria, Secundaria, Universidad).
*   **Modo Descanso**: Pausa la cámara y el procesamiento para ahorrar energía cuando no estés interactuando.
*   **Buscador Inteligente**: Encuentra moléculas o genera visualizaciones de elementos individuales (ej. Oro, Hierro) al instante.

## 🛠️ Tecnologías Utilizadas

*   **React 18**: Biblioteca principal de UI.
*   **Vite**: Empaquetador y servidor de desarrollo ultrarrápido.
*   **Three.js**: Motor de gráficos 3D.
*   **React Three Fiber (R3F)**: Renderizador de React para Three.js.
*   **React Three Drei**: Colección de helpers y abstracciones para R3F.
*   **MediaPipe Hands**: Solución de Google para el seguimiento de manos de alta fidelidad en tiempo real.
*   **Tailwind CSS**: Framework de utilidades para el diseño de la interfaz (UI).

## 📋 Requisitos Previos

*   **Node.js** (Versión 18 o superior recomendada)
*   **NPM** (Gestor de paquetes)
*   Una **Webcam** funcional.

## 🔧 Instalación y Ejecución

1.  **Clonar el repositorio** (si aplica) o descargar el código:
    ```bash
    git clone <url-del-repositorio>
    cd ar-molecule-visualizer
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```
    *Nota: Si encuentras conflictos de versiones (peer dependencies), el proyecto ya está configurado para usar versiones compatibles alineadas con React 18.*

3.  **Ejecutar servidor de desarrollo**:
    ```bash
    npm run dev
    ```

4.  **Abrir en el navegador**:
    Visita `http://localhost:3000` (o el puerto que indique la consola). Permite el acceso a la cámara cuando se te solicite.

## 🎮 Guía de Uso

1.  **Inicio**: Al abrir la app, verás una pantalla de bienvenida. Haz clic en "Iniciar Experiencia".
2.  **Tutorial**: Levanta tu mano frente a la cámara. El sistema detectará tu palma y calibrará la posición.
3.  **Mover**: Junta tu dedo índice y pulgar (gesto de "ok" o pinza) para agarrar la molécula y moverla.
4.  **Rotar**: Gira tu muñeca para rotar la molécula en tiempo real.
5.  **Zoom**: Usa tu segunda mano. Al alejarla de la primera, la molécula crecerá; al acercarla, se encogerá.
6.  **Interfaz**:
    *   Usa el menú inferior para cambiar de molécula.
    *   Usa la barra superior para buscar elementos específicos.
    *   Accede a la configuración (icono de engranaje) para activar la rotación automática o ajustar la interfaz.

## 📄 Estructura del Proyecto

*   `App.tsx`: Componente principal. Gestiona el estado de la aplicación, la lógica de MediaPipe y la UI.
*   `components/`:
    *   `ARCanvas.tsx`: Escena 3D configurada con luces y efectos.
    *   `MoleculeModel.tsx`: Componente que renderiza la molécula y maneja la física/suavizado de movimiento.
*   `constants.ts`: Base de datos estática de moléculas y colores de átomos.
*   `types.ts`: Definiciones de tipos TypeScript para mayor robustez.

## ⚠️ Solución de Problemas

*   **La cámara no inicia**: Verifica que has dado permisos en el navegador y que ninguna otra aplicación (Zoom, Teams) la esté usando.
*   **Rendimiento lento**: En `App.tsx`, puedes ajustar `modelComplexity` a `0` en la configuración de MediaPipe para mayor velocidad en dispositivos antiguos.
*   **La molécula tiembla**: Asegúrate de tener buena iluminación. El "Modo Suavizado" está activo por defecto para minimizar el ruido de detección.

---
*Desarrollado con ❤️ para la educación interactiva.*
