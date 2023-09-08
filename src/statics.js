import * as T from 'three'
import { setupRay, traceAabb, Trace } from './utils'
import Brick from '../assets/brick.png'

let statics = []
const MAX_STATICS = 256

export const SOLID = {
  NOT: 0,
  BBOX: 1
}

const loader = new T.TextureLoader()
const staticMat = new T.MeshStandardMaterial({ map: loader.load(Brick) })


export const initStatics = (csm) => {
  csm.setupMaterial(staticMat)
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

export const updateStaticMesh = (st) => {
  const w = st.sizeMax.x - st.sizeMin.x
  const h = st.sizeMax.y - st.sizeMin.y
  const d = st.sizeMax.z - st.sizeMin.z
  st.mesh.position.x = (st.sizeMin.x + st.sizeMax.x) * 0.5
  st.mesh.position.y = (st.sizeMin.y + st.sizeMax.y) * 0.5
  st.mesh.position.z = (st.sizeMin.z + st.sizeMax.z) * 0.5
  st.mesh.scale.set(w, h, d)
}


export const addStatic = (scene, sizeMin, sizeMax, solid) => {
  for (let st of statics) {
    if (st.free) {
      if (!st.mesh) {
        st.mesh = new T.Mesh(new T.BoxGeometry(), staticMat)
        st.mesh.castShadow = true
        st.mesh.receiveShadow = true
        scene.add(st.mesh)
      }
      st.sizeMin.copy(sizeMin)
      st.sizeMax.copy(sizeMax)
      st.solid = solid
      st.free = false
      updateStaticMesh(st)
      return st
    }
  }
}

let V1 = new T.Vector3()
let V2 = new T.Vector3()

export const traceStatics = (startPos, endPos, boxMin, boxMax) => {
  setupRay(startPos, endPos)
  let shortest = 1.0
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
        if (Trace.hitFraction < shortest) {
          Trace.hitObject = st
          shortest = Trace.hitFraction
        }
      }
    }
    return
  }
  // Line vs box
  for (let st of statics) {
    if (!st.free) {
      traceAabb(st.sizeMin, st.sizeMax)
      if (Trace.hitFraction < shortest) {
        Trace.hitObject = st
        shortest = Trace.hitFraction
      }
    }
  }
}
