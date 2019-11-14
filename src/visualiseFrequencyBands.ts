import { Readable } from "stream";

import collect, { collectAudio } from "./collect";

import {Hopper, Windower, FFT, SpectralBandIntensity} from 'ts-dsp'
import {SignalGraph, InteractiveTrackView} from 'scrollable-graphs';


const defualtCutOffs = [
  0, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 22000
];

async function visualiseFrequencyBands(
  audio:AudioBuffer|Readable, 
  options:{windowSize?:number, hopSize?:number; cutOffs?:number[]}={}
) {
  // Destructure options
  const {
    windowSize = 2048, hopSize = 441,
    cutOffs = defualtCutOffs,
  } = options;

  let audiobuffer
  if(audio instanceof Readable)
    audiobuffer = await collectAudio(audio)
  else
    audiobuffer = audio

  // Prepare audio for FFT.
  let hopper = new Hopper(windowSize, hopSize)
  let windower = new Windower(windowSize)
  let fft = new FFT(windowSize)
  fft.setMaxListeners(cutOffs.length)
  hopper.pipe(windower).pipe(fft)
  
  let bands = []
  let bandCollections = []
  for(let i=1; i<cutOffs.length; i++) {
    let lo = cutOffs[i-1]
    let hi = cutOffs[i]
    let band = new SpectralBandIntensity(lo, hi)
    fft.pipe(band)
    bands.push(band)
    bandCollections.push( collect(band, 'intensity') )
  }

  // Pass audiobuffer to the hopper
  hopper.end(audiobuffer)

  // Wait for the data to be analysed.
  let data = await Promise.all(bandCollections)

  // Plot the graphs
  let view = new InteractiveTrackView
 // view.canvas.setAttribute('height', '700')
  view.audiobuffer = audiobuffer
  view.t0 = view.tMin = 0
  view.t1 = view.tMax = audiobuffer.length / audiobuffer.sampleRate
  let channelHeight = 1/data.length
  for(let c=0; c<data.length; c++) {
    let graph = new SignalGraph(data[c], hopSize / audiobuffer.sampleRate)
    //graph.normaliseScale(channelHeight*c, channelHeight*(c+0.5))
    graph.normaliseScale(1/2, 3/4)
    graph.style = 'reflectAndFill'
    let hue = Math.round(c*256 / data.length)
    let alpha = 1 - (c / data.length) * (4/5)
    graph.color = 'hsla('+hue+', 50%, 50%,'+alpha+')' 
    view.addGraph(graph)
  }

  return view
}

export {visualiseFrequencyBands}