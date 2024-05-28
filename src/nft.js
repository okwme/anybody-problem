import Q5 from './q5.min.js'
import { Anybody } from './anybody.js'

const q5 = new Q5()
const seed = window.location.hash.slice(1)

window.anybody
q5.setup = () => {
  window.anybody = new Anybody(q5, {
    mode: 'game',
    // showLevels: true,
    // target: 'inside',
    // globalStyle: 'psycho',
    alreadyRun: 0, //Math.floor(Math.random() * 20000),
    seed: seed || null,
    startingBodies: 2 //Math.floor(Math.random() * 8) + 2
  })
}
q5.draw = () => {
  window.anybody.draw()
}
