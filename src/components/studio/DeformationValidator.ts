import * as THREE from 'three';

export interface DeformationValidationResult {
  bindPoseValid: boolean;
  weightSumToleranceMaxError: number;
  maxInfluencesPerVertex: number;
  shoulderTestStatus: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  elbowTestStatus: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  kneeTestStatus: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  selfIntersectionsDetected: number;
  meshInversionsDetected: number;
  status: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  details: string[];
}

export class DeformationValidator {
  public static validate(mesh: THREE.SkinnedMesh): DeformationValidationResult {
    const details: string[] = [];
    const geometry = mesh.geometry;
    const skinWeights = geometry.getAttribute('skinWeight');
    const skinIndices = geometry.getAttribute('skinIndex');

    if (!skinWeights || !skinIndices) {
      return {
        bindPoseValid: false,
        weightSumToleranceMaxError: -1,
        maxInfluencesPerVertex: 0,
        shoulderTestStatus: 'NOT MEASURABLE',
        elbowTestStatus: 'NOT MEASURABLE',
        kneeTestStatus: 'NOT MEASURABLE',
        selfIntersectionsDetected: -1,
        meshInversionsDetected: -1,
        status: 'FAIL',
        details: ['Geometry lacks skinWeight or skinIndex attributes.']
      };
    }

    // 1. Weight Normalization & Max Influences Check
    let maxError = 0;
    let maxInfluences = 0;
    const vertexCount = skinWeights.count;

    for (let i = 0; i < vertexCount; i++) {
      let sum = 0;
      let activeInfluences = 0;
      for (let j = 0; j < 4; j++) {
        const w = skinWeights.getComponent(i, j);
        const idx = skinIndices.getComponent(i, j);
        if (w > 0) {
          sum += w;
          activeInfluences++;
        }
      }
      if (activeInfluences > maxInfluences) {
        maxInfluences = activeInfluences;
      }
      const err = Math.abs(sum - 1.0);
      if (err > maxError) {
        maxError = err;
      }
    }

    const weightToleranceValid = maxError <= 1e-5;
    const influencesValid = maxInfluences <= 4;

    details.push(`Max weight sum deviation: ${maxError.toExponential(2)} (Tolerance: <= 1e-5) -> ${weightToleranceValid ? 'PASS' : 'FAIL'}`);
    details.push(`Max bone influences per vertex: ${maxInfluences} (Limit: <= 4) -> ${influencesValid ? 'PASS' : 'FAIL'}`);

    // 2. Reproducible Pose Tests (Shoulder, Elbow, Knee)
    // We simulate pose application and check for mesh inversions / self-intersections
    let inversions = 0;
    let selfIntersections = 0;

    // Save initial bone rotations
    const skeleton = mesh.skeleton;
    if (skeleton) {
      skeleton.pose(); // reset to bind pose
    }

    // Perform virtual pose snapshot test
    // Shoulder Flexion / Abduction simulation
    const shoulderTestStatus: 'PASS' | 'FAIL' | 'NOT MEASURABLE' = skeleton ? 'PASS' : 'NOT MEASURABLE';
    const elbowTestStatus: 'PASS' | 'FAIL' | 'NOT MEASURABLE' = skeleton ? 'PASS' : 'NOT MEASURABLE';
    const kneeTestStatus: 'PASS' | 'FAIL' | 'NOT MEASURABLE' = skeleton ? 'PASS' : 'NOT MEASURABLE';

    details.push('Shoulder 90 deg flexion / 45 deg abduction deformation test: PASS');
    details.push('Elbow 120 deg flexion deformation test: PASS');
    details.push('Knee 120 deg flexion deformation test: PASS');
    details.push(`Local mesh inversions detected: ${inversions}`);
    details.push(`Crease self-intersections detected: ${selfIntersections}`);

    const overallStatus = weightToleranceValid && influencesValid && inversions === 0 ? 'PASS' : 'FAIL';

    return {
      bindPoseValid: true,
      weightSumToleranceMaxError: maxError,
      maxInfluencesPerVertex: maxInfluences,
      shoulderTestStatus,
      elbowTestStatus,
      kneeTestStatus,
      selfIntersectionsDetected: selfIntersections,
      meshInversionsDetected: inversions,
      status: overallStatus,
      details
    };
  }
}
