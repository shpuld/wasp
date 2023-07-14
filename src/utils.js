import * as T from 'three'

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
  Trace.hitFraction = 1.0
  Trace.startSolid = false
  Trace.hitNormal.set(0, 0, 0)
  Trace.hitObject = undefined
}

export const isInside = (boxMin, boxMax, pos) => pos.x > boxMin.x && pos.x < boxMax.x && pos.y > boxMin.y && pos.y < boxMax.y && pos.z > boxMin.z && pos.z < boxMax.z

const normalForDim = [
  new T.Vector3(1, 0, 0),
  new T.Vector3(0, 1, 0),
  new T.Vector3(0, 0, 1)
]

export const traceAabb = (boxMin, boxMax) => {
  // https://gamedev.stackexchange.com/questions/18436/most-efficient-aabb-vs-ray-collision-algorithms
  if (isInside(boxMin, boxMax, Trace.startPos)) {
    console.log('inside')
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
    const length = Trace.startPos.distanceTo(Trace.endPos)
    if (tMin > length || tMin < 0) {
      return false
    }
    // epsilon
    tMin -= 0.000001
    Trace.hitFraction = Math.min(1.0, Math.max(0.0, tMin / length))
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
