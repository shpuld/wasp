import Input from './input'
import { initStatics, addStatic, traceStatics, SOLID } from './statics'
import { initPlayer, updatePlayer } from './player'
import { Trace } from './utils'
import * as T from 'three'
import './index.css'
import Skygrid from '../assets/skygrid.png'

let scene = new T.Scene()

let entities = []
const MAX_ENTITIES = 64

const initEntities = () => {
  for (let i = 0; i < MAX_ENTITIES; i++) {
    const ent = {
      init: undefined,
      update: undefined,
      remove: undefined,
      free: true
    }
    resetEntity(ent)
    entities.push(ent)
  }
}

const updateEntities = () => {
  entities.map(ent => !ent.free && ent.update())
}

const resetEntity = (ent) => {
  ent.mesh = undefined
  ent.update = undefined
}

const addEntity = () => {
  for (ent of entities) {
    if (ent.free) {
      resetEntity(ent)
      ent.free = false
      return ent
    }
  }
}

const removeEntity = (removeMe) => {
  for (ent of entities) {
    if (ent === removeMe) {

      ent.free = false
    }
  }
}

/*
 * Plan:
 *
 * make entities that automatically call update per frame
 * entities contain everything interactable, player, enemies, bullets, items
 *
 * make statics that contains just static geometry, they are used for collision and rendering
 *
 * make effects that have update and render, but no collision
 *
 */


const addBoxes = () => {
  let P = new T.Vector3()
  let min = new T.Vector3()
  let max = new T.Vector3()

  const mat = new T.MeshStandardMaterial({ color: 0xe0e0e0 })

  for (let i = 0; i < 128; i++) {
    P.randomDirection()
    P.y *= 0.1
    P.multiplyScalar(26)
    min.random().addScalar(0.3).multiplyScalar(-3)
    max.copy(min).multiplyScalar(-1)

    const geom = new T.BoxGeometry(max.x * 2, max.y * 2, max.z * 2)
    const mesh = new T.Mesh(geom, mat)

    addStatic(scene, mesh, P, min, max, SOLID.BBOX)
  }
}

const main = () => {
  const camera = new T.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

  const renderer = new T.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  const geom = new T.BoxGeometry(1, 2, 1)
  const mat = new T.MeshStandardMaterial({ color: 0xe8e8e8 })
  const cube = new T.Mesh(geom, mat)
  scene.add(cube)
  const hemi = new T.HemisphereLight(0x7080b0, 0x202a30, 0.8)
  scene.add(hemi)
  const sun = new T.DirectionalLight(0xfff8e0, 1.0)
  sun.position.set(0.5, 1, 0.25)
  scene.add(sun)
  camera.position.z = 5

  const loader = new T.CubeTextureLoader()
  const cubemap = loader.load([Skygrid, Skygrid, Skygrid, Skygrid, Skygrid, Skygrid])
  scene.background = cubemap
  scene.backgroundBlurriness = 0.075

  Input.registerInputListeners(renderer.domElement)

  initEntities()
  initStatics()
  initPlayer(scene)

  addBoxes()

  let oldTime = performance.now()

  const startFrame = (timeElapsed) => {
    const deltaTime = (timeElapsed - oldTime) * 0.001
    const time = timeElapsed * 0.001

    requestAnimationFrame(startFrame)

    Input.processInput()
    updatePlayer(time, deltaTime, camera)
    /*
    camera.setRotationFromEuler(Input.viewangle)
    // Forward
    V.set(0, 0, -1)
    V.applyEuler(Input.viewangle)
    camera.position.addScaledVector(V, deltaTime * Input.movevalues.x * 4)
    // Right
    V.set(1, 0, 0)
    V.applyEuler(Input.viewangle)
    camera.position.addScaledVector(V, deltaTime * Input.movevalues.y * 4)

    camera.getWorldDirection(V2)
    V.copy(camera.position).addScaledVector(V2, 10)
    V2.set(-0.5, -1, -0.5)
    V3.set(0.5, 1, 0.5)
    traceStatics(camera.position, V, V2, V3)
    cube.position.copy(Trace.endPos)
    */

    renderer.render(scene, camera)

    oldTime = timeElapsed
  }

  startFrame(0)
}

main()
