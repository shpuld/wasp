import * as T from 'three'
import Input from './input'
import { traceStatics } from './statics'
import { Trace, slideBounce } from './utils'
import { updateBuilder, initBuilder, buildPrimary } from './builder'

const player = {
  mesh: undefined,
  position: new T.Vector3(0, 20, 0),
  velocity: new T.Vector3(0, 0, 0),
  sizeMin: new T.Vector3(-0.5, -0.5, -0.5),
  sizeMax: new T.Vector3(0.5, 1.25, 0.5),
  cameraTarget: new T.Vector3(0, 0, 0),
  isWallRunning: false,
  wallRunEnergy: 0.0,
  noclip: true,
  aimOrigin: new T.Vector3(),
  aimAngles: new T.Euler(0, 0, 0, 'YXZ'),
  aimDot: undefined,
  aimObject: undefined
}

let E1 = new T.Euler(0, 0, 0, 'YXZ')
let V1 = new T.Vector3()
let V2 = new T.Vector3()

const toggleNoclip = () => {
  player.noclip = !player.noclip
}

const initAimDot = (scene) => {
  const geom = new T.BoxGeometry(0.15, 0.15, 0.15);
  const mat = new T.MeshBasicMaterial({
    color: 0xeff3010,
    transparent: true,
    opacity: 0.5
  });
  player.aimDot = new T.Mesh(geom, mat);
  scene.add(player.aimDot);
}

export const initPlayer = (scene, csm) => {
  const geom = new T.CylinderGeometry(0.5, 0.5, 1.75)
  const mat = new T.MeshStandardMaterial({ color: 0x20e030 })
  csm.setupMaterial(mat)
  player.mesh = new T.Mesh(geom, mat)
  player.mesh.castShadow = true
  player.mesh.receiveShadow = true
  scene.add(player.mesh)

  initBuilder(scene, player)

  Input.buttons.NOCLIP.keyup = toggleNoclip
  Input.buttons.PRIMARY_ACTION.keydn = buildPrimary

  initAimDot(scene)
}

let forward = new T.Vector3()
let right = new T.Vector3()
let up = new T.Vector3()
let targetMove = new T.Vector3()
const MAX_SPEED = 7.5
export const playerAccelerate = (deltaTime, onGround) => {
  const accelAmount = onGround ? 2.5 : 0.8
  const moveScale = MAX_SPEED
  targetMove.set(0, 0, 0).addScaledVector(forward, Input.movevalues.x * moveScale).addScaledVector(right, Input.movevalues.y * moveScale)
  const targetSpeed = Math.min(MAX_SPEED, targetMove.length())
  targetMove.normalize()

  const speedAlongTargetMove = player.velocity.dot(targetMove)

  // Already going faster than what we can run
  if (speedAlongTargetMove > targetSpeed) {
    return
  }
  const speedToMax = targetSpeed - speedAlongTargetMove
  const speedAddAmount = Math.min(speedToMax, targetSpeed * accelAmount * deltaTime)

  player.velocity.addScaledVector(targetMove, speedAddAmount)
}

const FRICTION = 1.5
export const applyFriction = (deltaTime) => {
  const currentSpeed = player.velocity.length()
  if (currentSpeed <= 0.0001) {
    player.velocity.set(0, 0, 0)
    return
  }
  const frictionAmount = Math.max(currentSpeed, MAX_SPEED * 0.3) * deltaTime * FRICTION
  const appliedFrictionSpeed = Math.max(0.0, currentSpeed - frictionAmount)
  player.velocity.multiplyScalar(appliedFrictionSpeed / currentSpeed)
}

let origPos = new T.Vector3()
let tempVel = new T.Vector3()
let tempPos = new T.Vector3()
// Move and bounce player, mutates position and velocity
// Additionally, if stepHeight is provided, try step over obstacles
// returns travel distance
export const playerMoveStep = (deltaTime, stepHeight = 0) => {
  origPos.copy(player.position)
  let moveAmount = deltaTime
  let actualStepped = stepHeight
  if (stepHeight > 0) {
    tempPos.copy(player.position)
    tempPos.y += stepHeight
    traceStatics(player.position, tempPos, player.sizeMin, player.sizeMax)
    player.position.copy(Trace.endPos)
    actualStepped = player.position.y - origPos.y
  }
  for (let i = 0; i < 4; i++) {
    tempVel.copy(player.velocity)
    tempPos.copy(player.position).addScaledVector(tempVel, moveAmount)
    traceStatics(player.position, tempPos, player.sizeMin, player.sizeMax)
    if (Trace.startSolid) {
      player.position.y += 10 * deltaTime
    } else {
      player.position.copy(Trace.endPos)
    }
    if (Trace.hitFraction < 1) {
      slideBounce(player.velocity, Trace.hitNormal, 1.01)
    }
    moveAmount -= Trace.hitFraction * deltaTime
    if (moveAmount <= 0) break
  }
  if (stepHeight > 0) {
    tempPos.copy(player.position)
    tempPos.y -= actualStepped // Step down only as much as we stepped up
    traceStatics(player.position, tempPos, player.sizeMin, player.sizeMax)
    player.position.copy(Trace.endPos)
    /*
    const diff = player.position.y - origPos.y
    if (diff > 0.1) console.log(diff)
    */
  }
  return origPos.distanceTo(player.position)
}

let noStepPos = new T.Vector3()
let noStepVel = new T.Vector3()
let horizVel = new T.Vector3()

export const noclipMove = (deltaTime) => {
  // input yaw
  E1.copy(Input.viewangle)
  player.mesh.rotation.copy(E1)

  // player vectors
  forward.set(0, 0, -1).applyEuler(E1)
  right.set(1, 0, 0).applyEuler(E1)
  up.set(0, 1, 0).applyEuler(E1)

  const speed = 16
  player.velocity.set(0, 0, 0)
  player.position.addScaledVector(forward, Input.movevalues.x * deltaTime * speed)
  player.position.addScaledVector(right, Input.movevalues.y * deltaTime * speed)
}

export const playerMove = (deltaTime) => {
  // input yaw
  E1.set(0, Input.viewangle.y, 0)
  // player vectors
  forward.set(0, 0, -1).applyEuler(E1)
  right.set(1, 0, 0).applyEuler(E1)
  up.set(0, 1, 0).applyEuler(E1)


  let onGround = false

  /*
   * Set onGround by doing tiny trace down
   */

  player.velocity.y -= 9.81 * deltaTime

  V1.copy(player.position)
  V1.y -= 0.02
  traceStatics(player.position, V1, player.sizeMin, player.sizeMax)
  if ((Trace.hitFraction < 1 || Trace.startSolid) && player.velocity.y <= 0) {
    player.position.copy(Trace.endPos)
    player.velocity.y = 0
    onGround = true
    player.isWallRunning = false
    player.wallRunEnergy = 0.3
  }

  if (Input.buttons.JUMP.down && onGround) {
    player.velocity.y = 6
  }

  if (onGround) {
    applyFriction(deltaTime)
  }

  playerAccelerate(deltaTime, onGround)

  V1.copy(player.velocity)
  V1.y = 0
  document.getElementById('speedometer').innerHTML = V1.length()

  horizVel.set(player.velocity.x, 0, player.velocity.z)
  const preBumpSpeed = horizVel.length()

  V1.copy(player.position)
  V2.copy(player.velocity)
  const noStepDist = playerMoveStep(deltaTime)
  noStepPos.copy(player.position)
  noStepVel.copy(player.velocity)
  // reset move before step test
  player.position.copy(V1)
  player.velocity.copy(V2)
  const stepDist = playerMoveStep(deltaTime, 0.7)
  if (noStepDist >= stepDist) {
    player.position.copy(noStepPos)
    player.velocity.copy(noStepVel)
  } else {
    if (Trace.hitFraction < 1 && Trace.hitNormal.y > 0.7) {
      player.velocity.y = 0
    }
  }

  horizVel.x = player.velocity.x
  horizVel.z = player.velocity.z
  const speedLost = preBumpSpeed - horizVel.length()
  if (player.isWallRunning) {
    if (speedLost > 0) {
      player.velocity.y = 6.5
      player.wallRunEnergy -= deltaTime
    }
    if (player.wallRunEnergy <= 0) {
      player.wallRunEnergy = 0
      player.isWallRunning = false
    }
  } else {
    if (speedLost > 2 && player.wallRunEnergy > 0) {
      player.isWallRunning = true
    }
  }
}

export const updateAim = () => {
  const aimHeight = 1.25
  player.aimOrigin.copy(player.position)
  player.aimOrigin.y += aimHeight
  player.aimAngles.copy(Input.viewangle)
  forward.set(0, 0, -1).applyEuler(player.aimAngles)
  V2.copy(player.aimOrigin).addScaledVector(forward, 50)
  traceStatics(player.aimOrigin, V2)
  player.aimDot.position.copy(Trace.endPos)
  player.aimDot.rotation.x = Math.random() * Math.PI * 2
  player.aimDot.rotation.y = Math.random() * Math.PI * 2
  player.aimDot.rotation.z = Math.random() * Math.PI * 2
  player.aimObject = Trace.hitObject
}

export const updatePlayer = (time, deltaTime, camera) => {
  if (player.noclip) {
    noclipMove(deltaTime)
  } else {
    playerMove(deltaTime)
  }

  E1.set(0, Input.viewangle.y, 0)
  player.mesh.rotation.copy(E1)
  player.mesh.position.copy(player.position)
  player.mesh.position.y += (player.sizeMin.y + player.sizeMax.y) * 0.5

  forward.set(0, 0, -1).applyEuler(Input.viewangle)
  right.set(1, 0, 0).applyEuler(Input.viewangle)
  up.set(0, 1, 0).applyEuler(Input.viewangle)

  camera.position.copy(player.position)
    .addScaledVector(forward, -5)
    .addScaledVector(up, 2.5)
  camera.rotation.copy(Input.viewangle)

  updateAim()
  updateBuilder(deltaTime)
}
