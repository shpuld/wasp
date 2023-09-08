import * as T from 'three'

const registerInputListeners = (canvas) => {
  document.addEventListener('keydown', keyDownListener)
  document.addEventListener('keyup', keyUpListener)
  canvas.addEventListener('click', async () => {
    await canvas.requestPointerLock(/*{ unadjustedMovement: true }*/)
  })
  canvas.addEventListener('mousemove', mouseListener)
  canvas.addEventListener('mousedown', emulateKeyEvent(keyDownListener))
  canvas.addEventListener('mouseup', emulateKeyEvent(keyUpListener))
}

const emulateKeyEvent = (handler) => (event) => {
  if (document.pointerLockElement) {
    event.code = 'Mouse' + (event.button + 1)
    handler(event)
  }
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
const addInput = (action, keys, keydn = undefined, keyup = undefined) => {
  buttons[action] = {
    down: false,
    released: false,
    keydn,
    keyup,
    _keys: keys
  }
}

addInput('FORWARD', ['KeyW'])
addInput('BACK', ['KeyS'])
addInput('LEFT', ['KeyA'])
addInput('RIGHT', ['KeyD'])
addInput('JUMP', ['Space'])
addInput('NOCLIP', ['KeyB'])
addInput('PRIMARY_ACTION', ['Mouse1'])
addInput('SECONDARY_ACTION', ['Mouse2'])
addInput('MULTI_SELECT', ['ShiftLeft'])
addInput('BUILD_FORWARD', ['ArrowUp'])
addInput('BUILD_BACK', ['ArrowDown'])
addInput('BUILD_LEFT', ['ArrowLeft'])
addInput('BUILD_RIGHT', ['ArrowRight'])
addInput('BUILD_UP', ['PageUp'])
addInput('BUILD_DOWN', ['PageDown'])
addInput('MODE_MOVE', ['Digit1'])
addInput('MODE_GROW', ['Digit2'])
addInput('MODE_SHRINK', ['Digit3'])
addInput('BUILD_UNDO', ['KeyZ'])
addInput('BUILD_DELETE', ['Backspace'])
addInput('BUILD_CREATE', ['KeyE'])

const keyDownListener = (event) => {
  const actions = Object.keys(buttons)
  for (let a of actions) {
    if (buttons[a]._keys.includes(event.code)) {
      buttons[a].down = true
      if (buttons[a].keydn) {
        buttons[a].keydn(event)
      }
    }
  }
}

const keyUpListener = (event) => {
  const actions = Object.keys(buttons)
  for (let a of actions) {
    if (buttons[a]._keys.includes(event.code)) {
      buttons[a].down = false
      buttons[a].released = true
      if (buttons[a].keyup) {
        buttons[a].keyup(event)
      }
    }
  }
}

const resetReleased = () => {
  const actions = Object.keys(buttons)
  for (let a of actions) {
    buttons[a].released = false
  }
}

let viewangle = new T.Euler(0, 0, 0, 'YXZ')
let movevalues = new T.Vector2(0, 0)

const processInput = () => {
  viewangle.x -= mouseDeltaY * 0.002
  viewangle.y -= mouseDeltaX * 0.002
  if (viewangle.y < 0) {
    viewangle.y += Math.PI * 2.0
  } else if (viewangle.y > Math.PI * 2.0) {
    viewangle.y -= Math.PI * 2.0
  }
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
  registerInputListeners,
  resetReleased
}
