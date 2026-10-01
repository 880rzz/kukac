window.KUKAC_AUDIO={
  create(){
    let ctx=null,ambience=null,tension=null;
    const sets={eat:[520,850,0.11,'square'],coin:[900,1500,0.16,'sine'],turn:[180,220,0.025,'square'],level:[330,880,0.45,'triangle'],over:[220,80,0.55,'sawtooth'],start:[260,660,0.24,'triangle'],raid:[180,420,0.22,'square'],steal:[700,120,0.28,'sawtooth']};
    function ensure(){if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();return ctx}
    function resume(){const c=ensure();if(c.state==='suspended')c.resume()}
    function startLayers(){const c=ensure();if(ambience)return;const mk=(freq,type,vol)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(c.destination);o.start();return{osc:o,gain:g}};ambience=mk(72,'triangle',0.006);tension=mk(146,'sine',0.0008)}
    function update({enabled,lives,royal,stolen}){if(!ambience)return;const now=ctx.currentTime,level=Math.max(0,(3-lives))*0.002+(royal?0.003:0)+(stolen?0.004:0);tension.gain.gain.setTargetAtTime(enabled?level:0,now,0.18);ambience.gain.gain.setTargetAtTime(enabled?0.006:0,now,0.18)}
    function play(type,enabled=true){if(!enabled)return;const c=ensure(),now=c.currentTime,osc=c.createOscillator(),gain=c.createGain(),s=sets[type]||sets.eat;osc.connect(gain);gain.connect(c.destination);osc.type=s[3];osc.frequency.setValueAtTime(s[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(40,s[1]),now+s[2]);gain.gain.setValueAtTime(type==='turn'?0.015:0.11,now);gain.gain.exponentialRampToValueAtTime(0.001,now+s[2]);osc.start(now);osc.stop(now+s[2])}
    return{resume,startLayers,update,play};
  }
};
