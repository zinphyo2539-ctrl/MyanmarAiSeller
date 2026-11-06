import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarEngine, DEFAULT_AVATAR_PARAMS } from './AvatarEngine';

export const MiniAvatarPreview: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const avatarRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);
  const isVisible = useRef<boolean>(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Setup Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 2.5);
    camera.lookAt(0, 1.0, 0);
    cameraRef.current = camera;

    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(1, 2, 2);
    scene.add(dirLight);

    // 5. Avatar Engine
    const { group } = AvatarEngine.createAvatar(DEFAULT_AVATAR_PARAMS);
    group.scale.set(0.4, 0.4, 0.4); // Lightweight scale
    scene.add(group);
    avatarRef.current = group;

    // 6. Animation
    const animate = () => {
      if (isVisible.current && avatarRef.current) {
        avatarRef.current.rotation.y += 0.005;
        renderer.render(scene, camera);
      }
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 7. Visibility Observer
    const observer = new IntersectionObserver((entries) => {
      isVisible.current = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full min-h-[160px] sm:min-h-[240px]" />;
};
