// import hre from 'hardhat'
import { wasm as wasm_tester } from 'circom_tester'
import { Anybody } from '../src/anybody.js'
// const p = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

describe('stepStateTest circuit', () => {
  let circuit

  // const missiles = new Array(totalSteps + 1)
  //   .fill(0)
  //   .map(() => new Array(5).fill('0'))
  // missiles[0] = ['226000', '42000', '10000', '10000', '100000']
  // const sampleInput = {
  //   bodies: [
  //     ['226000', '42000', '8670', '3710', '100000'],
  //     ['363000', '658000', '6680', '13740', '75000'],
  //     ['679000', '500000', '12290', '12520', '50000']
  //   ],

  //   // NOTE: need to have array of 2 when step = 1 because missiles need to be n + 1
  //   missiles
  // }

  const sampleInput = {
    bodies: [
      ['537474', '355417', '11468', '12141', '7000'],
      ['424961', '269660', '5413', '10766', '7000'],
      ['564152', '175881', '13119', '7093', '12000']
    ],
    missiles: [
      ['344692', '345174', '14658', '1151', '10'],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ]
  }
  const sanityCheck = true
  const steps = sampleInput.missiles.length - 1

  before(async () => {
    circuit = await wasm_tester(`circuits/game_3_${steps}.circom`)
  })

  it('produces a witness with valid constraints', async () => {
    const witness = await circuit.calculateWitness(sampleInput, sanityCheck)
    // const inputs =
    //   sampleInput.bodies.length * sampleInput.bodies[0].length +
    //   sampleInput.missiles.length * sampleInput.missiles[0].length
    // const perStep = witness.length - inputs
    // const secRounded = calculateTime(perStep, steps)
    // console.log(`| stepState(3, ${steps}) | ${perStep} | ${secRounded} |`)
    await circuit.checkConstraints(witness)
  })

  it('has the correct output', async () => {
    const anybody = new Anybody(null, { util: true })
    let bodies = sampleInput.bodies.map(
      anybody.convertScaledStringArrayToBody.bind(anybody)
    )
    let missiles = sampleInput.missiles.map(
      anybody.convertScaledStringArrayToBody.bind(anybody)
    )
    // console.dir({ bodies }, { depth: null })
    // console.dir({ missiles }, { depth: null })
    for (let i = 0; i < steps; i++) {
      bodies = anybody.forceAccumulatorBigInts(bodies)
      const { bodies: newBigBodies, missiles: newBigMissiles } =
        anybody.detectCollisionBigInt(bodies, missiles)
      bodies = newBigBodies
      missiles = newBigMissiles
    }
    const out_bodies = bodies.map(
      anybody.convertScaledBigIntBodyToArray.bind(anybody)
    )
    const expected = { out_bodies }
    const witness = await circuit.calculateWitness(sampleInput, sanityCheck)
    await circuit.assertOut(witness, expected)
  })
})
