import * as T from 'three'
import Input from './input'
import { traceStatics } from './statics'
import { Trace } from './utils'

const player = {
  mesh: undefined,
  position: new T.Vector3(0, 20, 0),
  velocity: new T.Vector3(0, 0, 0),
  sizeMin: new T.Vector3(-0.5, -0.5, -0.5),
  sizeMax: new T.Vector3(0.5, 1.5, 0.5),
  cameraTarget: new T.Vector3(0, 0, 0)
}

export const initPlayer = (scene) => {
  const geom = new T.CylinderGeometry(0.5, 0.5, 2)
  const mat = new T.MeshStandardMaterial({ color: 0x20e030 })
  player.mesh = new T.Mesh(geom, mat)
  scene.add(player.mesh)
}


let E1 = new T.Euler()
let forward = new T.Vector3()
let right = new T.Vector3()
let up = new T.Vector3()
let V1 = new T.Vector3()
let V2 = new T.Vector3()
let acceleration = new T.Vector3()
export const updatePlayer = (time, deltaTime, camera) => {
  // input yaw
  E1.set(0, Input.viewangle.y, 0)
  player.mesh.rotation.copy(E1)

  // player vectors
  forward.set(0, 0, -1).applyEuler(E1)
  right.set(1, 0, 0).applyEuler(E1)
  up.set(0, 1, 0).applyEuler(E1)

  let onGround = false

  V1.copy(player.position)
  V1.y -= 0.01
  traceStatics(player.position, V1, player.sizeMin, player.sizeMax)
  if (Trace.hitFraction < 1) {
    player.position.copy(Trace.endPos)
    player.velocity.y = 0
    onGround = true
  }

  acceleration.set(0, onGround ? 0 : -9.81, 0)
    .addScaledVector(forward, Input.movevalues.x * 10)
    .addScaledVector(right, Input.movevalues.y * 10)

  const friction = 3
  V1.set(player.velocity.x, 0, player.velocity.z)
  acceleration.addScaledVector(V1, -friction)

  player.velocity.addScaledVector(acceleration, deltaTime)

  V1.copy(player.position).addScaledVector(player.velocity, deltaTime)
  traceStatics(player.position, V1, player.sizeMin, player.sizeMax)
  player.position.copy(Trace.endPos)

  player.mesh.position.copy(player.position)
  player.mesh.position.y += (player.sizeMin.y + player.sizeMax.y) * 0.5

  // camera forward
  V1.set(0, 0, -1).applyEuler(Input.viewangle)
  // camera up
  V2.set(0, 1, 0).applyEuler(Input.viewangle)

  camera.position.copy(player.position)
    .addScaledVector(V1, -5)
    .addScaledVector(V2, 2)
    .addScaledVector(forward, -2)
    .addScaledVector(up, 1)
  camera.rotation.copy(Input.viewangle)
}
