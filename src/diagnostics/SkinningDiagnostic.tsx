import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarEngine, DEFAULT_AVATAR_PARAMS } from '../components/studio/AvatarEngine';

// Diagnostic Test Component
export const SkinningDiagnostic: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const testConfigs = ['Original', 'Sibling', 'Unskinned'];
    const renderers: THREE.WebGLRenderer[] = [];

    const runTests = () => {
      testConfigs.forEach((config, index) => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `<h3 style="color:white">Config ${config}</h3>`;
        container.appendChild(testContainer);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.set(0, 1.2, 2.5);
        camera.lookAt(0, 1.0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(300, 300);
        testContainer.appendChild(renderer.domElement);
        renderers.push(renderer);

        // Add lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(1, 2, 2);
        scene.add(dirLight);

        // Get fresh avatar instance for each config
        const { group, mesh, skeleton } = AvatarEngine.createAvatar(DEFAULT_AVATAR_PARAMS);

        if (config === 'Original') {
          // Hierarchy A: Group -> Mesh -> RootBone
          scene.add(group);
        } else if (config === 'Sibling') {
          // Hierarchy B: Group -> Mesh; Group -> RootBone
          const newGroup = new THREE.Group();
          newGroup.add(mesh);
          newGroup.add(skeleton.bones[0]);
          scene.add(newGroup);
        } else if (config === 'Unskinned') {
          // Hierarchy C: Standard Mesh
          const meshC = new THREE.Mesh(mesh.geometry, mesh.material);
          scene.add(meshC);
        }

        scene.updateMatrixWorld(true);
        renderer.render(scene, camera);

        // Matrix Logging
        console.log(`--- Diagnostics for ${config} ---`);
        console.log('Mesh MatrixWorld:', mesh.matrixWorld.elements);
        console.log('Root Bone MatrixWorld:', skeleton.bones[0].matrixWorld.elements);
        console.log('Bounding Box:', new THREE.Box3().setFromObject(mesh));
      });
    };

    runTests();

    return () => {
      renderers.forEach(r => {
        r.dispose();
        if (r.domElement.parentNode) r.domElement.parentNode.removeChild(r.domElement);
      });
    };
  }, []);

  return <div ref={containerRef} className="flex flex-col gap-4 p-4 bg-slate-900" />;
};
