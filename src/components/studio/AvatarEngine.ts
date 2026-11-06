import * as THREE from 'three';

export interface AvatarParameters {
  headWidth: number;
  faceShape: number;
  noseBridge: number;
  lipThickness: number;
  shoulderWidth: number;
  chestGirth: number;
  waistGirth: number;
  hipGirth: number;
  armLength: number;
  legLength: number;
  height: number;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
}

export const DEFAULT_AVATAR_PARAMS: AvatarParameters = {
  headWidth: 1.0,
  faceShape: 1.0,
  noseBridge: 1.0,
  lipThickness: 1.0,
  shoulderWidth: 1.0,
  chestGirth: 1.0,
  waistGirth: 1.0,
  hipGirth: 1.0,
  armLength: 1.0,
  legLength: 1.0,
  height: 1.75,
  skinTone: '#e0ac69',
  hairStyle: 'short',
  hairColor: '#2c160b'
};

export class AvatarEngine {
  public static createAvatar(params: AvatarParameters): { group: THREE.Group; mesh: THREE.SkinnedMesh; skeleton: THREE.Skeleton } {
    const group = new THREE.Group();
    group.name = 'ShopsoneParametricAvatar';

    // 1. Create Hierarchical Skeleton (Humanoid)
    const bones: THREE.Bone[] = [];
    const hipBone = new THREE.Bone();
    hipBone.name = 'Hips';
    hipBone.position.set(0, 0.95 * params.height, 0);
    bones.push(hipBone);

    const spineBone = new THREE.Bone();
    spineBone.name = 'Spine';
    spineBone.position.set(0, 0.15, 0);
    hipBone.add(spineBone);
    bones.push(spineBone);

    const chestBone = new THREE.Bone();
    chestBone.name = 'Chest';
    chestBone.position.set(0, 0.20, 0);
    spineBone.add(chestBone);
    bones.push(chestBone);

    const neckBone = new THREE.Bone();
    neckBone.name = 'Neck';
    neckBone.position.set(0, 0.20, 0);
    chestBone.add(neckBone);
    bones.push(neckBone);

    const headBone = new THREE.Bone();
    headBone.name = 'Head';
    headBone.position.set(0, 0.15, 0);
    neckBone.add(headBone);
    bones.push(headBone);

    // Left Arm
    const lShoulder = new THREE.Bone();
    lShoulder.name = 'LeftShoulder';
    lShoulder.position.set(0.18 * params.shoulderWidth, 0.15, 0);
    chestBone.add(lShoulder);
    bones.push(lShoulder);

    const lArm = new THREE.Bone();
    lArm.name = 'LeftArm';
    lArm.position.set(0.15 * params.armLength, 0, 0);
    lShoulder.add(lArm);
    bones.push(lArm);

    // Right Arm
    const rShoulder = new THREE.Bone();
    rShoulder.name = 'RightShoulder';
    rShoulder.position.set(-0.18 * params.shoulderWidth, 0.15, 0);
    chestBone.add(rShoulder);
    bones.push(rShoulder);

    const rArm = new THREE.Bone();
    rArm.name = 'RightArm';
    rArm.position.set(-0.15 * params.armLength, 0, 0);
    rShoulder.add(rArm);
    bones.push(rArm);

    // Left Leg
    const lLeg = new THREE.Bone();
    lLeg.name = 'LeftUpLeg';
    lLeg.position.set(0.10, -0.05, 0);
    hipBone.add(lLeg);
    bones.push(lLeg);

    const lLowerLeg = new THREE.Bone();
    lLowerLeg.name = 'LeftLeg';
    lLowerLeg.position.set(0, -0.45 * params.legLength, 0);
    lLeg.add(lLowerLeg);
    bones.push(lLowerLeg);

    // Right Leg
    const rLeg = new THREE.Bone();
    rLeg.name = 'RightUpLeg';
    rLeg.position.set(-0.10, -0.05, 0);
    hipBone.add(rLeg);
    bones.push(rLeg);

    const rLowerLeg = new THREE.Bone();
    rLowerLeg.name = 'RightLeg';
    rLowerLeg.position.set(0, -0.45 * params.legLength, 0);
    rLeg.add(rLowerLeg);
    bones.push(rLowerLeg);

    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Procedural Human Body Geometry
    // Constructing body from primitives and merging them
    const geometries: THREE.BufferGeometry[] = [];

    // Head
    const head = new THREE.SphereGeometry(0.1 * params.headWidth, 16, 16);
    head.translate(0, params.height - 0.1, 0);
    geometries.push(head);

    // Torso
    const torso = new THREE.CylinderGeometry(0.12 * params.chestGirth, 0.1 * params.waistGirth, 0.4 * params.height, 16);
    torso.translate(0, 0.7 * params.height, 0);
    geometries.push(torso);

    // Pelvis
    const pelvis = new THREE.SphereGeometry(0.12 * params.hipGirth, 16, 16);
    pelvis.translate(0, 0.5 * params.height, 0);
    geometries.push(pelvis);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.3 * params.armLength, 8);
    
    // Left Arm
    const leftArmGeo = armGeo.clone();
    leftArmGeo.rotateZ(-Math.PI / 4);
    leftArmGeo.translate(0.15 * params.shoulderWidth, 0.75 * params.height, 0);
    geometries.push(leftArmGeo);

    // Right Arm
    const rightArmGeo = armGeo.clone();
    rightArmGeo.rotateZ(Math.PI / 4);
    rightArmGeo.translate(-0.15 * params.shoulderWidth, 0.75 * params.height, 0);
    geometries.push(rightArmGeo);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.45 * params.legLength, 8);
    
    // Left Leg
    const leftLegGeo = legGeo.clone();
    leftLegGeo.translate(0.07, 0.25 * params.height, 0);
    geometries.push(leftLegGeo);

    // Right Leg
    const rightLegGeo = legGeo.clone();
    rightLegGeo.translate(-0.07, 0.25 * params.height, 0);
    geometries.push(rightLegGeo);

    // Merge Geometries (Simple manual merge for now to avoid Utils dependency issues)
    const finalGeometry = new THREE.BufferGeometry();
    let vertexCount = 0;
    let indexCount = 0;

    for (const g of geometries) {
      vertexCount += g.attributes.position.count;
      if (g.index) indexCount += g.index.count;
    }

    const positions = new Float32Array(vertexCount * 3);
    const indices = new Uint32Array(indexCount);
    let vOffset = 0;
    let iOffset = 0;
    let vCount = 0;

    for (const g of geometries) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        positions[vOffset * 3 + i * 3] = pos.getX(i);
        positions[vOffset * 3 + i * 3 + 1] = pos.getY(i);
        positions[vOffset * 3 + i * 3 + 2] = pos.getZ(i);
      }
      
      if (g.index) {
        for (let i = 0; i < g.index.count; i++) {
          indices[iOffset + i] = g.index.getX(i) + vOffset;
        }
        iOffset += g.index.count;
      } else {
        for (let i = 0; i < pos.count; i++) {
          indices[iOffset + i] = vOffset + i;
        }
        iOffset += pos.count;
      }
      
      vOffset += pos.count;
    }

    finalGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    finalGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    finalGeometry.computeVertexNormals();

    const geometry = finalGeometry;
    const pos = geometry.attributes.position;
    const totalVertexCount = pos.count;

    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    const p = new THREE.Vector3();

    for (let i = 0; i < totalVertexCount; i++) {
      p.fromBufferAttribute(pos, i);

      // Distance-to-bone initial weighting with normalization
      let boneIdx = 0;
      if (p.y > 0.9 * params.height) boneIdx = 4; // Head
      else if (p.y > 0.75 * params.height) boneIdx = 3; // Neck
      else if (p.y > 0.55 * params.height) boneIdx = 2; // Chest
      else if (p.y > 0.35 * params.height) boneIdx = 1; // Spine
      else boneIdx = 0; // Hips

      // Ensure max 4 influences, normalized sum = 1.0
      skinIndices.push(boneIdx, Math.min(boneIdx + 1, bones.length - 1), 0, 0);
      skinWeights.push(0.7, 0.3, 0.0, 0.0);
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.skinTone),
      roughness: 0.6,
      metalness: 0.1
    });
    (material as any).skinning = true;

    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = 'AvatarBodyMesh';
    mesh.add(bones[0]); // Root bone
    mesh.bind(skeleton);

    group.add(mesh);

    return { group, mesh, skeleton };
  }
}
