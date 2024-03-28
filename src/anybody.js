import Prando from 'prando'

import EventEmitter from 'events'
import Sound from './sound.js'
import { Visuals } from './visuals.js'
import { _validateSeed, Calculations } from './calculations.js'
import { stepLife, stepWithering } from './life.js'

export class Anybody extends EventEmitter {
  constructor(p, options = {}) {
    super()

    Object.assign(this, Visuals)
    Object.assign(this, Calculations)

    const defaultOptions = {
      inputData: null,
      bodyData: null,
      // Add default properties and their initial values here
      startingBodies: 3,
      seed: null,
      windowWidth: 1000,
      windowHeight: 1000,
      vectorLimit: 10,
      scalingFactor: 10n ** 3n,
      minDistanceSquared: 200 * 200,
      G: 100, // Gravitational constant
      mode: 'nft', // game or nft
      admin: false,
      clearBG: true,
      colorStyle: '!squiggle', // squiggle or !squiggle
      preRun: 0,
      alreadyRun: 0,
      paintSteps: 0,
      chunk: 1,
      mute: true,
      freeze: false,
      stopEvery: 0,
      util: false,
      optimistic: false,
      paused: true
    }

    // Merge the default options with the provided options
    const mergedOptions = { ...defaultOptions, ...options }

    // Assign the merged options to the instance properties
    this.inputData = mergedOptions.inputData
    this.bodyData = mergedOptions.bodyData
    this.startingBodies = mergedOptions.startingBodies
    this.seed = mergedOptions.seed
    this.windowWidth = mergedOptions.windowWidth
    this.windowHeight = mergedOptions.windowHeight
    this.vectorLimit = mergedOptions.vectorLimit
    this.scalingFactor = mergedOptions.scalingFactor
    this.G = mergedOptions.G
    this.minDistanceSquared = mergedOptions.minDistanceSquared
    this.mode = mergedOptions.mode
    this.admin = mergedOptions.admin
    this.clearBG = mergedOptions.clearBG
    this.colorStyle = mergedOptions.colorStyle
    this.alreadyRun = mergedOptions.alreadyRun
    this.preRun = mergedOptions.preRun
    this.paintSteps = mergedOptions.paintSteps
    this.chunk = mergedOptions.chunk
    this.mute = mergedOptions.mute
    this.freeze = mergedOptions.freeze
    this.stopEvery = mergedOptions.stopEvery
    this.util = mergedOptions.util
    this.optimistic = mergedOptions.optimistic
    this.paused = mergedOptions.paused

    // Add other constructor logic here
    this.p = p
    // this.p.blendMode(this.p.DIFFERENCE)

    !this.util && this.prepareP5()
    this.clearValues()
    this.sound = new Sound(this)
    this.init()
    !this.util && this.start()
  }

  // run whenever the class should be reset
  clearValues() {
    this.opac = 0.1
    this.tailLength = 30
    this.tailMod = 1
    this.thisLevelMissileCount = 0
    this.thisLevelSec = 0
    this.totalSec = 0
    this.allLevelSec = []
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
    this.showIt = true
    this.justStopped = false
    this.bgColor = null
    this.loadTime = Date.now()
  }

  // run once at initilization
  init() {
    if (this.seed == undefined) {
      this.seed = BigInt(Math.floor(Math.random() * 10000))
    }
    _validateSeed(this.seed)
    this.rng = new Prando(this.seed.toString(16))
    this.generateBodies()
    this.frames = this.alreadyRun
    // const vectorLimitScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    this.setPause(this.paused)
  }

  start() {
    this.addListener()
    this.startTick()
    this.runSteps(this.preRun)
    // this.paintAtOnce(this.paintSteps)
    if (this.freeze) {
      this.setPause(true)
    }
    this.storeInits()
  }

  storeInits() {
    // console.log('storeInits')
    // console.dir(
    //   {
    //     frames: this.frames,
    //     bodies: this.bodies.map((b) => (b.position.x, b.position.y))
    //   },
    //   { depth: null }
    // )
    this.bodyInits = this.processInits(this.bodies)
    // console.dir({ bodyInits: this.bodyInits }, { depth: null })
  }

  processInits(bodies) {
    return this.convertBodiesToBigInts(bodies).map((b) => {
      // console.log({ b1: b })
      b = this.convertScaledBigIntBodyToArray(b)
      // console.log({ b2: b })
      b[2] = BigInt(b[2]).toString()
      b[3] = BigInt(b[3]).toString()
      // console.log({ vy_b: b[3] })
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

  startTick() {
    if (this.mode == 'game') {
      this.tickInterval && clearInterval(this.tickInterval)
      this.tickInterval = setInterval(this.tick.bind(this), 1000)
    }
  }

  tick() {
    this.thisLevelSec++
    this.totalSec++
  }

  addListener() {
    // const body = document.getElementsByClassName('p5Canvas')[0]
    const canvas = document.querySelector('canvas')
    // const canvas = document.getElementById('defaultCanvas0')

    this.p.touchStarted = () => {
      // this.setPause()
      // return false
    }
    this.p.touchMoved = () => {}
    this.p.touchEnded = () => {}

    if (typeof window !== 'undefined' && this.mode == 'game') {
      canvas.removeEventListener('click', this.setPause)
      canvas.removeEventListener('click', this.missileClick)
      canvas.addEventListener('click', this.missileClick.bind(this))
      window.addEventListener('keydown', (e) => {
        // spacebar
        if (e.code == 'Space') {
          e.preventDefault()
          this.setPause()
        }
      })
    } else {
      canvas.removeEventListener('click', this.missileClick)
      canvas.removeEventListener('click', this.setPause)
      canvas.addEventListener('click', this.setPause.bind(this))
    }
  }

  setPause(newPauseState = !this.paused) {
    if (typeof newPauseState !== 'boolean') {
      newPauseState = !this.paused
    }
    this.paused = newPauseState
    this.justPaused = true
    this.emit('paused', this.paused)
    if (newPauseState) {
      this.p?.noLoop()
      this.sound?.pause()
    } else {
      this.p?.loop()
      this.sound?.resume()
    }
  }

  step() {
    const { live, withering } = stepLife(this.bodies, this.witheringBodies)
    this.witheringBodies ||= []
    this.witheringBodies.push(...withering)
    this.witheringBodies = stepWithering(this.witheringBodies)
    this.bodies = live

    this.bodies = this.forceAccumulator(this.bodies)
    var results = this.detectCollision(this.bodies, this.missiles)
    this.bodies = results.bodies
    this.missiles = results.missiles || []

    if (this.missiles.length > 0 && this.missiles[0].radius == 0) {
      this.missiles.splice(0, 1)
    }

    if (
      this.mode == 'game' &&
      this.bodies.reduce((a, c) => a + c.radius, 0) == 0
    ) {
      this.nextLevel()
      // if (!this.finished) {
      //   this.finish()
      // }
      // this.setPause(true)
    }
    return { bodies: this.bodies, missiles: this.missiles }
  }

  nextLevel() {
    const level = {
      thisLevelMissileCount: this.thisLevelMissileCount,
      thisLevelSec: this.thisLevelSec
    }
    this.allLevelSec.unshift(level)
    this.thisLevelSec = 0
    this.thisLevelMissileCount = 0
    this.startingBodies += 1
    this.missiles = []
    this.bodies = []
    this.witheringBodies = []
    this.generateBodies()
  }

  started() {
    this.emit('started', {
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
    // this.finished = true
    // this.setPause(true)
    this.calculateBodyFinal()
    if (!this.optimistic) {
      const missileInits = []
      if (this.mode == 'game') {
        let missileIndex = 0
        for (
          let i = this.alreadyRun;
          i < this.alreadyRun + this.stopEvery;
          i++
        ) {
          if (this.missileInits[missileIndex]?.step == i) {
            const missile = this.missileInits[missileIndex]
            missileInits.push([
              missile.x,
              missile.y,
              missile.vx,
              missile.vy,
              missile.radius
            ])
            missileIndex++
          } else {
            missileInits.push([0, 0, 0, 0, 0])
          }
        }
        missileInits.push([0, 0, 0, 0, 0])
      }
      this.emit('finished', {
        missiles: JSON.parse(JSON.stringify(missileInits)),
        bodyInits: JSON.parse(JSON.stringify(this.bodyInits)),
        bodyFinal: JSON.parse(JSON.stringify(this.bodyFinal))
      })
    }
    this.bodyInits = JSON.parse(JSON.stringify(this.bodyFinal))
    this.alreadyRun = this.frames
    this.missileInits = this.processMissileInits(this.missiles).map((m) => {
      m.step = this.frames
      return m
    })
    this.bodyFinal = []
    // this.setPause(false)
  }

  generateBodies() {
    if (this.inputData) {
      // console.dir({ inputData: this.inputData }, { depth: null })
      const step1 = this.inputData.map(
        this.convertScaledStringArrayToBody.bind(this)
      )
      // console.dir({ step1 }, { depth: null })
      this.bodies = this.convertBigIntsToBodies(step1)
      // console.dir({ bodies: this.bodies })
      this.bgColor = this.colorArrayToTxt([0, 0, 0]) //this.randomColor(0, 20))
      this.radiusMultiplyer = this.random(10, 200)
      for (let i = 0; i < this.startingBodies; i++) {
        this.bodies[i].c =
          `hsla(${this.random(0, 360)}, 100%, 100%, ${this.opac})`
        // this.bodies[i].c = this.colorArrayToTxt(this.randomColor(200, 250)
        this.bodies[i].bodyIndex = i
      }
      return
    }
    if (this.bodyData) {
      this.bgColor = this.colorArrayToTxt(this.randomColor(0, 200))
      this.radiusMultiplyer = 100 //this.random(10, 200)
      this.bodies = this.bodyData.map((b) => {
        const seed = b.seed
        const bodyRNG = new Prando(seed.toString(16))
        const px = b.px.toNumber() / parseInt(this.scalingFactor)
        const py = b.py.toNumber() / parseInt(this.scalingFactor)
        const vx =
          (b.vx.toNumber() - this.vectorLimit * parseInt(this.scalingFactor)) /
          parseInt(this.scalingFactor)
        const vy =
          (b.vy.toNumber() - this.vectorLimit * parseInt(this.scalingFactor)) /
          parseInt(this.scalingFactor)
        const radius = b.radius.toNumber() / parseInt(this.scalingFactor)
        return {
          index: b.bodyIndex,
          position: this.createVector(px, py),
          velocity: this.createVector(vx, vy),
          radius: radius,
          life: b.life.toNumber(),
          mintedBodyIndex: b.mintedBodyIndex.toNumber(),
          c: this.colorArrayToTxt(this.randomColor(0, 200, bodyRNG))
        }
      })
      this.startingBodies = this.bodies.length
      return
    }
    const ss = []
    const cs = []
    const bodies = []

    this.radiusMultiplyer = 100 //this.random(10, 50)

    const startingRadius = 2 //this.random(20, 40)

    // const baseColor = this.randomColor(0, 200)

    // const range = 100
    // const midRange = range / 2
    // const start = 0 - midRange
    // const totalChunks = this.startingBodies
    // const chunk = range / totalChunks

    this.bgColor = this.colorArrayToTxt(this.randomColor(0, 100))

    for (let i = 0; i < this.startingBodies; i++) {
      // cs.push(`hsla(${this.random(0, 360)}, 100%, 50%, ${this.opac})`)

      cs.push(this.colorArrayToTxt(this.randomColor(50, 250)))
    }

    for (let i = 0; i < this.startingBodies; i++) {
      let s = this.randomPosition()
      ss.push(s)
    }
    if (this.startingBodies.length > 10) {
      throw new Error('too many bodies')
    }
    let maxSize = this.startingBodies < 10 ? 10 : this.startingBodies
    for (let i = 0; i < maxSize; i++) {
      if (i >= this.startingBodies) break

      // const j = i
      // const j = this.random(0, 2)
      const j = Math.floor(this.random(1, 3))
      const radius = j * 5 + startingRadius
      const body = {
        bodyIndex: i,
        position: this.createVector(ss[i][0], ss[i][1]),
        velocity: this.createVector(0, 0),
        radius,
        c: cs[i]
      }
      bodies.push(body)
    }

    this.bodies = bodies
    // .sort((a, b) => b.radius - a.radius)
  }

  random(min, max, rng = this.rng) {
    return rng.nextInt(min, max)
    // return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }

  randomColor(min = 0, max = 255, rng = this.rng) {
    const color = []
    // let c = Math.floor(this.random(min, max, rng))
    for (let i = 0; i < 3; i++) {
      let c = this.random(min, max, rng)
      color.push(c)
    }
    return color
  }
  randomPosition() {
    const radiusDist = this.random(
      _smolr(this.windowWidth, this.windowHeight) * 0.37,
      _smolr(this.windowWidth, this.windowHeight) * 0.47
    )
    const randomDir = this.random(0, 360)
    const x = radiusDist * Math.cos(randomDir) + this.windowWidth / 2
    const y = radiusDist * Math.sin(randomDir) + this.windowWidth / 2
    return [x, y]
  }

  prepareP5() {
    this.p.frameRate(50)
    this.p.createCanvas(this.windowWidth, this.windowWidth)
    this.p.background('white')
  }

  missileClick(e) {
    if (this.paused) {
      this.setPause(false)
      return
    }
    if (this.missiles.length > 0 && !this.admin) {
      // this is a hack to prevent multiple missiles from being fired
      this.missiles = []
      // remove latest missile from missileInits
      this.missileInits.pop()
    }
    const canvas = document.querySelector('canvas')
    this.thisLevelMissileCount++
    this.missileCount++
    const actualWidth = canvas.offsetWidth
    const x = (e.offsetX * this.windowWidth) / actualWidth
    const y = (e.offsetY * this.windowWidth) / actualWidth
    const radius = 10

    const b = {
      step: this.frames,
      position: this.p.createVector(0, this.windowWidth),
      velocity: this.p.createVector(x, y - this.windowWidth),
      radius
    }
    b.velocity.limit(10)
    this.missiles.push(b)
    this.sound?.playMissile()
    this.missileInits.push(...this.processMissileInits([b]))
  }
}
if (typeof window !== 'undefined') {
  window.Anybody = Anybody
}

function _smolr(a, b) {
  return a < b ? a : b
}
