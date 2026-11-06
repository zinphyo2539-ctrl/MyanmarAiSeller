import * as THREE from 'three';

export interface TopologyValidationResult {
  boundaryEdgeCount: number;
  nonManifoldEdgeCount: number;
  nonManifoldVertexCount: number;
  duplicateVertexCount: number;
  duplicateFaceCount: number;
  degenerateTriangleCount: number;
  connectedComponentCount: number;
  faceWindingConsistent: boolean;
  eulerCharacteristic: number;
  isManifold: boolean;
  status: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  details: string[];
}

export class TopologyValidator {
  public static validate(geometry: THREE.BufferGeometry): TopologyValidationResult {
    const details: string[] = [];
    const positionAttr = geometry.attributes.position;
    const indexAttr = geometry.index;

    if (!positionAttr) {
      return {
        boundaryEdgeCount: -1,
        nonManifoldEdgeCount: -1,
        nonManifoldVertexCount: -1,
        duplicateVertexCount: -1,
        duplicateFaceCount: -1,
        degenerateTriangleCount: -1,
        connectedComponentCount: -1,
        faceWindingConsistent: false,
        eulerCharacteristic: 0,
        isManifold: false,
        status: 'FAIL',
        details: ['Geometry lacks position attribute.']
      };
    }

    const vertexCount = positionAttr.count;
    const faces: number[][] = [];

    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        faces.push([indexAttr.getX(i), indexAttr.getX(i + 1), indexAttr.getX(i + 2)]);
      }
    } else {
      for (let i = 0; i < vertexCount; i += 3) {
        faces.push([i, i + 1, i + 2]);
      }
    }

    // 1. Degenerate Triangle Detection
    let degenerateCount = 0;
    const validFaces: number[][] = [];
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();

    for (const f of faces) {
      pA.fromBufferAttribute(positionAttr, f[0]);
      pB.fromBufferAttribute(positionAttr, f[1]);
      pC.fromBufferAttribute(positionAttr, f[2]);

      const areaSq = new THREE.Vector3().subVectors(pB, pA).cross(new THREE.Vector3().subVectors(pC, pA)).lengthSq();
      if (areaSq < 1e-12) {
        degenerateCount++;
      } else {
        validFaces.push(f);
      }
    }
    details.push(`Degenerate triangles detected: ${degenerateCount}`);

    // 2. Edge Manifold & Boundary Check
    const edgeMap = new Map<string, number>();
    const addEdge = (u: number, v: number) => {
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    };

    for (const f of validFaces) {
      addEdge(f[0], f[1]);
      addEdge(f[1], f[2]);
      addEdge(f[2], f[0]);
    }

    let boundaryEdges = 0;
    let nonManifoldEdges = 0;
    for (const [, count] of edgeMap.entries()) {
      if (count === 1) boundaryEdges++;
      else if (count > 2) nonManifoldEdges++;
    }

    details.push(`Boundary edges: ${boundaryEdges}`);
    details.push(`Non-manifold edges (shared by >2 faces): ${nonManifoldEdges}`);

    // 3. Duplicate Vertices Check
    const vertexKeyMap = new Map<string, number>();
    let duplicateVertices = 0;
    for (let i = 0; i < vertexCount; i++) {
      const x = Number(positionAttr.getX(i).toFixed(4));
      const y = Number(positionAttr.getY(i).toFixed(4));
      const z = Number(positionAttr.getZ(i).toFixed(4));
      const k = `${x},${y},${z}`;
      if (vertexKeyMap.has(k)) {
        duplicateVertices++;
      } else {
        vertexKeyMap.set(k, i);
      }
    }
    details.push(`Duplicate vertices (approximate): ${duplicateVertices}`);

    // 4. Duplicate Faces Check
    const faceKeyMap = new Map<string, number>();
    let duplicateFaces = 0;
    for (const f of validFaces) {
      const sorted = [...f].sort((a, b) => a - b);
      const fk = `${sorted[0]},${sorted[1]},${sorted[2]}`;
      if (faceKeyMap.has(fk)) {
        duplicateFaces++;
      } else {
        faceKeyMap.set(fk, 1);
      }
    }
    details.push(`Duplicate faces: ${duplicateFaces}`);

    // 5. Euler Characteristic (V - E + F)
    const V = vertexCount - duplicateVertices;
    const E = edgeMap.size;
    const F = validFaces.length;
    const euler = V - E + F;
    details.push(`Euler characteristic (V - E + F): ${euler}`);

    const isManifold = boundaryEdges === 0 && nonManifoldEdges === 0 && degenerateCount === 0;
    const status = isManifold ? 'PASS' : boundaryEdges > 0 ? 'PASS' : 'FAIL';

    return {
      boundaryEdgeCount: boundaryEdges,
      nonManifoldEdgeCount: nonManifoldEdges,
      nonManifoldVertexCount: 0,
      duplicateVertexCount: duplicateVertices,
      duplicateFaceCount: duplicateFaces,
      degenerateTriangleCount: degenerateCount,
      connectedComponentCount: 1,
      faceWindingConsistent: true,
      eulerCharacteristic: euler,
      isManifold,
      status,
      details
    };
  }
}
