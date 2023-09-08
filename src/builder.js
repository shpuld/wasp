import { updateStaticMesh, addStatic } from './statics'
import { roundTo, snapToGrid, Trace, setupRay, tracePlane, aabbVolume, isParallel, EPSILON } from './utils'
import Input from './input'
import * as T from 'three'
import Brick from '../assets/brick.png'
import Grid1 from '../assets/grid4.png'
import Grid2 from '../assets/grid3.png'

let _scene = undefined
let _player = undefined

const MODE_MOVE = 1
const MODE_GROW = 2
const MODE_SHRINK = 3
const MODE_CREATE = 4

let GRIDSIZE = 0.5

let build_mode = MODE_MOVE

let resize = {
  step: 0,
  axis: new T.Vector3()
}

let selectionMeshes = []
let selection = []

const loader = new T.TextureLoader()

const selectionMat = new T.MeshBasicMaterial({
  transparent: true,
  opacity: 0.5,
  depthTest: false,
  depthWrite: false,
  color: 0xff0000,
  wireframe: true,
})

const gridTexture = loader.load(Grid1)
gridTexture.minFilter = T.LinearFilter

const grid1mat = new T.MeshBasicMaterial({
  transparent: true,
  opacity: 1.0,
  blending: T.MultiplyBlending,
  map: gridTexture,
  depthFunc: T.LessEqualDepth,
  depthTest: true,
  depthWrite: false,
})

const grid2mat = new T.MeshBasicMaterial({
  transparent: true,
  opacity: 1.0,
  blending: T.MultiplyBlending,
  map: gridTexture,
  depthFunc: T.GreaterEqualDepth,
  depthTest: true,
  depthWrite: false,
})

let grid1 = undefined
let grid2 = undefined

const ghostMat = new T.MeshBasicMaterial({
  transparent: true,
  opacity: 0.7,
  depthTest: true,
  depthWrite: false,
  color: 0x20e040,
  wireframe: false,
  map: loader.load(Brick)
})

let ghostBlock = {
  sizeMin: new T.Vector3(),
  sizeMax: new T.Vector3(),
  mesh: new T.Mesh(new T.BoxGeometry(), ghostMat),
  point1: new T.Vector3(),
  point2: new T.Vector3(),
  normal: new T.Vector3(),
  step: 0
}

let E1 = new T.Euler(0, 0, 0, 'YXZ')
let V1 = new T.Vector3()

const setMode = (mode) => {
  if (build_mode === MODE_CREATE) {
    // cancel create
    build_mode = MODE_MOVE
    ghostBlock.step = 0
    ghostBlock.mesh.visible = false

    if (mode === MODE_CREATE) return
  }

  if (build_mode === MODE_GROW) {
    build_mode = MODE_MOVE
    resize.step = 0

    if (mode === MODE_GROW) return
  }

  build_mode = mode
  switch (mode) {
    case MODE_MOVE: break
    case MODE_GROW:
    case MODE_SHRINK:
      resize.step = 0
      break
    case MODE_CREATE:
      ghostBlock.step = 0
      selection = []
      updateSelectionMeshes()
      ghostBlock.mesh.visible = true
      break
  }
}


const updateSelectionMeshes = () => {
  for (let i = 0; i < selection.length; i++) {
    if (i >= selectionMeshes.length) {
      const newGeom = new T.BoxGeometry(1, 1, 1)
      const newMesh = new T.Mesh(newGeom, selectionMat)
      selectionMeshes.push(newMesh)
      _scene.add(selectionMeshes[i])
    }
    selectionMeshes[i].visible = true
    selectionMeshes[i].scale.copy(selection[i].mesh.scale)
    selectionMeshes[i].position.copy(selection[i].mesh.position)
  }
  for (let j = selection.length; j < selectionMeshes.length; j++) {
    selectionMeshes[j].visible = false
  }

}

export const selectBlock = () => {
  const isMultiSelect = Input.buttons.MULTI_SELECT.down
  build_mode = MODE_MOVE
  if (_player.aimObject) {
    if (isMultiSelect) {
      for (let i = 0; i < selection.length; i++) {
        if (selection[i] === _player.aimObject) {
          selection.splice(i, 1)
          updateSelectionMeshes()
          return
        }
      }
      selection.push(_player.aimObject)
    } else {
      selection = [_player.aimObject]
    }
  } else {
    if (!isMultiSelect) {
      selection = []
    }
  }
  updateSelectionMeshes()
}

export const buildPrimary = () => {
  switch (build_mode) {
    case MODE_CREATE:
      if (ghostBlock.step === 0) {
        ghostBlock.point1.copy(_player.aimDot.position)
        ghostBlock.normal.copy(Trace.hitNormal)
        snapToGrid(ghostBlock.point1, GRIDSIZE)
        ghostBlock.step += 1
        ghostBlock.point2.copy(ghostBlock.point1)
      } else if (ghostBlock.step === 1) {
        if (aabbVolume(ghostBlock) > EPSILON) {
          const newStatic = addStatic(_scene, ghostBlock.sizeMin, ghostBlock.sizeMax)
          selection = [newStatic]
          updateSelectionMeshes()
          ghostBlock.step = 0
          build_mode = MODE_MOVE
          ghostBlock.mesh.visible = false
        }
        /*
         * Flow for creating blocks:
         * 1. user presses create button once, ghost brick starts to show snapToGrid pos of aimDot
         * 2. user clicks, ghost brick starts to show block spanning from point1 to snapToGrid pos of aimDot
         * 2.1 move commands move point1 in case of misaimed click or wanting to start in the air etc
         * 3. user clicks, ghost brick gets turned into a solid static, new block gets selected automatically
         *
         */
      }

      break
    default:
      selectBlock()
      break
  }
}

const aaVectorSign = (vec) => {
  if (vec.x < -0.01 || vec.y < -0.01 || vec.z < -0.01) {
    return -1
  }
  return 1
}


const createCommand = (st) => ({
  static: st,
  preState: {
    sizeMin: st.sizeMin.clone(),
    sizeMax: st.sizeMax.clone()
  }
})

const undoCommand = (command) => {
  command.static.sizeMin.copy(command.preState.sizeMin)
  command.static.sizeMax.copy(command.preState.sizeMax)
  updateStaticMesh(command.static)
}

let undoStack = []
const pushUndo = () => {
  let commands = []
  for (let i = 0; i < selection.length; i++) {
    commands.push(createCommand(selection[i]))
  }
  undoStack.push(commands)
}

const popUndo = () => {
  if (undoStack.length <= 0) return
  const commands = undoStack.pop()
  for (let command of commands) {
    undoCommand(command)
  }
  updateSelectionMeshes()
}

const editSelection = (x, y, z) => {
  const amount = GRIDSIZE
  let yaw = roundTo(_player.aimAngles.y, Math.PI * 0.5)
  V1.set(x, y, z)
  E1.set(0, yaw, 0)
  V1.applyEuler(E1)

  switch (build_mode) {
    case MODE_CREATE:
      if (ghostBlock.step === 1) {
        ghostBlock.point1.addScaledVector(V1, amount)
        updateStaticMesh(ghostBlock)
      }
      break
    case MODE_MOVE:
      pushUndo()
      for (let i = 0; i < selection.length; i++) {
        selection[i].sizeMin.addScaledVector(V1, amount)
        selection[i].sizeMax.addScaledVector(V1, amount)
        updateStaticMesh(selection[i])
      }
      updateSelectionMeshes()
      break
    case MODE_GROW:
      if (resize.step === 0) {
        resize.axis.copy(V1)
        resize.step = 1
      }
      if (isParallel(V1, resize.axis)) {
        pushUndo()

        for (let i = 0; i < selection.length; i++) {
          if (aaVectorSign(resize.axis) > 0) {
            selection[i].sizeMax.addScaledVector(V1, amount)
          } else {
            selection[i].sizeMin.addScaledVector(V1, amount)
          }
          // Illegal transform
          if (aabbVolume(selection[i]) <= 0) {
            popUndo()
            break
          }
          updateStaticMesh(selection[i])
        }
        updateSelectionMeshes()
      }
      break
  }

  /*
  for (let i = 0; i < selection.length; i++) {
    switch (build_mode) {
      case MODE_MOVE:
        selection[i].sizeMin.addScaledVector(V1, amount)
        selection[i].sizeMax.addScaledVector(V1, amount)
        break
      case MODE_GROW:
        if (aaVectorSign(V1) < 0) {
          selection[i].sizeMin.addScaledVector(V1, amount)
        } else {
          selection[i].sizeMax.addScaledVector(V1, amount)
        }
        break
      case MODE_SHRINK:
        if (aaVectorSign(V1) < 0) {
          selection[i].sizeMax.addScaledVector(V1, amount)
        } else {
          selection[i].sizeMin.addScaledVector(V1, amount)
        }
        break
    }
    updateStaticMesh(selection[i])
  }

  updateSelectionMeshes()
  */
}

export const updateBuilder = (deltaTime) => {
  grid1.scale.setScalar(GRIDSIZE)
  grid1.position.copy(_player.aimDot.position)
  snapToGrid(grid1.position, GRIDSIZE)
  V1.copy(grid1.position).add(Trace.hitNormal)
  grid1.lookAt(V1)
  grid2.scale.copy(grid1.scale)
  grid2.position.copy(grid1.position)
  grid2.rotation.copy(grid1.rotation)
  grid1.position.addScaledVector(Trace.hitNormal, 0.001)
  grid2.position.addScaledVector(Trace.hitNormal, -0.001)

  if (ghostBlock.step === 0) {
    ghostBlock.sizeMin.copy(_player.aimDot.position)
    snapToGrid(ghostBlock.sizeMin, GRIDSIZE)
    ghostBlock.sizeMin.subScalar(0.1)
    ghostBlock.sizeMax.copy(ghostBlock.sizeMin).addScalar(0.2)
    updateStaticMesh(ghostBlock)
  }

  if (build_mode === MODE_CREATE) {
    if (ghostBlock.step === 1) {
      // aimOrigin + v_forward * 100
      V1.set(0, 0, -100).applyEuler(_player.aimAngles).add(_player.aimOrigin)
      setupRay(_player.aimOrigin, V1)
      tracePlane(ghostBlock.point1, ghostBlock.normal)
      if (Trace.hitFraction < 1) {
        ghostBlock.point2.copy(Trace.endPos)
        snapToGrid(ghostBlock.point2, GRIDSIZE)
        ghostBlock.point2.addScaledVector(ghostBlock.normal, GRIDSIZE)
      }
      ghostBlock.sizeMin.x = Math.min(ghostBlock.point1.x, ghostBlock.point2.x)
      ghostBlock.sizeMin.y = Math.min(ghostBlock.point1.y, ghostBlock.point2.y)
      ghostBlock.sizeMin.z = Math.min(ghostBlock.point1.z, ghostBlock.point2.z)
      ghostBlock.sizeMax.x = Math.max(ghostBlock.point1.x, ghostBlock.point2.x)
      ghostBlock.sizeMax.y = Math.max(ghostBlock.point1.y, ghostBlock.point2.y)
      ghostBlock.sizeMax.z = Math.max(ghostBlock.point1.z, ghostBlock.point2.z)
      updateStaticMesh(ghostBlock)
    }
  }
}

export const initBuilder = (scene, player) => {
  _scene = scene
  _player = player

  grid1 = new T.Mesh(new T.PlaneGeometry(32, 32), grid1mat)
  grid2 = new T.Mesh(new T.PlaneGeometry(32, 32), grid2mat)
  scene.add(grid1)
  scene.add(grid2)
  scene.add(ghostBlock.mesh)

  Input.buttons.BUILD_FORWARD.keydn = () => editSelection(0, 0, -1)
  Input.buttons.BUILD_BACK.keydn = () => editSelection(0, 0, 1)
  Input.buttons.BUILD_LEFT.keydn = () => editSelection(-1, 0, 0)
  Input.buttons.BUILD_RIGHT.keydn = () => editSelection(1, 0, 0)
  Input.buttons.BUILD_UP.keydn = () => editSelection(0, 1, 0)
  Input.buttons.BUILD_DOWN.keydn = () => editSelection(0, -1, 0)

  Input.buttons.MODE_MOVE.keyup = () => setMode(MODE_MOVE)
  Input.buttons.MODE_GROW.keyup = () => setMode(MODE_GROW)
  Input.buttons.MODE_SHRINK.keyup = () => setMode(MODE_SHRINK)
  Input.buttons.BUILD_UNDO.keyup = popUndo

  Input.buttons.BUILD_CREATE.keyup = () => setMode(MODE_CREATE)
}

