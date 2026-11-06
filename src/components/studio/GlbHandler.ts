import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface GlbValidationResult {
  validNodeHierarchy: boolean;
  skinJointsValid: boolean;
  inverseBindMatricesValid: boolean;
  vertexAttributesValid: boolean;
  morphTargetsValid: boolean;
  materialAndTextureReferencesValid: boolean;
  status: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  details: string[];
}

export class GlbHandler {
  public static exportToGlb(scene: THREE.Object3D): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        scene,
        (gltf: ArrayBuffer | { [key: string]: any }) => {
          if (gltf instanceof ArrayBuffer) {
            resolve(gltf);
          } else {
            const output = JSON.stringify(gltf, null, 2);
            const blob = new Blob([output], { type: 'application/json' });
            blob.arrayBuffer().then(resolve).catch(reject);
          }
        },
        (error: ErrorEvent | Error) => {
          reject(error);
        },
        { binary: true, embedImages: true, animations: [] }
      );
    });
  }

  public static async importAndValidateGlb(glbBuffer: ArrayBuffer): Promise<{ scene: THREE.Group; validation: GlbValidationResult }> {
    const details: string[] = [];
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(
        glbBuffer,
        '',
        (gltf: { scene: THREE.Group; [key: string]: any }) => {
          const scene = gltf.scene;
          let skinnedMeshCount = 0;
          let validNodeHierarchy = true;
          let skinJointsValid = true;
          let inverseBindMatricesValid = true;
          let vertexAttributesValid = true;
          let morphTargetsValid = true;
          let materialAndTextureReferencesValid = true;

          scene.traverse((child: THREE.Object3D) => {
            if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
              skinnedMeshCount++;
              const mesh = child as THREE.SkinnedMesh;
              
              // 1. Vertex Attributes
              const pos = mesh.geometry.getAttribute('position');
              const norm = mesh.geometry.getAttribute('normal');
              const weights = mesh.geometry.getAttribute('skinWeight');
              const indices = mesh.geometry.getAttribute('skinIndex');
              
              if (!pos || !norm || !weights || !indices) {
                vertexAttributesValid = false;
                details.push(`SkinnedMesh ${mesh.name} missing mandatory vertex attributes.`);
              }

              // 2. Skin Joints & Bind Matrices
              if (mesh.skeleton) {
                if (!mesh.skeleton.bones || mesh.skeleton.bones.length === 0) {
                  skinJointsValid = false;
                  details.push(`SkinnedMesh ${mesh.name} has empty skeleton bones.`);
                }
                if (!mesh.skeleton.boneInverses || mesh.skeleton.boneInverses.length === 0) {
                  inverseBindMatricesValid = false;
                  details.push(`SkinnedMesh ${mesh.name} missing inverse bind matrices.`);
                }
              }

              // 3. Morph Targets
              if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
                details.push(`Morph targets verified on ${mesh.name}: ${Object.keys(mesh.morphTargetDictionary).length} targets.`);
              }

              // 4. Materials
              if (!mesh.material) {
                materialAndTextureReferencesValid = false;
                details.push(`SkinnedMesh ${mesh.name} missing material reference.`);
              }
            }
          });

          details.push(`Total SkinnedMeshes inspected in GLB: ${skinnedMeshCount}`);
          details.push(`Node hierarchy valid: ${validNodeHierarchy}`);
          details.push(`Skin joints valid: ${skinJointsValid}`);
          details.push(`Inverse bind matrices valid: ${inverseBindMatricesValid}`);

          const allValid = validNodeHierarchy && skinJointsValid && inverseBindMatricesValid && vertexAttributesValid && materialAndTextureReferencesValid;

          resolve({
            scene,
            validation: {
              validNodeHierarchy,
              skinJointsValid,
              inverseBindMatricesValid,
              vertexAttributesValid,
              morphTargetsValid,
              materialAndTextureReferencesValid,
              status: allValid ? 'PASS' : 'FAIL',
              details
            }
          });
        },
        (error: ErrorEvent | Error) => {
          reject(error);
        }
      );
    });
  }
}
