pragma circom 2.1.0;
// include "../node_modules/circomlib/circuits/mux1.circom";
include "approxSqrt.circom";
include "approxDiv.circom";
include "absoluteValueSubtraction.circom";

template CalculateForce() {
/* // JS VERSION
    const position1 = body1.position
    const position2 = body2.position
    let dx = position2.x - position1.x;
    let dy = position2.y - position1.y;
    let distanceSq = dx * dx + dy * dy; // split this over two lines
    let minDistanceSquared = minDistance * minDistance
    if (distanceSq < minDistanceSquared) {
        distanceSq = minDistanceSquared
    }
    let distance = sqrt(distanceSq);
    let forceMagnitude = (GScaled * (body1.radius + body2.radius) / 2) / distanceSq;
    let forceX = forceMagnitude * (dx / distance);
    let forceY = forceMagnitude * (dy / distance);
    return createVector(forceX, forceY); 
*/

  var scalingFactor = 10**8;
  var GScaled =  100 * scalingFactor; // TODO: these could be constrained, do they need to be?
  log("GScaled", GScaled);

  signal input in_bodies[2][5];
  signal output out_forces[2];

  // var minDistanceScaled // TODO: confirm whether this needs to be signal or var
  signal minDistanceScaled <== 200 * 200 * scalingFactor * scalingFactor; // NOTE: this is 200**2 so we have to square the scaling factor too
  log("minDistanceScaled", minDistanceScaled);
  var body1_position_x = in_bodies[0][0];
  log("body1_position_x", body1_position_x);
  var body1_position_y = in_bodies[0][1];
  log("body1_position_y", body1_position_y);
  var body1_radius = in_bodies[0][4];

  var body2_position_x = in_bodies[1][0];
  log("body2_position_x", body2_position_x);
  var body2_position_y = in_bodies[1][1];
  log("body2_position_y", body2_position_y);
  var body2_radius = in_bodies[1][4];

  signal dx <== body2_position_x - body1_position_x; // TODO: confirm this is the right way to do this

  component absoluteValueSubtraction = AbsoluteValueSubtraction(60); // TODO: test limit
  absoluteValueSubtraction.in[0] <== body1_position_x;
  absoluteValueSubtraction.in[1] <== body2_position_x;
  signal dxAbs <== absoluteValueSubtraction.result;

  signal dy <== body2_position_y - body1_position_y;
  component absoluteValueSubtraction2 = AbsoluteValueSubtraction(60); // TODO: test limit
  absoluteValueSubtraction2.in[0] <== body1_position_y;
  absoluteValueSubtraction2.in[1] <== body2_position_y;
  signal dyAbs <== absoluteValueSubtraction2.result;

  log("dx", dx);
  log("dy", dy);


  log("dxAbs", dxAbs);
  log("dyAbs", dyAbs);

  signal dxs <== dxAbs * dxAbs;
  log("dxs", dxs);
  signal dys <== dyAbs * dyAbs;
  log("dys", dys);
  signal unboundDistanceSquared <== dxs + dys;
  log("unboundDistanceSquared", unboundDistanceSquared);

  component lessThan = LessThan(75); // NOTE: max distance should be corner to corner of max grid size
  // max grid is 1000_00000000 which means 1000_00000000 * sqrt(2) = 1414_21356237
  // 1414_21356237**2 is 19,999,999,999,912,458,800,169
  // 19,999,999,999,912,460,800,000 in bits is 76
  // max number using 75 bits is 2**75 - 1 = 75,557,863,725,914,323,419,135
  lessThan.in[0] <== unboundDistanceSquared;
  lessThan.in[1] <== minDistanceScaled;

  // TODO: confirm this is the correct way to do mux (input 0 is returned when s == 0 and input 1 is returned when s == 1)
  // distanceSquared <== is_below_minimum ? minDistanceScaled : unboundDistanceSquared;
  component myMux = Mux1();
  myMux.c[0] <== unboundDistanceSquared;
  myMux.c[1] <== minDistanceScaled;
  myMux.s <== lessThan.out;
  signal distanceSquared <== myMux.out;

  // NOTE: confirm this is correct
  signal distance <-- approxSqrt(distanceSquared); // TODO: confirm this warning is OK because of constraint on next line
  log("distance", distance);
  log("distanceSquared", distanceSquared);
  component acceptableErrorOfMargin = AcceptableErrorOfMargin();
  acceptableErrorOfMargin.squared <== distanceSquared;
  acceptableErrorOfMargin.calculatedRoot <== distance;
  acceptableErrorOfMargin.result === 1;


  signal bodies_sum <== body1_radius + body2_radius;
  // signal bodies_radius_avg <-- bodies_sum / 2; // TODO: confirm this warning is OK because of constraint on next line
  // bodies_sum === bodies_radius_avg * 2;

  log("bodies_sum", bodies_sum);

  signal distanceSquared_with_avg_denom <== distanceSquared * 2; // NOTE: this is a result of moving division to end of calculation to preserve precision
  log("distanceSquared_with_avg_denom", distanceSquared_with_avg_denom);
  signal forceMag_numerator <== GScaled * bodies_sum * scalingFactor; // NOTE: distance should be divided by scaling factor, but we can multiply GScaled by scaling factor instead to prevent division rounding errors
  log("forceMag_numerator", forceMag_numerator);

  // signal forceMag <-- forceMag_numerator / distanceSquared_with_avg_denom; // TODO: confirm this warning is OK because of constraint on next line
  // forceMag_numerator === forceMag * distanceSquared_with_avg_denom;
  
  // signal forceMag <-- approxDiv(forceMag_numerator, distanceSquared_with_avg_denom);
  // // TODO: constrain forceMag so that the error is within acceptable bounds

  // log("forceMag", forceMag);

  // signal dx_mul_force <== dx * forceMag;
  // signal dy_mul_force <== dy * forceMag;
  // log("dx_mul_force", dx_mul_force);
  // log("dy_mul_force", dy_mul_force);

  // // signal forceX <-- dx_mul_force / distance; // TODO: confirm this warning is OK because of constraint on next line
  // signal forceX <-- approxDiv(dx_mul_force, distance); // TODO: confirm this warning is OK because of constraint on next line
  // // dx_mul_force === forceX * distance;

  // signal forceY <-- approxDiv(dy_mul_force, distance); // TODO: confirm this warning is OK because of constraint on next line
  // // dy_mul_force === forceY * distance;

  signal forceDenom <== distanceSquared_with_avg_denom * distance;
  log("forceDenom", forceDenom);

  signal forceXnum <== dxAbs * forceMag_numerator;
  log("forceXnum", forceXnum);
  signal forceXunsigned <-- approxDiv(forceXnum, forceDenom);
  log("forceXunsigned", forceXunsigned);

  component isZero = IsZero();
  isZero.in <== dyAbs + dy;
  component myMux2 = Mux1();
  myMux2.c[0] <== forceXunsigned * -1;
  myMux2.c[1] <== forceXunsigned;
  myMux2.s <== isZero.out;
  signal forceX <== myMux2.out;
  log("forceX", forceX);


  signal forceYnum <== dyAbs * forceMag_numerator;
  log("forceYnum", forceYnum);
  signal forceYunsigned <-- approxDiv(forceYnum, forceDenom);
  log("forceYunsigned", forceYunsigned);

  component isZero2 = IsZero();
  isZero2.in <== dxAbs + dx;
  component myMux3 = Mux1();
  myMux3.c[0] <== forceYunsigned * -1;
  myMux3.c[1] <== forceYunsigned ;
  myMux3.s <== isZero2.out;
  signal forceY <== myMux3.out;
  log("forceY", forceY);

  out_forces[0] <== forceX; // TODO: confirm whether these arrows can/should be swapped
  out_forces[1] <== forceY;
}

component main { public [ in_bodies ]} = CalculateForce();

/* INPUT = {
    "in_bodies": [ ["82600000000", "4200000000", "-133000000", "-629000000", "10000000000"], ["36300000000", "65800000000", "-332000000", "374000000", "7500000000"] ]
} */