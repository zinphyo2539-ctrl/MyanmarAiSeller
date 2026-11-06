import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface StudioViewportProps {
  avatarGroup: THREE.Group;
  cameraPreset?: 'front' | 'side' | 'back' | 'isometric';
}

export const StudioViewport: React.FC<StudioViewportProps> = ({ avatarGroup, cameraPreset = 'isometric' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentAvatarRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // slate-950
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 3.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const purpleGlow = new THREE.PointLight(0xa855f7, 2, 5);
    purpleGlow.position.set(-2, 1, 1);
    scene.add(purpleGlow);

    // 5. Grid helper
    const grid = new THREE.GridHelper(10, 10, 0x7e22ce, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // 6. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Avatar Mesh on Prop Change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (currentAvatarRef.current) {
      scene.remove(currentAvatarRef.current);
    }

    scene.add(avatarGroup);
    currentAvatarRef.current = avatarGroup;

    // Adjust camera preset
    const camera = cameraRef.current;
    if (camera) {
      if (cameraPreset === 'front') camera.position.set(0, 1.4, 3.0);
      else if (cameraPreset === 'side') camera.position.set(3.0, 1.4, 0);
      else if (cameraPreset === 'back') camera.position.set(0, 1.4, -3.0);
      else camera.position.set(1.5, 1.6, 2.5);
      camera.lookAt(0, 1.0, 0);
    }
  }, [avatarGroup, cameraPreset]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-3xl overflow-hidden bg-slate-950/80 border border-white/10 relative shadow-2xl backdrop-blur-2xl">
      <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] font-mono text-purple-300">
        WebGL 3D Viewport · Interactive Studio
      </div>
    </div>
  );
};
