let hostPw="",ws=null,role="",room="",myName="",latest=null,prev=null;
const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n||0).toLocaleString();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const L="ABCD";
/* ---- sound (WebAudio, no files) ---- */
let ac=null,sfxOn=true,musicOn=true,step=0,mt=null;
function tone(f,t=0,d=.2,type="sine",v=.12,music=false){if(!ac||(music?!musicOn:!sfxOn))return;
  const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime+t;
  o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,n);g.gain.linearRampToValueAtTime(v,n+.02);
  g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g).connect(ac.destination);o.start(n);o.stop(n+d+.05)}
const sfx={bid:()=>tone(660,0,.12,"triangle",.2),sold:()=>{tone(220,0,.15,"square",.1);tone(440,.12,.25,"triangle",.2)},
  ding:()=>{tone(784,0,.18,"sine",.25);tone(1047,.12,.4,"sine",.25)},buzz:()=>tone(140,0,.5,"sawtooth",.15),
  win:()=>[523,659,784,1047].forEach((f,i)=>tone(f,i*.13,.4,"sine",.25))};
const CH=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]],BASS=[130.81,110,87.31,98.0],PAT=[0,1,2,1,0,2,1,2];
function startAudio(){try{if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)()}ac.resume();
  if(!mt)mt=setInterval(()=>{const c=Math.floor(step/8)%4;
    tone(CH[c][PAT[step%8]]*2,0,.4,"triangle",.07,true);
    if(step%4===0)tone(BASS[c],0,1,"sine",.1,true);
    if(step%8===0)tone(CH[c][0],0,1.6,"sine",.04,true);step++},280)}catch(e){console.warn("audio off",e)}}
document.addEventListener("click",()=>{if(ac&&ac.state==="suspended")ac.resume()});
function toggleSound(){sfxOn=!sfxOn;$("snd").textContent=sfxOn?"🔊":"🔇"}
function toggleMusic(){musicOn=!musicOn;$("mus").textContent=musicOn?"🎵":"🚫";startAudio()}
/* ---- screens ---- */
function show(id){["start","join","rules","game"].forEach(x=>$(x).classList.toggle("hidden",x!==id))}
function showJoin(){show("join");startAudio()}
function connect(){
  const proto=location.protocol==="https:"?"wss":"ws";
  ws=new WebSocket(`${proto}://${location.host}/ws/${encodeURIComponent(room)}/${role}`);
  ws.onopen=()=>{$("status").textContent="🟢 Online";ws.send(JSON.stringify({name:myName,password:hostPw}))};
  ws.onclose=()=>{$("status").textContent="🔴 Offline"};
  ws.onerror=()=>{$("status").textContent="🔴 Error"};
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.type==="error"){alert(m.message);return}
    if(m.type==="state"){prev=latest;latest=m.state;render()}};
}
function join(){myName=($("name").value||"").trim();if(!myName){alert("Please enter a nickname.");return}
  role="student";room=($("room").value||"FA2026").trim().toUpperCase();startAudio();connect();show("rules")}
function host(){const p=prompt("Host password (leave empty if running locally):");if(p===null)return;hostPw=p.trim();
  role="host";myName="HOST";room=($("room").value||"FA2026").trim().toUpperCase();startAudio();connect();show("game")}
function ready(){show("game")}
function send(action,extra={}){if(ws&&ws.readyState===1)ws.send(JSON.stringify({action,...extra}))}
const bid=a=>send("bid",{amount:a});
const pick=i=>send("answer",{index:i});

function render(){
  const s=latest,q=s.question,me=s.player,isHost=role==="host",fin=s.phase==="finished";
  if(prev){
    if(s.phase==="auction"&&prev.phase==="auction"&&s.current_bid>prev.current_bid)sfx.bid();
    if(s.phase==="challenge"&&prev.phase!=="challenge")sfx.sold();
    if(s.phase==="round_end"&&prev.phase!=="round_end")(s.last_correct?sfx.ding:sfx.buzz)();
    if(fin&&prev.phase!=="finished")sfx.win();
  }
  $("round").textContent=`Question ${Math.min(s.round_number,s.total_rounds)}/${s.total_rounds}`;
  $("phase").textContent=s.phase.replace("_"," ");
  $("bid").textContent=money(s.current_bid);
  $("bidder").textContent=s.current_bidder||"—";
  $("question").innerHTML=fin?`🏆 Final results<small>${s.players[0]?esc(s.players[0].name)+" wins with "+money(s.players[0].balance):""}</small>`
    :q?`<small>${esc(q.title)}</small>${esc(q.question)}`:"Waiting for host…";
  $("hostCard").classList.toggle("hidden",!isHost);
  $("auctionCard").classList.toggle("hidden",fin);
  if(isHost){$("balance").textContent="HOST";$("stats").innerHTML=`<span class="pill">${s.players.length} players</span>`}
  else if(me){$("balance").textContent=money(me.balance);
    $("stats").innerHTML=`<span class="pill">Correct ${me.correct}</span><span class="pill">Bid ${money(me.total_bid)}</span>`}
  $("players").innerHTML=s.players.map((p,i)=>`<div class="row${me&&p.name===me.name?" me":""}"><span>${i+1}. ${esc(p.name)}</span><b>${money(p.balance)}</b></div>`).join("");

  const max=me?Math.min(s.max_bid,me.balance):0;
  $("bidButtons").innerHTML=isHost?"":[100,200,300,400,500,600,700,800,900,1000]
    .map(x=>`<button class="chip" ${x>max||x<=s.current_bid||s.phase!=="auction"?"disabled":""} onclick="bid(${x})">${money(x)}</button>`).join("");

  const winner=me&&s.current_bidder===me.name,done=s.phase==="round_end";
  $("answers").innerHTML=!fin&&q&&q.options?`<div class="opts">`+q.options.map((o,i)=>{
    let c="";if(done)c=i===q.answer?"ok":(i===s.picked?"bad":"dim");
    return `<button class="opt ${c}" ${s.phase==="challenge"&&winner?"":"disabled"} onclick="pick(${i})"><i>${L[i]}.</i><span>${esc(o)}</span></button>`}).join("")+`</div>`:"";
  let r="";
  if(s.phase==="challenge")r=`<p class="hint">${winner?"You won the bid — pick your answer!":esc(s.current_bidder||"")+" is answering…"}</p>`;
  if(s.phase==="auction"&&!isHost)r=`<p class="hint">Bid to win the right to answer.</p>`;
  if(done){const q2=q.options[q.answer];
    r=s.last_correct?`<div class="result ok">✅ Correct! ${L[q.answer]} — ${esc(q2)}<br>+$500 for ${esc(s.current_bidder)}</div>`
      :`<div class="result bad">❌ Wrong! Answer: ${L[q.answer]} — ${esc(q2)}<br>−$100 for ${esc(s.current_bidder)}</div>`}
  $("result").innerHTML=r;
}
