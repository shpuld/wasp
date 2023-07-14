import * as T from 'three'

const registerInputListeners = (canvas) => {
  document.addEventListener('keydown', keyDownListener)
  document.addEventListener('keyup', keyUpListener)
  canvas.addEventListener('click', async () => {
    await canvas.requestPointerLock({ unadjustedMovement: true })
  })
  canvas.addEventListener('mousemove', mouseListener)
}

let mouseDeltaX = 0
let mouseDeltaY = 0

const mouseListener = (event) => {
  if (document.pointerLockElement) {
    mouseDeltaX += event.movementX
    mouseDeltaY += event.movementY
  }
}

let buttons = {}
const addInput = (action, keys) => {
  buttons[action] = {
    down: false,
    _keys: keys
  }
}

addInput('FORWARD', ['KeyW'])
addInput('BACK', ['KeyS'])
addInput('LEFT', ['KeyA'])
addInput('RIGHT', ['KeyD'])
addInput('JUMP', ['Space'])

const keyDownListener = (event) => {
  const actions = Object.keys(buttons)
  for (let a of actions) {
    if (buttons[a]._keys.includes(event.code)) {
      buttons[a].down = true
    }
  }
}

const keyUpListener = (event) => {
  const actions = Object.keys(buttons)
  for (let a of actions) {
    if (buttons[a]._keys.includes(event.code))
      buttons[a].down = false
  }
}


let viewangle = new T.Euler(0, 0, 0, 'YXZ')
let movevalues = new T.Vector2(0, 0)

const processInput = () => {
  viewangle.x -= mouseDeltaY * 0.002
  viewangle.y -= mouseDeltaX * 0.002
  mouseDeltaX = 0
  mouseDeltaY = 0
  const maxUpDown = Math.PI * 0.45;
  viewangle.x = Math.max(Math.min(maxUpDown, viewangle.x), -maxUpDown)

  movevalues.x = 0
  movevalues.y = 0
  if (buttons['FORWARD'].down) movevalues.x += 1
  if (buttons['BACK'].down) movevalues.x += -1
  if (buttons['RIGHT'].down) movevalues.y += 1
  if (buttons['LEFT'].down) movevalues.y += -1

  movevalues.normalize()
}

export default {
  buttons,
  viewangle,
  movevalues,
  processInput,
  registerInputListeners
}
