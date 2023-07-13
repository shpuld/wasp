import * as T from 'three'
import { setupRay, traceAabb } from './utils'

let statics = []
const MAX_STATICS = 128

export const SOLID = {
  NOT: 0,
  BBOX: 1
}

export const initStatics = () => {
  for (let i = 0; i < MAX_STATICS; i++) {
    const st = {
      mesh: undefined,
      position: new T.Vector3(),
      sizeMin: new T.Vector3(),
      sizeMax: new T.Vector3(),
      solid: SOLID.NOT,
      free: true
    }
    statics.push(st)
  }
}

export const addStatic = (scene, mesh, position, sizeMin, sizeMax, solid) => {
  for (let st of statics) {
    if (st.free) {
      st.mesh = mesh
      st.position.copy(position)
      st.sizeMin.addVectors(position, sizeMin)
      st.sizeMax.addVectors(position, sizeMax)
      st.solid = solid
      st.free = false
      mesh.position.copy(position)

      scene.add(mesh)
      return st
    }
  }
}

let V1 = new T.Vector3()
let V2 = new T.Vector3()

export const traceStatics = (startPos, endPos, boxMin, boxMax) => {
  setupRay(startPos, endPos)
  // Box vs box, adjust testable bounding box
  if (boxMin && boxMax) {
    for (let st of statics) {
      if (!st.free) {
        V1.x = st.sizeMin.x - boxMax.x
        V1.y = st.sizeMin.y - boxMax.y
        V1.z = st.sizeMin.z - boxMax.z
        V2.x = st.sizeMax.x - boxMin.x
        V2.y = st.sizeMax.y - boxMin.y
        V2.z = st.sizeMax.z - boxMin.z
        traceAabb(V1, V2)
      }
    }
    return
  }
  // Line vs box
  for (let st of statics) {
    if (!st.free) {
      traceAabb(st.sizeMin, st.sizeMax)
    }
  }
}
