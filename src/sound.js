import * as Tone from 'tone'
const { Transport, Player, PanVol, Reverb, Compressor, Volume, Loop, start, loaded } = Tone

import whistle_8_T7 from 'data-url:../public/sound/whistle/whistle_8_T7.mp3'
import whistle_4_T3 from 'data-url:../public/sound/whistle/whistle_4_T3.mp3'
import whistle_7_T6 from 'data-url:../public/sound/whistle/whistle_7_T6.mp3'
import whistle_12_T11 from 'data-url:../public/sound/whistle/whistle_12_T11.mp3'
import whistle_8_T7_B from 'data-url:../public/sound/whistle/whistle_8_T7_B.mp3'

import wii_2_T1 from 'data-url:../public/sound/wii/wii_2_T1.mp3'
import wii_4_T3 from 'data-url:../public/sound/wii/wii_4_T3.mp3'
import wii_8_T7 from 'data-url:../public/sound/wii/wii_8_T7.mp3'
import wii_10_T9 from 'data-url:../public/sound/wii/wii_10_T9.mp3'
import wii_12_T11 from 'data-url:../public/sound/wii/wii_12_T11.mp3'
import wii_T5 from 'data-url:../public/sound/wii/wii_T5.mp3'
import wii_chord from 'data-url:../public/sound/wii/wii_chord.mp3'

import ipod_2_T1 from 'data-url:../public/sound/ipod/ipod_2_T1.mp3'
import ipod_5_T4 from 'data-url:../public/sound/ipod/ipod_5_T4.mp3'
import ipod_7_T6 from 'data-url:../public/sound/ipod/ipod_7_T6.mp3'
import ipod_8_T7 from 'data-url:../public/sound/ipod/ipod_8_T7.mp3'
import ipod_14_FX from 'data-url:../public/sound/ipod/ipod_14_FX.mp3'
import ipod_15_Delay_Reverb from 'data-url:../public/sound/ipod/ipod_15_Delay_Reverb.mp3'
import ipod_hiss from 'data-url:../public/sound/ipod/ipod_hiss.mp3'

import orbit_3_Audio from 'data-url:../public/sound/orbit/orbit_3-Audio.mp3'
import orbit_8_DT1 from 'data-url:../public/sound/orbit/orbit_8_DT1.mp3'
import orbit_9_DT2 from 'data-url:../public/sound/orbit/orbit_9_DT2.mp3'
import orbit_10_DT6 from 'data-url:../public/sound/orbit/orbit_10_DT6.mp3'

const SONGS = {
  whistle: {
    bpm: 70,
    parts: [[
      // each part consists of a set of tracks
      // type Track: [sample, probability, introProbability?]
      [whistle_8_T7, 1, 0],
      [whistle_4_T3, 0.9, 1],
      [whistle_7_T6, 0.7, 1],
      [whistle_12_T11, 0.7, 0],
    ], [
      [whistle_8_T7_B, 1, 0],
      [whistle_4_T3, 0.7, 1],
      [whistle_7_T6, 0.7, 1],
      [whistle_12_T11, 0.7, 0],
    ]],
  },
  wii: {
    bpm: 70,
    parts: [[
      [wii_2_T1, 1, 0],
      [wii_4_T3, 0.9, 1],
      [whistle_7_T6, 0.7, 0],
      [wii_12_T11, 0.7, 1],
      [wii_10_T9, 0.9, 1],
      [wii_T5, 0.2, 0],
    ], [
      [wii_2_T1, 1, 1],
      [wii_4_T3, 0.9, 1],
      [wii_8_T7, 1, 1],
      [whistle_7_T6, 0.7, 0],
      [wii_12_T11, 0.8, 0],
      [wii_10_T9, 0.7, 1],
      [wii_chord, 1, 1],
    ]],
  },
  ipod: {
    bpm: 113,
    interval: '4m',
    parts: [[
      [ipod_2_T1, 0.9, 0],
      [ipod_5_T4, 0.9, 1],
      [ipod_7_T6, 0.7, 1],
      [ipod_8_T7, 0.7, 0],
      [ipod_14_FX, 0.5, 0],
      [ipod_15_Delay_Reverb, 1, 0],
      [ipod_hiss, 0.5, 0],
    ]],
  },
  orbit: {
    bpm: 96,
    interval: '4m',
    parts: [[
      [orbit_3_Audio, 1, 1],
      [orbit_8_DT1, 0.6, 0],
      [orbit_9_DT2, 0.7, 0],
      [orbit_10_DT6, 0.7, 0],
    ]],
  },
}

const TRACK_VOLUME = -0.6 //db
const MAX_VOLUME = 0 //db
const INTRO_LENGTH = 1 // measures

export default class Sound {
  currentMeasure = 0

  constructor() {
    if (typeof window === 'undefined') return
    window.addEventListener('keydown', this.handleKeyDown)
  }

  handleKeyDown = (e) => {
    if (e.key === '1') {
      this.stop()
      this.play(SONGS.whistle)
    } else if (e.key === '2') {
      this.stop()
      this.play(SONGS.wii)
    } else if (e.key === '3') {
      this.stop()
      this.play(SONGS.ipod)
    } else if (e.key === '4') {
      this.stop()
      this.play(SONGS.orbit)
    }
  }

  // this function must be called in response to a user action
  // otherwise safari and chrome will block the audio
  resume() {
    this.play(SONGS.ipod)
  }

  pause() {
    Transport?.stop()
    this.voices?.forEach(voice => voice.player.stop())
  }

  voiceFromFile(file) {
    const voice = {
      file: file,
      player: new Player({
        url: `${file}`,
        fadeOut: 0.1,
      }),
      panVol: new PanVol()
    }
    voice.panVol.volume.value = -Infinity
    return voice
  }

  stop() {
    this.pause()
    this.loop?.dispose()
    this.voices?.forEach(voice => {
      voice.player.dispose()
      voice.panVol.dispose()
    })
    this.voices = null
    this.currentMeasure = 0
    this.currentSong = null
  }

  async play(song) {
    // only start if it hasn't started yet
    if (Transport.state === 'started') return
    await start()

    // if song is different from last one, dispose of old voices
    if (this.currentSong && this.currentSong !== song) {
      this.stop()
    }

    this.currentSong = song

    if (!this.voices) {
      const parts = song.parts[0]
      this.voices = parts.map(part => this.voiceFromFile(part[0]))

      // master output
      this.reverb ||= new Reverb(0.5)
      this.reverb.wet.value = 0.15
      this.compressor ||= new Compressor()
      this.compressor.threshold.value = -24
      this.compressor.ratio.value = 2
      this.compressor.attack.value = 1
      this.compressor.release.value = 0.1
      this.masterVolume = new Volume(0).toDestination()
      this.masterVolume.volume.rampTo(MAX_VOLUME, 3)
      this.master = this.reverb
        .connect(this.compressor)
        .connect(this.masterVolume)

      Transport.bpm.value = song.bpm

      await loaded()

      this.loop = new Loop(time => {
        this.currentMeasure++
        this.voices.forEach((voice, i) => {
          // just step through parts
          const part = song.parts[this.currentMeasure % song.parts.length][i]
          const url = part[0]
          if (url) {
            voice.player.load(url)
          } else {
            voice.player.stop()
          }
          voice.player.chain(voice.panVol)
          voice.panVol.connect(this.master)

          // randomly mute some voices, but keep most on
          const probability = this.currentMeasure <= INTRO_LENGTH && typeof part[2] === 'number' ? part[2] : part[1]
          if (Math.random() > probability) {
            voice.panVol.volume.linearRampTo(-Infinity, 0.1)
          } else {
            voice.panVol.volume.linearRampTo(TRACK_VOLUME, 0.1)
          }

          voice.player.start(time)
        })
      }, song.interval || '2m').start(0)
    }

    // PLAY
    Transport.start()
  }

  // given the state of anybody, modify voices
  async render(anybody) {
    if (!this.voices) return

    // map the x position of each body to a voice's panning
    this.voices.forEach((voice, i) => {
      const body = anybody.bodies[i]
      if (!body) return
      const { x } = body.position

      const xFactor = x / anybody.windowWidth

      // panning
      const panRange = 1.4 // 2 is max, hard L/R panning
      voice.panVol.pan.linearRampTo(xFactor * panRange - panRange / 2, 0.1)
    })
  }

  activeVoices() {
    return this.voices?.map((voice, i) => voice.panVol.volume.value > -Infinity ? i : null)
      .filter(i => i !== null) || []
  }
}