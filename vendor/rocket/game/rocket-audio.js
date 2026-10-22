/** NASA recordings, softened for a small craft. Nothing plays until a sound-button gesture. */
export function createRocketAudio(){
  let context=null,master=null,engineGain=null,jetGain=null,loading=null,enabled=false;const sources=[];
  function loopBuffer(decoded){
    const start=Math.floor(decoded.length*.24),length=Math.min(decoded.length-start,Math.floor(context.sampleRate*6)),fade=Math.min(Math.floor(context.sampleRate*.12),Math.floor(length/4));
    const buffer=context.createBuffer(1,length-fade,decoded.sampleRate),output=buffer.getChannelData(0);
    for(let i=0;i<output.length;i++){
      const weight=i<fade?i/fade:1;let value=0;
      for(let channel=0;channel<decoded.numberOfChannels;channel++){const data=decoded.getChannelData(channel);value+=(data[start+i]*weight+(i<fade?data[start+length-fade+i]*(1-weight):0))/decoded.numberOfChannels;}
      output[i]=value;
    }
    return buffer;
  }
  async function layer(file,gain,frequency,type){
    const response=await fetch(new URL(`../assets/audio/${file}`,import.meta.url));if(!response.ok)throw new Error('Recording unavailable.');
    const decoded=await context.decodeAudioData(await response.arrayBuffer()),source=context.createBufferSource(),filter=context.createBiquadFilter();
    source.buffer=loopBuffer(decoded);source.loop=true;filter.type=type;filter.frequency.value=frequency;source.connect(filter);filter.connect(gain);source.start();sources.push(source);
  }
  return {
    async toggle(){
      if(!context){context=new AudioContext();master=context.createGain();master.gain.value=0;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=6;master.connect(limiter);limiter.connect(context.destination);engineGain=context.createGain();jetGain=context.createGain();engineGain.gain.value=0;jetGain.gain.value=0;engineGain.connect(master);jetGain.connect(master);}
      await context.resume();
      if(!loading)loading=Promise.allSettled([layer('nasa-sls-test-fire.mp3',engineGain,900,'lowpass'),layer('nasa-discovery-launch.mp3',jetGain,1800,'bandpass')]).then(results=>{const failure=results.find(result=>result.status==='rejected');if(failure){for(const source of sources.splice(0))source.stop();loading=null;throw failure.reason;}});
      await loading;enabled=!enabled;master.gain.setTargetAtTime(enabled?1:0,context.currentTime,.08);return enabled;
    },
    update(throttle,{rcs=0,submerged=false}={}){
      if(!context)return;const t=context.currentTime;
      engineGain.gain.setTargetAtTime(enabled?Math.max(0,Math.min(1,throttle))*(submerged?.035:.07):0,t,throttle>.01?.07:.22);
      jetGain.gain.setTargetAtTime(enabled?Math.max(0,Math.min(1,rcs))*.018:0,t,.05);
    },
    get context(){return context;},get output(){return master;},get enabled(){return enabled;},
  };
}
