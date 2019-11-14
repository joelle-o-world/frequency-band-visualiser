import { Readable } from 'stream'
import * as AudioBuffer from 'audiobuffer'

/**
 * Collect the chunks of a readable stream into an array. Returns a promise for
 * that array.
 */
function collect(stream:Readable, property:string|null=null):Promise<any[]> {
  let list:any[] = []
  if(property == null)
    stream.on('data', data => list.push(data))
  else
    stream.on('data', data => list.push(data[property]))
    
  return new Promise((fulfil, reject) => {
    stream.on('finish', () => fulfil(list))
  })
}
export default collect

async function collectAudio(audioStream: Readable) {
  let chunks:AudioBuffer[] = await collect(audioStream)

  if(!chunks.length)
    throw 'No audio found'

  // calculate length in samples
  let lengthInSamples:number = 0
  for(let chunk of chunks)
    lengthInSamples += chunk.length

  let numberOfChannels = chunks[0].numberOfChannels
  let sampleRate = chunks[0].sampleRate

  let channelData = []
  for(let c=0; c<numberOfChannels; c++)
    channelData[c] = new Float32Array(lengthInSamples)

  let t:number = 0
  for(let chunk of chunks) {
    for(let c=0; c<numberOfChannels; c++) {
      let signal = chunk.getChannelData(c)
      for(let u=0; u<signal.length; u++)
        channelData[c][t+u] = signal[u]
    }

    t += chunk.length
  }

  return AudioBuffer.fromArray(channelData, sampleRate)
}

export {collect, collectAudio}