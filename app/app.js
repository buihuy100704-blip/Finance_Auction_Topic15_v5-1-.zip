let hostPw="",ws=null,role="",room="",myName="",latest=null;
const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n||0).toLocaleString();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const L="ABCD";
function connect(){
  const proto=location.protocol==="https:"?"wss":"ws";
  ws=new WebSocket(`${proto}://${location.host}/ws/${encodeURIComponent(room)}/${role}`);
  ws.onopen=()=>{$("status").textContent="🟢 Connected";ws.send(JSON.stringify({name:myName,password:hostPw}))};
  ws.onclose=()=>{$("status").textContent="🔴 Disconnected"};
  ws.onerror=()=>{$("status").textContent="🔴 Connection error"};
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.type==="error"){alert(m.message);return}
    if(m.type==="state"){latest=m.state;render()}};
}
function enter(){$("join").classList.add("hidden");$("game").classList.remove("hidden");connect()}
function join(){myName=($("name").value||"").trim();if(!myName){alert("Please enter a nickname.");return}
  role="student";room=($("room").value||"FA2026").trim().toUpperCase();enter()}
function host(){hostPw=prompt("Host password (leave empty if running locally):");if(hostPw===null)return;hostPw=hostPw.trim();role="host";myName="HOST";room=($("room").value||"FA2026").trim().toUpperCase();enter()}
function send(action,extra={}){if(ws&&ws.readyState===1)ws.send(JSON.stringify({action,...extra}))}
const bid=a=>send("bid",{amount:a});
const pick=i=>send("answer",{index:i});

function render(){
  const s=latest,q=s.question,me=s.player,isHost=role==="host";
  $("round").textContent=`Round ${Math.min(s.round_number,s.total_rounds)} / ${s.total_rounds}`;
  $("phase").textContent=s.phase.replace("_"," ");
  $("bid").textContent=money(s.current_bid);
  $("bidder").textContent=s.current_bidder||"—";
  $("question").innerHTML=q?`<b>${esc(q.title)}</b>${esc(q.question)}`:"🎉 Game finished!";
  $("hostCard").classList.toggle("hidden",!isHost);
  if(isHost){$("balance").textContent="HOST";$("stats").innerHTML=`<span class="pill">${s.players.length} players</span>`}
  else if(me){$("balance").textContent=money(me.balance);
    $("stats").innerHTML=`<span class="pill">Correct ${me.correct}</span><span class="pill">Bid ${money(me.total_bid)}</span>`}
  $("players").innerHTML=s.players.map((p,i)=>`<div class="row${me&&p.name===me.name?" me":""}"><span>${i+1}. ${esc(p.name)}</span><b>${money(p.balance)}</b></div>`).join("");

  const max=me?Math.min(s.max_bid,me.balance):0;
  $("bidButtons").innerHTML=isHost?"":[100,200,300,400,500,600,700,800,900,1000]
    .map(x=>`<button class="chip" ${x>max||x<=s.current_bid||s.phase!=="auction"?"disabled":""} onclick="bid(${x})">${money(x)}</button>`).join("");

  const winner=me&&s.current_bidder===me.name;
  const done=s.phase==="round_end";
  $("answers").innerHTML=q&&q.options?q.options.map((o,i)=>{
    let c="";
    if(done){c=i===q.answer?"ok":(i===s.picked?"bad":"dim")}
    const can=s.phase==="challenge"&&winner;
    return `<button class="ans hex ${c}" ${can?"":"disabled"} onclick="pick(${i})"><span><i>${L[i]}:</i>${esc(o)}</span></button>`}).join(""):"";
  let r="";
  if(s.phase==="challenge")r=winner?`<p class="muted" style="text-align:center">You won the bid — pick your answer!</p>`:`<p class="muted" style="text-align:center">${esc(s.current_bidder||"")} is answering…</p>`;
  if(done)r=s.last_correct?`<div class="result ok">✅ Correct! +$500 for ${esc(s.current_bidder)}</div>`:`<div class="result bad">❌ Wrong! −$100 for ${esc(s.current_bidder)}</div>`;
  if(s.phase==="auction"&&!isHost)r=`<p class="muted" style="text-align:center">Bid to win the right to answer.</p>`;
  $("result").innerHTML=r;
}
