importScripts('./lib.js');

const {visualiseFrequencyBands} = VFBLib;

onmessage = e => {

  console.log('msg:', e)
  
  const type = e.data.type;
  if(type == 'data') {
    visualiseFrequencyBands(
      {pcm: e.data.pcm, sampleRate: e.data.sampleRate},
      {},
      progress => postMessage({message: 'progress', progress})
    )
      .then(graphs => {
        console.log(graphs);
        postMessage({
          message: 'graphs',
          graphs: graphs.map(graph => ({
            data: graph.data,
            interval: graph.interval,
            color: graph.color,
            style: graph.style
          }))
        });
      })
  }
}