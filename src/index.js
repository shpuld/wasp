import Input from './input'
import { initStatics, addStatic, SOLID } from './statics'
import { initPlayer, updatePlayer } from './player'
import { createHud } from './hud'
import * as T from 'three'
import './index.css'
import Skygrid from '../assets/skygrid.png'
import CSM from 'three-csm'

//@ts-ignore
T.CSM = CSM

let scene = new T.Scene()
let csm = undefined

let entities = [];
const MAX_ENTITIES = 64;

const initEntities = () => {
  for (let i = 0; i < MAX_ENTITIES; i++) {
    const ent = {
      init: undefined,
      update: undefined,
      remove: undefined,
      free: true,
    };
    resetEntity(ent);
    entities.push(ent);
  }
};

const updateEntities = () => {
  entities.map((ent) => !ent.free && ent.update());
};

const resetEntity = (ent) => {
  ent.mesh = undefined;
  ent.update = undefined;
};

const addEntity = () => {
  for (ent of entities) {
    if (ent.free) {
      resetEntity(ent);
      ent.free = false;
      return ent;
    }
  }
};

const removeEntity = (removeMe) => {
  for (ent of entities) {
    if (ent === removeMe) {
      ent.free = false;
    }
  }
};

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
  let min = new T.Vector3(-16, 0, -16);
  let max = new T.Vector3(16, 1, 16);
  addStatic(scene, min, max, SOLID.BBOX)

  /*
  for (let i = 0; i < 128; i++) {
    min.randomDirection();
    min.y *= 0.05;
    min.multiplyScalar(60);
    snapToGrid(min)
    max.copy(min)
    max.x += 0.5 + Math.random() * 16
    max.z += 0.5 + Math.random() * 16
    max.y += 0.5 + Math.random() * 6
    snapToGrid(max)

    const geom = new T.BoxGeometry();
    const mesh = new T.Mesh(geom, mat);

    addStatic(scene, mesh, min, min, max, SOLID.BBOX);
  }
  */
};

const main = () => {
  const camera = new T.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    250,
  );

  const renderer = new T.WebGLRenderer();

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap // or any other type of shadowmap

  let sunDir = new T.Vector3(-0.5, -1, -0.25)
  sunDir.normalize()

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const hemi = new T.HemisphereLight(0x7080b0, 0x202a30, 0.8);
  scene.add(hemi);
  //const sun = new T.DirectionalLight(0xfff8e0, 1.0);
  //sun.position.copy(sunDir).negate();
  //scene.add(sun);
  camera.position.z = 5;

  //@ts-ignore
  csm = new T.CSM({
    maxFar: 100,
    cascades: 4,
    fade: true,
    mode: 'logarithmic',
    shadowBias: 0.0000002,
    shadowMapSize: 2048,
    lightDirection: sunDir,
    lightColor: 0xfff8e0,
    camera: camera,
    parent: scene
  });

  csm.fade = true

  const loader = new T.CubeTextureLoader();
  const cubemap = loader.load([
    Skygrid,
    Skygrid,
    Skygrid,
    Skygrid,
    Skygrid,
    Skygrid,
  ]);
  scene.background = cubemap;
  scene.backgroundBlurriness = 0.075;

  Input.registerInputListeners(renderer.domElement);

  initEntities();
  initStatics(csm);
  initPlayer(scene, csm);

  addBoxes();

  createHud();

  let oldTime = performance.now();

  let frameTimes = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  let idx = 0
  const fpsElem = document.getElementById('fps')
  const startFrame = (timeElapsed) => {
    const deltaTime = (timeElapsed - oldTime) * 0.001;
    const time = timeElapsed * 0.001;

    frameTimes[idx] = deltaTime
    idx++
    if (idx >= frameTimes.length) idx = 0
    let worstFrame = 0
    for (let f = 0; f < frameTimes.length; f++) {
      if (frameTimes[f] > worstFrame) {
        worstFrame = frameTimes[f]
      }
    }
    fpsElem.innerHTML = worstFrame * 1000

    requestAnimationFrame(startFrame);

    Input.processInput();
    updatePlayer(time, deltaTime, camera);

    csm.update(camera.matrix);
    renderer.render(scene, camera);

    Input.resetReleased();
    oldTime = timeElapsed;
  };

  startFrame(0);
};

main();
