const {SignalGraph, InteractiveTrackView} = VFBLib;

let userDemo, standardDemo;

window.onload = function() {
  let view = this.makeGraphWithWorker('./example.mp3')
  console.log('View:', view)
  document.getElementById('top_demo_wrapper').appendChild(view.canvas);


  view.canvas.width = view.canvas.parentElement.clientWidth;
  view.canvas.height = 200;
  window.addEventListener('resize', () => {
    view.canvas.width = view.canvas.parentElement.clientWidth;
    view.canvas.height = 200;
    view.draw();
  })

  view.canvas.addEventListener('click', () => {
    if(userDemo)
      userDemo.stop();
  })

  standardDemo = view;
}

function makeGraphWithWorker(urlOrFile) {

  const view = new InteractiveTrackView(undefined, false);

  const worker = new Worker('worker.js');
  
  worker.onmessage = e => {
    if(e.data.message == 'graphs'){
      const graphs = e.data.graphs.map(({data, interval, color, style}) => {
        let graph = new SignalGraph(data, interval);
        graph.color = color;
        graph.style = style;
        graph.normaliseScale(1/2, 3/4)
        return graph;
      });
      
      view.addGraph(...graphs);
      view.updateProgress(null);
      view.enableMouseControls();
    } else if(e.data.message == 'progress') {
      view.updateProgress(e.data.progress, 'Plotting the graph')
    }
  }

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  if(typeof urlOrFile == 'string'){
    let url = urlOrFile;
    view.updateProgress(0,'Downloading audio')
    let xhttp = new XMLHttpRequest;
    xhttp.open('get', url, true);
    xhttp.responseType = 'arraybuffer'
    xhttp.onload = () => {
      view.updateProgress(0, 'Decoding audio file')
      ctx.decodeAudioData(xhttp.response, buffer => {
        view.audiobuffer = buffer;
        view.t0 = view.tMin = 0;
        view.t1 = view.tMax = buffer.length / buffer.sampleRate;

        worker.postMessage({
          type: 'data',
          sampleRate: buffer.sampleRate,
          pcm: buffer.getChannelData(0),
        })
      })
    }
    xhttp.send();

  } else if(urlOrFile instanceof File) {
    let file = urlOrFile
    // Read the file
    view.updateProgress(0, "Reading file")
    const reader = new FileReader()
    reader.onload = e => {
      view.updateProgress(0, "Decoding audio")
      let ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.decodeAudioData(e.target.result, buffer => {
        view.audiobuffer = buffer;
        view.t0 = view.tMin = 0;
        view.t1 = view.tMax = buffer.length / buffer.sampleRate;

        worker.postMessage({
          type: 'data',
          sampleRate: buffer.sampleRate,
          pcm: buffer.getChannelData(0),
        })
      })
    }
    reader.readAsArrayBuffer(file)

  } else
    throw "Unexpected argument";

  return view;
}

function submitFile(input) {
  // Clear the wrapper
  const wrapper = document.getElementById('user_graph_wrapper');
  while(wrapper.firstChild)
    wrapper.removeChild(wrapper.firstChild);

  

  // Create the graph
  let view = makeGraphWithWorker( input.files[0] );
  wrapper.appendChild(view.canvas)

  if(userDemo)
    userDemo.stop();
  userDemo = view;

  // Set up auto resizing
  view.canvas.width = view.canvas.parentElement.clientWidth;
  view.canvas.height = 200;
  window.addEventListener('resize', () => {
    view.canvas.width = view.canvas.parentElement.clientWidth;
    view.canvas.height = 200;
    view.draw();
  })

  view.canvas.addEventListener('click', () => {
    standardDemo.stop();
  })
}

