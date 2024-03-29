pragma circom 2.1.6;

include "forceAccumulator.circom";

template NFT(totalBodies, steps) {
  signal input bodies[totalBodies][5];
  signal output out_bodies[totalBodies][5];
  
  component forceAccumulator[steps];
  var tmp_bodies[totalBodies][5] = bodies; // TODO: check savings if radius is removed from signal
  for (var i = 0; i < steps; i++) {
    // log("i-------------", i);
    // for (var j = 0; j < 3; j++) {
    //   for (var k = 0; k < 5; k++) {
    //     log("tmp_bodes", j, k, tmp_bodies[j][k]);
    //   }
    // }
    forceAccumulator[i] = ForceAccumulator(totalBodies);
    forceAccumulator[i].bodies <== tmp_bodies;
    tmp_bodies = forceAccumulator[i].out_bodies;
  }
  out_bodies <== tmp_bodies;
}

