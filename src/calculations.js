// these still use this:
// scalingFactor, vectorLimit, windowWidth, G, minDistanceSquared, bodies, bodyFinal, explosions, missiles

export const Calculations = {
  forceAccumulator(bodies = this.bodies) {
    bodies = this.convertBodiesToBigInts(bodies)
    bodies = this.forceAccumulatorBigInts(bodies)
    bodies = this.convertBigIntsToBodies(bodies)
    return bodies
  },

  forceAccumulatorBigInts(bodies) {
    const vectorLimitScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    let accumulativeForces = []
    for (let i = 0; i < bodies.length; i++) {
      accumulativeForces.push([0n, 0n])
    }
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]
      for (let j = i + 1; j < bodies.length; j++) {
        const otherBody = bodies[j]
        const force = this.calculateForceBigInt(body, otherBody)
        accumulativeForces[i] = _addVectors(accumulativeForces[i], force)
        accumulativeForces[j] = _addVectors(accumulativeForces[j], [
          -force[0],
          -force[1]
        ])
      }
    }
    // console.log({ vectorLimitScaled })
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]
      const body_velocity = _addVectors(
        [body.velocity.x, body.velocity.y],
        accumulativeForces[i]
      ) //.mult(friction);
      // console.log('body.velocity.x', body.velocity.x)
      // console.log('accumulativeForces[i][0]', accumulativeForces[i][0])
      // console.log('body_velocity[0]', body_velocity[0])
      body.velocity.x = body_velocity[0]
      body.velocity.y = body_velocity[1]
      const body_velocity_x_abs =
        body.velocity.x > 0n ? body.velocity.x : -1n * body.velocity.x
      if (body_velocity_x_abs > vectorLimitScaled) {
        body.velocity.x =
          (body_velocity_x_abs / body.velocity.x) * vectorLimitScaled
      }
      const body_velocity_y_abs =
        body.velocity.y > 0n ? body.velocity.y : -1n * body.velocity.y
      if (body_velocity_y_abs > vectorLimitScaled) {
        body.velocity.y =
          (body_velocity_y_abs / body.velocity.y) * vectorLimitScaled
      }
      // body.velocity.limit(speedLimit);
      const body_position = _addVectors(
        [body.position.x, body.position.y],
        [body.velocity.x, body.velocity.y]
      )
      // console.log('unlimited new position of x = ', body.position.x)
      // console.log('body.position.x', body.position.x)
      // console.log('body.velocity.x', body.velocity.x)
      // console.log('body_position[0]', body_position[0])
      body.position.x = body_position[0]
      body.position.y = body_position[1]
    }

    // console.log('before limiter')
    // console.dir({ bodies_0: convertScaledBigIntBodyToArray(bodies[0]) }, { depth: null })

    // const xOffset = bodies[bodies.length - 1].position.x
    // const yOffset = bodies[bodies.length - 1].position.y
    const scaledWindowWidth = this.convertFloatToScaledBigInt(this.windowWidth)
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]
      // if (position == "static") {
      //   body.position = [body.position.x - xOffset + scaledWindowWidth / 2, body.position.y - yOffset + scaledWindowWidth / 2]
      // }
      if (body.position.x > scaledWindowWidth) {
        body.position.x = 0n
      } else if (body.position.x < 0n) {
        body.position.x = scaledWindowWidth
      }
      if (body.position.y > scaledWindowWidth) {
        body.position.y = 0n
      } else if (body.position.y < 0n) {
        body.position.y = scaledWindowWidth
      }
    }
    return bodies
  },

  calculateBodyFinal() {
    // const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    // console.log(this.bodies.map((b) => b.bodyIndex.toString()))
    this.bodies.sort((a, b) => a.bodyIndex - b.bodyIndex)
    // console.log(this.bodies.map((b) => b.bodyIndex.toString()))
    const bodiesAsBigInts = this.convertBodiesToBigInts(this.bodies)
    this.bodyFinal = bodiesAsBigInts.map((b) => {
      b = this.convertScaledBigIntBodyToArray(b)
      b[2] = BigInt(b[2]).toString()
      b[3] = BigInt(b[3]).toString()
      return b
    })
  },

  // Calculate the gravitational force between two bodies
  calculateForceBigInt(body1, body2) {
    // console.log({ p })
    const GScaled = BigInt(Math.floor(this.G * parseInt(this.scalingFactor)))
    // console.log({ GScaled })

    let minDistanceScaled =
      BigInt(this.minDistanceSquared) * this.scalingFactor ** 2n // when the original gets squared, the scaling factor gets squared
    // console.log({ minDistanceScaled })

    const position1 = body1.position

    const body1_position_x = position1.x
    // console.log({ body1_position_x })
    const body1_position_y = position1.y
    // console.log({ body1_position_y })
    const body1_radius = body1.radius

    const position2 = body2.position
    const body2_position_x = position2.x
    // console.log({ body2_position_x })
    const body2_position_y = position2.y
    // console.log({ body2_position_y })
    const body2_radius = body2.radius

    let dx = body2_position_x - body1_position_x
    let dy = body2_position_y - body1_position_y
    const dxAbs = dx > 0n ? dx : -1n * dx
    const dyAbs = dy > 0n ? dy : -1n * dy

    // console.log({ dx, dy })
    // console.log({ dxAbs, dyAbs })

    const dxs = dx * dx
    const dys = dy * dy
    // console.log({ dxs, dys })

    let distanceSquared
    const unboundDistanceSquared = dxs + dys
    // console.log({ unboundDistanceSquared })
    if (unboundDistanceSquared < minDistanceScaled) {
      distanceSquared = minDistanceScaled
    } else {
      distanceSquared = unboundDistanceSquared
    }
    let distance = _approxSqrt(distanceSquared)
    // console.log({ distance })
    // console.log({ distanceSquared })

    const bodies_sum =
      body1_radius == 0n || body2_radius == 0n
        ? 0n
        : (body1_radius + body2_radius) * 4n // NOTE: this could be tweaked as a variable for "liveliness" of bodies
    // console.log({ bodies_sum })

    const distanceSquared_with_avg_denom = distanceSquared * 2n // NOTE: this is a result of moving division to the end of the calculation
    // console.log({ distanceSquared_with_avg_denom })
    const forceMag_numerator = GScaled * bodies_sum * this.scalingFactor // distancec should be divided by scaling factor but this preserves rounding with integer error
    // console.log({ forceMag_numerator })

    const forceDenom = distanceSquared_with_avg_denom * distance
    // console.log({ forceDenom })

    const forceXnum = dxAbs * forceMag_numerator
    // console.log({ forceXnum })
    const forceXunsigned = _approxDiv(forceXnum, forceDenom)
    // console.log({ forceXunsigned })
    const forceX = dx < 0n ? -forceXunsigned : forceXunsigned
    // console.log({ forceX })

    const forceYnum = dyAbs * forceMag_numerator
    // console.log({ forceYnum })
    const forceYunsigned = _approxDiv(forceYnum, forceDenom)
    // console.log({ forceYunsigned })
    const forceY = dy < 0n ? -forceYunsigned : forceYunsigned
    // console.log({ forceY })
    return [forceX, forceY]
  },

  convertScaledStringArrayToBody(body) {
    const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    return {
      position: {
        x: BigInt(body[0]),
        y: BigInt(body[1])
      },
      velocity: {
        x: BigInt(body[2]) - maxVectorScaled,
        y: BigInt(body[3]) - maxVectorScaled
      },
      radius: BigInt(body[4])
    }
  },

  convertScaledBigIntBodyToArray(b) {
    const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    const bodyArray = []
    const noNegativeVelocityX = b.velocity.x + maxVectorScaled
    const noNegativeVelocityY = b.velocity.y + maxVectorScaled
    bodyArray.push(
      _convertBigIntToModP(b.position.x),
      _convertBigIntToModP(b.position.y),
      _convertBigIntToModP(noNegativeVelocityX),
      _convertBigIntToModP(noNegativeVelocityY),
      _convertBigIntToModP(b.radius)
    )
    return bodyArray.map((b) => b.toString())
  },

  convertScaledStringArrayToFloat(body) {
    const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    return {
      position: {
        x: this.convertScaledBigIntToFloat(body[0]),
        y: this.convertScaledBigIntToFloat(body[1])
      },
      velocity: {
        x: this.convertScaledBigIntToFloat(body[2]) - maxVectorScaled,
        y: this.convertScaledBigIntToFloat(body[3]) - maxVectorScaled
      },
      radius: this.convertScaledBigIntToFloat(body[4])
    }
  },
  convertBigIntsToBodies(bigBodies) {
    const bodies = []
    for (let i = 0; i < bigBodies.length; i++) {
      const body = bigBodies[i]
      const newBody = { bodyIndex: i, position: {}, velocity: {}, radius: null }
      newBody.px = body.position.x
      newBody.position.x = this.convertScaledBigIntToFloat(body.position.x)
      newBody.py = body.position.y
      newBody.position.y = this.convertScaledBigIntToFloat(body.position.y)
      newBody.position = this.createVector(
        newBody.position.x,
        newBody.position.y
      )

      newBody.vx = body.velocity.x
      newBody.velocity.x = this.convertScaledBigIntToFloat(body.velocity.x)
      newBody.vy = body.velocity.y
      newBody.velocity.y = this.convertScaledBigIntToFloat(body.velocity.y)
      newBody.velocity = this.createVector(
        newBody.velocity.x,
        newBody.velocity.y
      )

      if (!this.accumX) {
        this.accumX = 0
        this.accumY = 0
      }
      this.accumX += newBody.velocity.x
      this.accumY += newBody.velocity.y
      newBody.radius = this.convertScaledBigIntToFloat(body.radius)
      if (body.c) {
        newBody.c = body.c
      }
      newBody.mintedBodyIndex = body.mintedBodyIndex
      newBody.life = body.life
      bodies.push(newBody)
    }
    return bodies
  },

  convertFloatToScaledBigInt(value) {
    // changed from Math.floor to Math.round, TODO: look here in case there's rounding error
    return BigInt(Math.round(value * parseInt(this.scalingFactor)))
    // let maybeNegative = BigInt(Math.floor(value * parseInt(scalingFactor))) % p
    // while (maybeNegative < 0n) {
    //   maybeNegative += p
    // }
    // return maybeNegative
  },
  convertScaledBigIntToFloat(value) {
    return parseFloat(value) / parseFloat(this.scalingFactor)
  },

  convertBodiesToBigInts(bodies) {
    const bigBodies = []
    // const maxVectorScaled = this.convertFloatToScaledBigInt(this.vectorLimit)
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]
      const newBody = { position: {}, velocity: {}, radius: null }

      newBody.position.x =
        body.px || this.convertFloatToScaledBigInt(body.position.x)
      newBody.position.y =
        body.py || this.convertFloatToScaledBigInt(body.position.y)
      newBody.velocity.x =
        body.vx || this.convertFloatToScaledBigInt(body.velocity.x)
      newBody.velocity.y =
        body.vy || this.convertFloatToScaledBigInt(body.velocity.y)
      newBody.radius = this.convertFloatToScaledBigInt(body.radius)
      newBody.life = body.life
      newBody.mintedBodyIndex = body.mintedBodyIndex
      newBody.c = body.c
      newBody.bodyIndex = body.bodyIndex

      bigBodies.push(newBody)
    }
    return bigBodies
  },

  detectCollision(bodies = this.bodies, missiles = this.missiles) {
    let bigBodies = this.convertBodiesToBigInts(bodies)
    const bigMissiles = this.convertBodiesToBigInts(missiles)
    const { bodies: newBigBodies, missiles: newBigMissiles } =
      this.detectCollisionBigInt(bigBodies, bigMissiles)
    bodies = this.convertBigIntsToBodies(newBigBodies)
    missiles = this.convertBigIntsToBodies(newBigMissiles)
    return { bodies, missiles }
  },

  detectCollisionBigInt(bodies, missiles) {
    if (missiles.length == 0) {
      return { bodies, missiles }
    }
    const missile = missiles[0]
    missile.position.x += missile.velocity.x
    missile.position.y += missile.velocity.y

    if (
      missile.position.x > BigInt(this.windowWidth) * this.scalingFactor ||
      missile.position.y < 0n
    ) {
      missile.radius = 0n
    }

    for (let j = 0; j < bodies.length; j++) {
      const body = bodies[j]
      const distance = _approxDist(
        missile.position.x,
        missile.position.y,
        body.position.x,
        body.position.y
      )
      // NOTE: this is to match the circuit. If the missile is gone, set minDist to 0
      // Need to make sure comparison of distance is < and not <= for this to work
      // because they may by chance be at the exact same coordinates and should still
      // not trigger an _explosion since the missile is already gone.
      const minDist = missile.radius == 0n ? 0n : body.radius * 2n
      if (distance < minDist) {
        missile.radius = 0n
        this.explosions.push(
          _explosion(
            this.convertScaledBigIntToFloat(body.position.x),
            this.convertScaledBigIntToFloat(body.position.y),
            this.convertScaledBigIntToFloat(body.radius)
          )
        )
        this.sound?.playExplosion()
        bodies[j].radius = 0n
      }
    }
    missiles[0] = missile
    return { bodies, missiles }
  }
}

// ------
/// functional utils
// ------

function _convertBigIntToModP(v) {
  const prime =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n
  let vmp = v % prime
  while (vmp < 0n) {
    vmp += prime
  }
  return vmp
}
function _approxDist(x1, y1, x2, y2) {
  const absX = x1 > x2 ? x1 - x2 : x2 - x1
  const absY = y1 > y2 ? y1 - y2 : y2 - y1
  const dxs = absX * absX
  const dys = absY * absY
  const distanceSquared = dxs + dys
  const distance = _approxSqrt(distanceSquared)
  return distance
}
function _approxSqrt(n) {
  // console.log({ n })
  if (n == 0n) {
    return 0n
  }
  var lo = 0n
  var hi = n >> 1n
  var mid, midSquared
  // console.log({ lo, hi })
  while (lo <= hi) {
    mid = (lo + hi) >> 1n // multiplication by multiplicative inverse is not what we want so we use >>
    // console.log({ lo, mid, hi })
    // TODO: Make more accurate by checking if lo + hi is odd or even before bit shifting
    midSquared = mid * mid
    if (midSquared == n) {
      // console.log(`final perfect`, { lo, mid, hi })
      return mid // Exact square root found
    } else if (midSquared < n) {
      lo = mid + 1n // Adjust lower bound
    } else {
      hi = mid - 1n // Adjust upper bound
    }
  }
  // If we reach here, no exact square root was found.
  // return the closest approximation
  // console.log(`final approx`, { lo, mid, hi })
  return mid
}
function _approxDiv(dividend, divisor) {
  if (dividend == 0n) {
    return 0n
  }
  // Create internal signals for our binary search
  var lo, hi, mid, testProduct

  // Initialize our search space
  lo = 0n
  hi = dividend // Assuming worst case where divisor = 1

  while (lo < hi) {
    // 32 iterations for 32-bit numbers as an example
    mid = (hi + lo + 1n) >> 1n
    testProduct = mid * divisor

    // Adjust our bounds based on the test product
    if (testProduct > dividend) {
      hi = mid - 1n
    } else {
      lo = mid
    }
  }
  // console.log({ lo, mid, hi })
  // Output the lo as our approximated quotient after iterations
  // quotient <== lo;
  return lo
}
function _calculateTime(constraints, steps = 1) {
  const totalSteps = (steps * 1_000_000) / constraints
  const fps = 25
  const sec = totalSteps / fps
  return Math.round(sec * 100) / 100
}

function _explosion(x, y, radius) {
  let bombs = []
  for (let i = 0; i < 100; i++) {
    bombs.push({
      x,
      y,
      i,
      radius
    })
  }
  return bombs
}

function _addVectors(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1]]
}

function _validateSeed(seed) {
  const error = 'Seed must be a 32-byte value'
  // ensure that the seed is a 32-byte value
  if (typeof seed === 'string') {
    if (seed.length !== 66) {
      throw new Error(error + ' (1)')
    }
    // confirm that all characters are hex characters
    if (seed.substring(2, 66).match(/[^0-9A-Fa-f]/)) {
      throw new Error(error + ' (2)')
    }
    if (seed.substring(0, 2) !== '0x') {
      throw new Error(error + ' (3)')
    }
    seed = BigInt(seed)
  }
  if (typeof seed === 'bigint') {
    if (seed < 0n) {
      throw new Error(error + ' (4)')
    }
    if (
      seed > 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
    ) {
      // if (seed > 115792089237316195423570985008687907853269984665640564039457584007913129639935n) {
      throw new Error(error + ' (5)')
    }
  } else {
    throw new Error(error + ' (6)')
  }
}

// function checkCollision(body1, body2) {
//   const distance = dist(body1.position.x, body1.position.y, body2.position.x, body2.position.y);
//   const minDist = (body1.radius + body2.radius) / 4;

//   if (distance < minDist) {
//     // Calculate collision response
//     const angle = atan2(body2.position.y - body1.position.y, body2.position.x - body1.position.x);
//     const overlap = minDist - distance;

//     const totalMass = body1.radius ** 2 + body2.radius ** 2;
//     const overlapRatio1 = body2.radius / totalMass;
//     const overlapRatio2 = body1.radius / totalMass;

//     const deltaX = -cos(angle) * overlap;
//     const deltaY = -sin(angle) * overlap;

//     body1.position.x -= deltaX * overlapRatio1;
//     body1.position.y -= deltaY * overlapRatio1;
//     body2.position.x += deltaX * overlapRatio2;
//     body2.position.y += deltaY * overlapRatio2;

//     // Update velocities
//     const angle1 = atan2(body1.velocity.y, body1.velocity.x);
//     const angle2 = atan2(body2.velocity.y, body2.velocity.x);
//     const speed1 = body1.velocity.mag();
//     const speed2 = body2.velocity.mag();

//     const newVelX1 = cos(angle1) * speed2;
//     const newVelY1 = sin(angle1) * speed2;
//     const newVelX2 = cos(angle2) * speed1;
//     const newVelY2 = sin(angle2) * speed1;

//     body1.velocity.set(newVelX1, newVelY1);
//     body2.velocity.set(newVelX2, newVelY2);
//   }
// }

export {
  _convertBigIntToModP,
  _approxDist,
  _approxSqrt,
  _approxDiv,
  _calculateTime,
  _explosion,
  _addVectors,
  _validateSeed
}
