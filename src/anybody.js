import Prando from 'prando'

import EventEmitter from 'events'
import Sound from './sound.js'
import { Visuals } from './visuals.js'
import { Calculations } from './calculations.js'
import { utils } from 'ethers'
import { randHSL, hslToRgb, bodyThemes } from './colors.js'
import { loadFonts } from './fonts.js'
import { Buttons } from './buttons.js'
// import wc from './witness_calculator.js'

const GAME_LENGTH_BY_LEVEL_INDEX = [10, 20, 30, 40, 50]
const NORMAL_GRAVITY = 100
const proverTickIndex = {
  2: 250,
  3: 250,
  4: 250,
  5: 125,
  6: 125
}
function intersectsButton(button, x, y) {
  return (
    x > button.x &&
    x < button.x + button.width &&
    y > button.y &&
    y < button.y + button.height
  )
}

const PAUSE_BODY_DATA = [
  {
    bodyIndex: 0,
    seed: '0x34f645e62a9fb47226675e36c76e717bee1cc4688cdbd2ce1a2343e0fb210afa',
    radius: 36000,
    px: 149311,
    py: 901865,
    vx: 0,
    vy: 0
  },
  {
    bodyIndex: 1,
    seed: '0x34f645e62a9fb47276675e36c76e717bee1cc4688cdbx2ce1a2343e0fb210afa',
    radius: 32000,
    px: 309311,
    py: 121865,
    vx: 0,
    vy: 0
  },
  {
    bodyIndex: 2,
    seed: '0x34f645e62a9fb47426675e36c76e717bee1cc4688cdbd2te1a2343e0fb210afa',
    radius: 30000,
    px: 850311,
    py: 811865,
    vx: 0,
    vy: 0
  },
  {
    bodyIndex: 3,
    seed: '0xfc7bf9b39ccf2426bd93629ff94dff5e6e9347098494ac42ea7c7d7339b09f2a',
    radius: 7000,
    px: 833406,
    py: 103029,
    vx: 0,
    vy: 0
  },
  {
    bodyIndex: 4,
    seed: '0xd85fb8fd2d7ea126a9c3f53553f987bb4a52c0beea472672edeb4d39dcfcdd19',
    radius: 20000,
    px: 705620,
    py: 178711,
    vx: -100000,
    vy: -1111000
  },
  {
    bodyIndex: 5,
    seed: '0xd4528b05a80492ac1160e49f070b2f77b2e2b4180b360be799a920f35926aa5d',
    radius: 17000,
    px: 139878,
    py: 454946,
    vx: 0,
    vy: 0
  },
  {
    bodyIndex: 6,
    seed: '0xd4528b05a80492ac1160e49f070b2f77b2e2b4180b360be799a920f35926aa5d',
    radius: 9000,
    px: 289878,
    py: 694946,
    vx: 0,
    vy: 0
  },
  {
    bodyIndex: 7,
    seed: '0xd4528b05a80492ac1160e49f070b2f77b2e2b4180b360be799a920f35926aa5d',
    radius: 14000,
    px: 589878,
    py: 694946,
    vx: -100000,
    vy: -1111000
  }
]

export class Anybody extends EventEmitter {
  constructor(p, options = {}) {
    super()

    Object.assign(this, Visuals)
    Object.assign(this, Calculations)
    Object.assign(this, Buttons)

    this.setOptions(options)

    // Add other constructor logic here
    this.p = p
    !this.util && loadFonts(this.p)
    // this.p.blendMode(this.p.DIFFERENCE)

    this.clearValues()
    !this.util && this.prepareP5()
    this.sound = new Sound(this)
    this.init()
    !this.util && this.start()
  }

  proverTickIndex(i) {
    return proverTickIndex[i]
  }

  setOptions(options = {}) {
    const defaultOptions = {
      day: 324000,
      level: 1,
      bodyData: null,
      // Add default properties and their initial values here
      startingBodies: 1,
      windowWidth: 1000,
      windowHeight: 1000,
      pixelDensity: 4, //4, // Math.min(4, 4 * (window.devicePixelRatio ?? 1)),
      scalingFactor: 10n ** 3n,
      minDistanceSquared: 200 * 200,
      G: NORMAL_GRAVITY, // Gravitational constant
      mode: 'game', // game or nft
      admin: false,
      solved: false,
      clearBG: true,
      colorStyle: '!squiggle', // squiggle or !squiggle
      preRun: 0,
      alreadyRun: 0,
      paintSteps: 0,
      chunk: 1,
      mute: true,
      freeze: false,
      test: false,
      util: false,
      paused: true,
      globalStyle: 'default', // 'default', 'psycho'
      aimHelper: false,
      target: 'inside', // 'outside' or 'inside'
      faceRotation: 'mania', // 'time' or 'hitcycle' or 'mania'
      sfx: 'bubble', // 'space' or 'bubble'
      ownerPresent: false
    }
    // Merge the default options with the provided options
    const mergedOptions = { ...defaultOptions, ...options }
    // Assign the merged options to the instance properties
    Object.assign(this, mergedOptions)
  }
  removeCSS() {
    if (typeof document === 'undefined') return
    const style = document.getElementById('canvas-cursor')
    style && document.head.removeChild(style)
  }
  addCSS() {
    if (typeof document === 'undefined') return
    if (document.getElementById('canvas-cursor')) return
    const style = document.createElement('style')
    style.id = 'canvas-cursor' // Add an id to the style element

    style.innerHTML = `
      canvas {
        cursor: none;
      }
    `
    console.log({ style })
    document.head.appendChild(style)
  }

  // run whenever the class should be reset
  clearValues() {
    this.lastMissileCantBeUndone = false
    this.speedFactor = 2
    this.speedLimit = 10
    this.G = NORMAL_GRAVITY
    this.vectorLimit = this.speedLimit * this.speedFactor
    this.FPS = 25
    this.P5_FPS_MULTIPLIER = 3
    this.P5_FPS = this.FPS * this.P5_FPS_MULTIPLIER
    this.p.frameRate(this.P5_FPS)
    this.timer =
      (this.level > 5 ? 60 : GAME_LENGTH_BY_LEVEL_INDEX[this.level - 1]) *
      this.FPS
    this.deadOpacity = '0.9'
    this.initialScoreSize = 120
    this.scoreSize = this.initialScoreSize
    this.opac = this.globalStyle == 'psycho' ? 1 : 1
    this.tailLength = 1
    this.tailMod = this.globalStyle == 'psycho' ? 2 : 1
    this.explosions = []
    this.missiles = []
    this.missileInits = []
    this.bodies = []
    this.witheringBodies = []
    this.bodyInits = []
    this.bodyFinal = []
    this.allCopiesOfBodies = []
    this.missileCount = 0
    this.frames = 0
    this.p5Frames = 0
    this.showIt = true
    this.justStopped = false
    this.gameOver = false
    this.firstFrame = true
    this.loaded = false
    this.showPlayAgain = false
    this.handledGameOver = false
    this.statsText = ''
    this.hasStarted = false
    this.buttons = {}
    this.won = false
    this.finalBatchSent = false
    this.solved = false
  }

  // run once at initilization
  init() {
    this.seed = utils.solidityKeccak256(['uint256'], [this.day])
    this.rng = new Prando(this.seed.toString(16))
    this.generateBodies()
    this.frames = this.alreadyRun
    this.startingFrame = this.alreadyRun
    this.stopEvery = this.test ? 20 : this.proverTickIndex(this.level + 1)
    // const vectorLimitScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    this.setPause(this.paused, true)
    this.storeInits()
    // this.prepareWitness()
  }

  async start() {
    this.addCSS()
    this.addListeners()
    this.runSteps(this.preRun)
    // this.paintAtOnce(this.paintSteps)
    if (this.freeze) {
      this.setPause(true, true)
    }
  }

  destroy() {
    this.setPause(true)
    this.p.noLoop()
    this.removeListener()
    this.sound.stop()
    this.sound = null
    this.p.remove()
  }

  storeInits() {
    this.bodyCopies = JSON.parse(JSON.stringify(this.bodies))
    this.bodyInits = this.processInits(this.bodies)
  }

  processInits(bodies) {
    return this.convertBodiesToBigInts(bodies).map((b) => {
      b = this.convertScaledBigIntBodyToArray(b)
      b[2] = BigInt(b[2]).toString()
      b[3] = BigInt(b[3]).toString()
      return b
    })
  }

  runSteps(n = this.preRun) {
    let runIndex = 0
    let keepSimulating = true
    this.showIt = false
    while (keepSimulating) {
      runIndex++
      if (runIndex > n) {
        keepSimulating = false
        this.showIt = true
        // n > 0 && console.log(`${n.toLocaleString()} runs`)
      } else {
        const results = this.step(this.bodies, this.missiles)
        this.frames++
        this.bodies = results.bodies
        this.missiles = results.missiles || []
      }
    }
  }

  addListeners() {
    const { canvas } = this.p

    // binding dummy handlers is necessary for p5 to listen to touchmove
    // and track mouseX and mouseY
    this.p.touchStarted = () => {}
    this.p.mouseMoved = this.handleMouseMove
    this.p.touchMoved = this.handleMouseMove
    this.p.mousePressed = this.handleMousePressed
    this.p.mouseReleased = this.handleMouseReleased
    this.p.touchEnded = () => {}

    if (typeof window !== 'undefined' && this.mode == 'game') {
      canvas.removeEventListener('click', this.handleNFTClick)
      canvas.addEventListener('click', this.handleGameClick)
      canvas.addEventListener('touchend', this.handleGameClick)
      window.addEventListener('keydown', this.handleGameKeyDown)
    } else {
      canvas.removeEventListener('click', this.handleGameClick)
      window?.removeEventListener('keydown', this.handleGameKeyDown)
      canvas.addEventListener('click', this.handleGameClick)
    }
  }

  removeListener() {
    const { canvas } = this.p
    canvas?.removeEventListener('click', this.handleNFTClick)
    canvas?.removeEventListener('click', this.handleGameClick)
    canvas?.removeEventListener('touchend', this.handleGameClick)
    window?.removeEventListener('keydown', this.handleGameKeyDown)
    window?.removeEventListener('keydown', this.sound.handleKeyDown)
  }

  getXY(e) {
    // e may be a touch event or a click event
    if (e.touches) {
      e = e.touches[0] || e.changedTouches[0]
    }
    let x = e.offsetX || e.pageX
    let y = e.offsetY || e.pageY
    const rect = e.target.getBoundingClientRect()
    const actualWidth = rect.width
    x = (x * this.windowWidth) / actualWidth
    y = (y * this.windowWidth) / actualWidth
    return { x, y }
  }

  handleMouseMove = (e) => {
    const { x, y } = this.getXY(e)
    this.mouseX = x
    this.mouseY = y
    // check if mouse is inside any of the buttons
    for (const key in this.buttons) {
      const button = this.buttons[key]
      button.hover = intersectsButton(button, x, y)
    }
  }

  handleMousePressed = (e) => {
    const { x, y } = this.getXY(e)
    for (const key in this.buttons) {
      const button = this.buttons[key]
      button.active = intersectsButton(button, x, y)
    }
  }

  handleMouseReleased = () => {
    for (const key in this.buttons) {
      const button = this.buttons[key]
      if (button.active) button.active = false
    }
  }

  handleGameClick = (e) => {
    const { x, y } = this.getXY(e)
    // if mouse is inside of a button, call the button's handler
    for (const key in this.buttons) {
      const button = this.buttons[key]
      if (button.visible && intersectsButton(button, x, y)) {
        button.onClick()
        return
      }
    }

    this.missileClick(x, y)
  }

  handleNFTClick = () => {
    this.setPause()
  }

  handleGameKeyDown = (e) => {
    const modifierKeyActive = e.shiftKey && e.altKey && e.ctrlKey && e.metaKey
    if (modifierKeyActive) return
    switch (e.code) {
      case 'Space':
        if (this.mouseX || this.mouseY) {
          e.preventDefault()
          this.missileClick(this.mouseX, this.mouseY)
        }
        break
      case 'KeyR':
        this.restart(null, false)
        break
      case 'KeyP':
        this.setPause()
        break
    }
  }

  handleGameOver = ({ won }) => {
    if (this.handledGameOver) return
    this.handledGameOver = true

    this.sound?.playGameOver({ won })
    this.gameOver = true
    this.won = won
    this.G = 2000 // make the badies dance
    this.P5_FPS *= 3
    this.p.frameRate(this.P5_FPS)
    var dust = 0
    var timeTook = 0

    const stats = this.calculateStats()
    dust = stats.dust
    timeTook = stats.timeTook
    this.framesTook = stats.framesTook
    void this.setStatsText(stats)
    void this.setShowPlayAgain()
    this.emit('done', {
      won,
      ticks: this.frames - this.startingFrame,
      dust,
      timeTook,
      framesTook: this.framesTook
    })
    if (won) {
      this.bodyData = null
    }
    this.removeCSS()
    if (won) {
      this.finish()
    }
  }

  restart = (options, beginPaused = true) => {
    if (this.won) {
      this.level++
    }
    if (options) {
      this.setOptions(options)
    }
    this.clearValues()
    // this.sound?.stop()
    this.sound?.playStart()
    this.init()
    this.draw()
    if (!beginPaused) {
      this.setPause(false)
    }
    this.addCSS()
  }

  doubleTextInverted(text) {
    return text.slice(0, -1) + text.split('').reverse().join('')
  }

  setStatsText = async (stats) => {
    const statLines = [
      this.doubleTextInverted(`¸♩·¯·♬¸¸♬·¯·♩¸¸♪¯`),
      `${stats.bodiesIncluded - 1} bodies cleared`,
      `in ${stats.timeTook} sec 🐎`,
      `with ${stats.missilesShot} missiles 🚀`,
      `👈👈 Save Your Game👈👈`
    ]
    const toShow = statLines.join('\n')
    this.statsText = toShow

    await this.setShowPlayAgain(1000)
    this.sound?.playSuccess()
  }

  setShowPlayAgain = async (timeout = 2000) => {
    if (this.ownerPresent) return // retry button in vue frontend
    await new Promise((resolve) => setTimeout(resolve, timeout))
    this.showPlayAgain = true
  }

  setPause(newPauseState = !this.paused, mute = false) {
    if (newPauseState) {
      this.pauseBodies = PAUSE_BODY_DATA.map(this.bodyDataToBodies.bind(this))
      this.pauseBodies[1].c = this.getBodyColor(0)
      this.pauseBodies[2].c = this.getBodyColor(0)
    }

    if (typeof newPauseState !== 'boolean') {
      newPauseState = !this.paused
    }
    this.paused = newPauseState
    this.justPaused = true
    this.emit('paused', this.paused)
    if (newPauseState) {
      if (!mute) this.sound?.pause()
    } else {
      if (!mute) this.sound?.resume()
    }
  }

  step() {
    if (this.missiles.length == 0 && this.lastMissileCantBeUndone) {
      this.lastMissileCantBeUndone = false
    }
    this.bodies = this.forceAccumulator(this.bodies)
    var results = this.detectCollision(this.bodies, this.missiles)
    this.bodies = results.bodies
    this.missiles = results.missiles || []

    if (this.missiles.length > 0 && this.missiles[0].radius == 0) {
      this.missiles.splice(0, 1)
    } else if (this.missiles.length > 1 && this.missiles[0].radius !== 0) {
      // NOTE: follows logic of circuit
      const newMissile = this.missiles.splice(0, 1)
      this.missiles.splice(0, 1, newMissile[0])
    }
    return { bodies: this.bodies, missiles: this.missiles }
  }

  started() {
    this.emit('started', {
      day: this.day,
      level: this.level,
      bodyInits: JSON.parse(JSON.stringify(this.bodyInits))
    })
  }

  processMissileInits(missiles) {
    const radius = 10
    return missiles.map((b) => {
      const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
      return {
        step: b.step,
        x: this.convertFloatToScaledBigInt(b.position.x).toString(),
        y: this.convertFloatToScaledBigInt(b.position.y).toString(),
        vx: (
          this.convertFloatToScaledBigInt(b.velocity.x) + maxVectorScaled
        ).toString(),
        vy: (
          this.convertFloatToScaledBigInt(b.velocity.y) + maxVectorScaled
        ).toString(),
        radius: radius.toString()
      }
    })
  }

  finish() {
    if (this.finalBatchSent) return
    // this.finished = true
    // this.setPause(true)
    const maxVectorScaled = parseInt(
      this.convertFloatToScaledBigInt(this.vectorLimit)
    ).toString()

    this.calculateBodyFinal()
    const missileInits = []
    if (this.mode == 'game') {
      let missileIndex = 0
      // loop through all the steps that were just played since the last chunk
      for (let i = this.alreadyRun; i < this.alreadyRun + this.stopEvery; i++) {
        // if the step index matches the step where a missile was shot, add the missile to the missileInits
        // otherwise fill the missileInit array with an empty missile
        if (this.missileInits[missileIndex]?.step == i) {
          const missile = this.missileInits[missileIndex]
          missileInits.push([missile.vx, missile.vy, missile.radius])
          missileIndex++
        } else {
          missileInits.push([maxVectorScaled, maxVectorScaled, '0'])
        }
      }
      // add one more because missileInits contains one extra for circuit
      missileInits.push([maxVectorScaled, maxVectorScaled, '0'])
    }

    // define the inflightMissile for the proof from the first missile shot during this chunk
    // if the first missile shot was shot at step == alreadyRun (start of this chunk)
    // add it as an inflightMissile otherwise add a dummy missile
    let inflightMissile =
      this.missileInits[0]?.step == this.alreadyRun
        ? this.missileInits[0]
        : {
            x: '0',
            y: (this.windowWidth * parseInt(this.scalingFactor)).toString(),
            vx: '20000',
            vy: '20000',
            radius: '0'
          }
    inflightMissile = [
      inflightMissile.x,
      inflightMissile.y,
      inflightMissile.vx,
      inflightMissile.vy,
      inflightMissile.radius
    ]

    // defind outflightMissile for the proof from the currently flying missiles
    // if there is no missile flying, add a dummy missile
    const outflightMissileTmp = this.missiles[0] || {
      px: '0',
      py: (this.windowWidth * parseInt(this.scalingFactor)).toString(),
      vx: '2000',
      vy: '2000',
      radius: '0'
    }
    const outflightMissile = [
      outflightMissileTmp.px,
      outflightMissileTmp.py,
      outflightMissileTmp.vx,
      outflightMissileTmp.vy,
      outflightMissileTmp.radius
    ]

    const { day, level, bodyInits, bodyFinal, framesTook } = this

    const results = JSON.parse(
      JSON.stringify({
        day,
        level,
        inflightMissile,
        missiles: missileInits,
        bodyInits,
        bodyFinal,
        framesTook,
        outflightMissile
      })
    )

    this.bodyInits = JSON.parse(JSON.stringify(this.bodyFinal))
    this.alreadyRun = this.frames
    this.missileInits = this.processMissileInits(this.missiles).map((m) => {
      m.step = this.frames
      return m
    })
    this.emit('chunk', results)
    this.bodyFinal = []
    // this.setPause(false)
    if (
      this.mode == 'game' &&
      this.bodies.slice(1).reduce((a, c) => a + c.radius, 0) == 0
    ) {
      this.finalBatchSent = true
    }
    if (this.missileInits.length > 0) {
      // TODO: this is a hack to prevent proofs from breaking,
      // maybe should add visuals and turn it into a feature (single shot mode)
      this.lastMissileCantBeUndone = true
    }
    return results
  }

  generateLevelData(day, level) {
    const bodyData = []
    for (let i = 0; i <= level; i++) {
      const dayLevelIndexSeed = utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256'],
        [day, level, i]
      )
      bodyData.push(this.getRandomValues(dayLevelIndexSeed, i))
    }
    return bodyData
  }

  getRandomValues(dayLevelIndexSeed, index) {
    const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)

    const body = {}
    body.bodyIndex = index
    body.seed = dayLevelIndexSeed
    body.radius = this.genRadius(index)

    let rand = utils.solidityKeccak256(['bytes32'], [dayLevelIndexSeed])
    body.px = this.randomRange(
      0,
      BigInt(this.windowWidth) * this.scalingFactor,
      rand
    )

    rand = utils.solidityKeccak256(['bytes32'], [rand])
    body.py = this.randomRange(
      0,
      BigInt(this.windowWidth) * this.scalingFactor,
      rand
    )

    rand = utils.solidityKeccak256(['bytes32'], [rand])
    body.vx = this.randomRange(
      maxVectorScaled / 2n,
      (maxVectorScaled * 3n) / 2n,
      rand
    )

    rand = utils.solidityKeccak256(['bytes32'], [rand])
    body.vy = this.randomRange(
      maxVectorScaled / 2n,
      (maxVectorScaled * 3n) / 2n,
      rand
    )

    return body
  }

  genRadius(index) {
    const radii = [36n, 27n, 22n, 17n, 12n, 7n] // n * 5 + 2
    let size = radii[index % radii.length]
    return parseInt(size * BigInt(this.scalingFactor))
  }

  randomRange(minBigInt, maxBigInt, seed) {
    minBigInt = typeof minBigInt === 'bigint' ? minBigInt : BigInt(minBigInt)
    maxBigInt = typeof maxBigInt === 'bigint' ? maxBigInt : BigInt(maxBigInt)
    seed = typeof seed === 'bigint' ? seed : BigInt(seed)
    return parseInt((seed % (maxBigInt - minBigInt)) + minBigInt)
  }

  generateBodies() {
    this.bodyData =
      this.bodyData || this.generateLevelData(this.day, this.level)
    this.bodies = this.bodyData.map(this.bodyDataToBodies.bind(this))
    this.startingBodies = this.bodies.length
  }

  getFaceIdx(seed) {
    const face = this.random(0, 1000, new Prando(seed))
    const faceDistribution = [200, 400, 600, 700, 800, 850, 900, 950, 980, 1000]
    let faceIndex = 0
    for (let i = 0; i < faceDistribution.length; i++) {
      if (face < faceDistribution[i]) {
        faceIndex = i
        break
      }
    }
    return faceIndex
  }

  bodyDataToBodies(b) {
    const bodyIndex = b.bodyIndex
    const px = b.px / parseInt(this.scalingFactor)
    const py = b.py / parseInt(this.scalingFactor)
    const vx =
      (b.vx - this.vectorLimit * parseInt(this.scalingFactor)) /
      parseInt(this.scalingFactor)
    const vy =
      (b.vy - this.vectorLimit * parseInt(this.scalingFactor)) /
      parseInt(this.scalingFactor)
    const radius = b.radius / parseInt(this.scalingFactor)
    // const faceIndex = this.getFaceIdx(b.seed)
    return {
      seed: b.seed,
      // faceIndex,
      bodyIndex: bodyIndex,
      position: this.createVector(px, py),
      velocity: this.createVector(vx, vy),
      radius: radius,
      c: this.getBodyColor(bodyIndex)
    }
  }

  getBodyColor(bodyIndex) {
    if (bodyIndex == 0) {
      // TEMP random body theme
      const themes = Object.keys(bodyThemes)
      const theme = themes[this.random(0, themes.length - 1)]

      return {
        bg: hslToRgb(randHSL(bodyThemes[theme].bg, this.random.bind(this))),
        core: hslToRgb(randHSL(bodyThemes[theme].cr, this.random.bind(this))),
        fg: hslToRgb(randHSL(bodyThemes[theme].fg, this.random.bind(this)))
      }
    } else {
      return randHSL([undefined, '90-100', '55-60'], this.random.bind(this))
    }
  }

  random(min, max, rng = this.rng) {
    return rng.nextInt(min, max)
  }

  randomColor(min = 0, max = 359, rng = this.rng) {
    const color = []

    // let c = Math.floor(this.random(min, max, rng))
    let c = this.random(min, max, rng)
    color.push(c) // Hue
    color.push(this.random(0, 100, rng) + '%') // Saturation
    color.push(this.random(40, 80, rng) + '%') // Lightness
    return color
  }
  prepareP5() {
    this.p.frameRate(this.P5_FPS)
    this.p.createCanvas(this.windowWidth, this.windowWidth)
    // this.p.pixelDensity(this.pixelDensity)
    this.p.background('white')
  }

  missileClick(x, y) {
    if (this.paused) {
      this.setPause(false)
      return
    }
    if (
      this.bodies.reduce((a, c) => a + c.radius, 0) == 0 ||
      this.frames - this.startingFrame >= this.timer
    ) {
      return
    }
    // if (this.missiles.length > 0 && !this.admin) {
    //   // this is a hack to prevent multiple missiles from being fired
    //   this.missiles = []
    //   // remove latest missile from missileInits
    //   this.missileInits.pop()
    // }

    if (this.lastMissileCantBeUndone) {
      if (this.missiles.length > 0) {
        console.log('CANT ADD NEW MISSILE')
        return
      } else {
        this.lastMissileCantBeUndone = false
      }
    } else if (this.missiles.length > 0) {
      this.missileInits.pop()
      this.missileCount--
    }

    this.missileCount++
    const radius = 10

    const b = {
      step: this.frames,
      position: this.p.createVector(0, this.windowWidth),
      velocity: this.p.createVector(x, y - this.windowWidth),
      radius
    }
    // b.velocity.setMag(this.speedLimit * this.speedFactor)
    b.velocity.limit(this.speedLimit * this.speedFactor)
    // const bodyCount = this.bodies.filter((b) => b.radius !== 0).length - 1
    // this.missiles = this.missiles.slice(0, bodyCount)
    // this.missiles = this.missiles.slice(-bodyCount)

    // NOTE: this is stupid
    this.missiles.push(b)
    this.missiles = this.missiles.slice(-1)

    this.sound?.playMissile()
    this.missileInits.push(...this.processMissileInits([b]))
  }

  calculateStats = () => {
    // n.b. this needs to match the contract in check_boost.cjs
    const BODY_BOOST = [
      0, // 0th body, just for easier indexing
      0, // 1st body
      0, // 2nd body
      1, // 3rd body
      2, // 4th body
      4, // 5th body
      8, // 6th body
      16, // 7th body
      32, // 8th body
      64, //9th body
      128 // 10th body
    ]

    const SPEED_BOOST = [
      1, // <10s left
      2, // <20s left
      3, // <30s left
      4, // <40s left
      5, // <50s left
      6 // < 60s left
    ]

    const bodiesIncluded = this.bodies.length
    const bodiesBoost = BODY_BOOST[bodiesIncluded]
    const { startingFrame, timer, frames } = this
    const secondsLeft = (startingFrame + timer - frames) / this.FPS
    const framesTook = frames - startingFrame
    const timeTook = framesTook / this.FPS
    const speedBoostIndex = Math.floor(secondsLeft / 10)
    const speedBoost = SPEED_BOOST[speedBoostIndex]
    let dust = /*bodiesIncluded **/ bodiesBoost * speedBoost

    const missilesShot = this.missileInits.reduce(
      (p, c) => (c[0] == 0 ? p : p + 1),
      0
    )

    return {
      missilesShot,
      bodiesIncluded,
      bodiesBoost,
      speedBoost,
      dust,
      timeTook,
      framesTook
    }
  }
}

if (typeof window !== 'undefined') {
  window.Anybody = Anybody
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
