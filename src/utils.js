import * as T from 'three'

export const EPSILON = 0.000001

export const slideBounce = (v, n, slideOrBounce = 1) => {
  const dot = v.dot(n)
  v.addScaledVector(n, -1 * dot * slideOrBounce)
  // n = normalize(n);
  // return v - (v * n) * n * 1.5;
};

export const Trace = {
  dir: new T.Vector3(),
  invDir: new T.Vector3(),
  startPos: new T.Vector3(),
  endPos: new T.Vector3(),
  targetPos: new T.Vector3(),
  hitFraction: 1.0,
  hitObject: undefined,
  hitNormal: new T.Vector3(),
  startSolid: false
}

export const setupRay = (startPos, endPos) => {
  Trace.dir.subVectors(endPos, startPos).normalize()
  Trace.invDir.x = 1 / Trace.dir.x
  Trace.invDir.y = 1 / Trace.dir.y
  Trace.invDir.z = 1 / Trace.dir.z
  Trace.startPos.copy(startPos)
  Trace.endPos.copy(endPos)
  Trace.targetPos.copy(endPos)
  Trace.hitFraction = 1.0
  Trace.startSolid = false
  Trace.hitNormal.set(0, 0, 0)
  Trace.hitObject = undefined
}

export const isInside = (boxMin, boxMax, pos) => pos.x > boxMin.x && pos.x < boxMax.x && pos.y > boxMin.y && pos.y < boxMax.y && pos.z > boxMin.z && pos.z < boxMax.z

export const traceAabb = (boxMin, boxMax) => {
  // https://gamedev.stackexchange.com/questions/18436/most-efficient-aabb-vs-ray-collision-algorithms
  if (isInside(boxMin, boxMax, Trace.startPos)) {
    Trace.endPos.copy(Trace.startPos)
    Trace.hitFraction = 0
    Trace.startSolid = true
    return true
  }

  let t1, t2, tMin, tMax

  t1 = (boxMin.x - Trace.startPos.x) * Trace.invDir.x
  t2 = (boxMax.x - Trace.startPos.x) * Trace.invDir.x
  tMin = Math.min(t1, t2)
  tMax = Math.max(t1, t2)

  t1 = (boxMin.y - Trace.startPos.y) * Trace.invDir.y
  t2 = (boxMax.y - Trace.startPos.y) * Trace.invDir.y
  tMin = Math.max(tMin, Math.min(t1, t2))
  tMax = Math.min(tMax, Math.max(t1, t2))

  t1 = (boxMin.z - Trace.startPos.z) * Trace.invDir.z
  t2 = (boxMax.z - Trace.startPos.z) * Trace.invDir.z
  tMin = Math.max(tMin, Math.min(t1, t2))
  tMax = Math.min(tMax, Math.max(t1, t2))

  if (tMax >= tMin) {
    // cuts off later traces that are beyond already hit
    const targetLength = Trace.startPos.distanceTo(Trace.targetPos)
    if (tMin > targetLength * Trace.hitFraction || tMin < 0) {
      return false
    }
    // epsilon
    tMin -= EPSILON
    Trace.hitFraction = Math.min(1.0, Math.max(0.0, tMin / targetLength))
    Trace.endPos.copy(Trace.startPos).addScaledVector(Trace.dir, tMin)

    const insideX = Trace.endPos.x > boxMin.x && Trace.endPos.x < boxMax.x
    const insideY = Trace.endPos.y > boxMin.y && Trace.endPos.y < boxMax.y
    const insideZ = Trace.endPos.z > boxMin.z && Trace.endPos.z < boxMax.z

    Trace.hitNormal.set(0, 0, 0)
    if (insideX && insideY) {
      Trace.hitNormal.z = Trace.dir.z > 0 ? -1 : 1
    } else if (insideY && insideZ) {
      Trace.hitNormal.x = Trace.dir.x > 0 ? -1 : 1
    } else {
      Trace.hitNormal.y = Trace.dir.y > 0 ? -1 : 1
    }

    return true
  }

  return false
}

export const roundTo = (value, to) => {
  return Math.round(value / to) * to
}

export const snapToGrid = (vec, gridSize = 1.0) => {
  vec.x = Math.round(vec.x / gridSize) * gridSize
  vec.y = Math.round(vec.y / gridSize) * gridSize // different y res some day?
  vec.z = Math.round(vec.z / gridSize) * gridSize
}

let diff = new T.Vector3()
let intersectionPoint = new T.Vector3()
export const tracePlane = (planePoint, planeNormal) => {
  diff.subVectors(Trace.startPos, planePoint)
  const dot1 = diff.dot(planeNormal)
  const dot2 = Trace.dir.dot(planeNormal)

  if (Math.abs(dot2) < EPSILON) return // parallel to plane

  const prod = dot1 / dot2
  if (prod > 0) return // pointing away from the plane

  intersectionPoint.copy(Trace.startPos).addScaledVector(Trace.dir, -prod)
  const intersectionDist = intersectionPoint.distanceTo(Trace.startPos)
  const maxTraceLength = Trace.targetPos.distanceTo(Trace.startPos)

  if (intersectionDist <= maxTraceLength) {
    Trace.endPos.copy(intersectionPoint)
    Trace.hitFraction = intersectionDist / maxTraceLength
    Trace.hitNormal.copy(planeNormal)
  }
}

export const aabbVolume = (obj) => (obj.sizeMax.x - obj.sizeMin.x) * (obj.sizeMax.y - obj.sizeMin.y) * (obj.sizeMax.z - obj.sizeMin.z)

let V1 = new T.Vector3()
let V2 = new T.Vector3()
export const isParallel = (v1, v2) => {
  V1.copy(v1).normalize()
  V2.copy(v2).normalize()

  const dot = V1.dot(V2)
  return (dot >= 1.0 || dot <= -1.0)
}
