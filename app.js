const GROUPS=[
["조이다","풀다"],["두드리다","박다"],["끓이다","삶다","볶다","튀기다"],["차다","차갑다"],
["불전","현금을 내다"],["통화하다","전화하다"],["나","이나","거나","혹은"],["미루다","연기하다"],
["돈을 빼다","출금하다"],["안다","포옹하다"],["때리다","구타","폭행"],["집","댁"],["기쁘다"],
["나이","연세","연령"],["자다","주무시다","취침"],["있다","계시다"],["수업","강의","반"],
["빨리","얼른","일찍","적당히","서두르다","이르다"],["생일","생신","돌"],["가게","상점","매점","점"],
["쓸다","청소하다","치우다"],["목욕","샤워","세수"],["쓰레기","먼지","종량제"],
["파손","깨지다","무너지다","부수다","해체","끼임","감김"],["책을 읽다","독서"],
["치료비","요양비"],["갱신","연장"],["위치","주소","문의","장소"],["정리","정돈","치우다"],
["요리사","조리사"],["도서관","자료실"],["똑바로","직진"],["오른쪽","우회전"],["왼쪽","좌회전"],
["외양간","우사"],["돼지우리","돈사"],["망치","해머","장도리"],["바꾸다","변경","환불","교환"],
["갈아타다","환승하다"],["환전"],["길","거리","도로"],["수리하다","고치다"],["정하다","수정하다"],
["먼저","우선","전","처음"],["공장","직장","작업장","근무장","사업장","근무처"],["앞에","전방","근방"],
["안에","속에","이내"],["밑에","아래"],["가운데","중간에","사이"],["영화관","극장"],
["두통","머리가 아프다"],["주다","제공하다"],["사과하다","양해"]
];

// Similar distractors are deliberately kept near the target group/topic.
// The correct answer always comes from the same serial/group as the prompt.
const DISTRACTOR_BANK=[
["빠르다","느리다","서두르다","늦다"],["정리하다","치우다","청소하다","수리하다"],
["사용하다","바꾸다","고치다","준비하다"],["오다","가다","들어가다","나가다"],
["알다","모르다","묻다","대답하다"],["시작하다","끝내다","준비하다","계속하다"],
["주다","받다","보내다","가져오다"],["찾다","확인하다","문의하다","정하다"],
["아프다","건강하다","치료하다","쉬다"],["생각하다","기억하다","잊다","말하다"]
];

const ADMIN_PREVIEW_PASSWORD="Eps@2026";
const state={studentName:"",set:[],index:0,score:0,answers:[],startAt:0,endAt:0,remaining:300,timerId:null,testId:"",firebase:null};
const $=id=>document.getElementById(id);
const views=["welcomeView","instructionView","examView","resultView","adminView"];
function showView(id){views.forEach(v=>$(v).classList.toggle("active",v===id));window.scrollTo({top:0,behavior:"smooth"});}
function cleanName(n){return n.trim().toUpperCase().replace(/[^A-Z0-9가-힣]+/g,"-").replace(/^-|-$/g,"").slice(0,24)||"STUDENT";}
function makeTestId(){const d=new Date(),date=`${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`,key=`mlc_counter_${date}`,n=Number(localStorage.getItem(key)||0)+1;localStorage.setItem(key,String(n));return `${cleanName(state.studentName)}-MLC-${date}-${String(n).padStart(3,"0")}`;}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
function shuffle(a,seed){a=[...a];let s=seed>>>0;for(let i=a.length-1;i>0;i--){s=(s*1664525+1013904223)>>>0;let j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a;}
function buildSet(){
  const seed=hashString(state.testId);
  // Only groups with >=2 entries can be used for synonym-style questions.
  const usable=GROUPS.map((g,i)=>({g,i})).filter(x=>x.g.length>=2);
  const selected=shuffle(usable.map(x=>x.i),seed).slice(0,10);
  return selected.map((gi,pos)=>{
    const g=GROUPS[gi], target=g[(seed+pos)%g.length];
    const correct=g.find(x=>x!==target)||target;
    const bank=shuffle(DISTRACTOR_BANK[(gi+pos)%DISTRACTOR_BANK.length],seed+gi*101+pos*997)
      .filter(x=>!g.includes(x)&&x!==target).slice(0,3);
    return {groupIndex:gi,prompt:`${target}의 비슷한 말은 무엇입니까?`,answer:correct,options:shuffle([correct,...bank],seed+pos*31337)};
  });
}
function formatTime(sec){return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;}
function renderQuestion(){
  const q=state.set[state.index];$("qNumber").textContent=String(state.index+1).padStart(2,"0");
  $("progressText").textContent=`Question ${String(state.index+1).padStart(2,"0")} / 10`;$("progressBar").style.width=`${(state.index+1)*10}%`;
  $("questionText").textContent=q.prompt;$("nextKorean").textContent=state.index===9?"제출하기":"다음 문제";
  $("options").innerHTML="";["A","B","C","D"].forEach((letter,i)=>{const opt=q.options[i],b=document.createElement("button");b.className="option";b.innerHTML=`<span class="letter">${letter}</span><span>${opt}</span>`;b.onclick=()=>{document.querySelectorAll(".option").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");state.answers[state.index]=opt;$("nextBtn").disabled=false;};$("options").appendChild(b)});
  $("nextBtn").disabled=true;
}
function updateTimer(){state.remaining=Math.max(0,300-Math.floor((Date.now()-state.startAt)/1000));$("timer").textContent=formatTime(state.remaining);$("timer").parentElement.classList.toggle("warning",state.remaining<=60&&state.remaining>30);$("timer").parentElement.classList.toggle("danger",state.remaining<=30);if(state.remaining<=0){clearInterval(state.timerId);finishExam(true)}}
function startExam(){state.testId=makeTestId();state.set=buildSet();state.index=0;state.score=0;state.answers=[];state.endAt=0;state.startAt=Date.now();state.remaining=300;$("studentDisplay").textContent=state.studentName;showView("examView");renderQuestion();updateTimer();clearInterval(state.timerId);state.timerId=setInterval(updateTimer,250)}
async function saveResultToCloud(result){
  return false;
}
function saveLocalResult(result){const a=JSON.parse(localStorage.getItem("mlc_results")||"[]");a.unshift(result);localStorage.setItem("mlc_results",JSON.stringify(a.slice(0,200)))}
async function finishExam(auto=false){
  if(state.endAt)return;state.endAt=Date.now();clearInterval(state.timerId);
  state.score=state.set.reduce((s,q,i)=>s+(state.answers[i]===q.answer?1:0),0);
  const used=Math.min(300,Math.max(0,Math.round((state.endAt-state.startAt)/1000)));
  const result={id:state.testId,name:state.studentName,score:state.score,time:used,submittedAt:new Date().toISOString(),autoSubmitted:auto};
  saveLocalResult(result);await saveResultToCloud(result);
  const mins=Math.floor(used/60),secs=used%60;
  const examTime=`${mins}:${String(secs).padStart(2,"0")}`;
  $("score").textContent=state.score;$("scoreRing").style.setProperty("--score",`${state.score*10}%`);$("resultName").textContent=state.studentName;$("resultTime").textContent=examTime;$("resultId").textContent=state.testId;
  let title,ko,bn;if(state.score<=5){title="계속 도전하세요!";ko="조금 더 연습하면 분명히 더 좋은 결과를 만들 수 있습니다.";bn="আরও একটু অনুশীলন করুন—আপনি সামনে অবশ্যই আরও ভালো করতে পারবেন।"}else if(state.score<=8){title="잘하셨습니다!";ko="좋은 결과입니다. 꾸준히 공부하면 더 높은 점수에 도전할 수 있습니다.";bn="অভিনন্দন! খুব ভালো করেছেন। নিয়মিত পড়াশোনা করলে আরও ভালো করতে পারবেন।"}else{title="최고입니다! 🎉";ko="정말 훌륭한 결과입니다. 뛰어난 한국어 실력을 보여주셨습니다!";bn="অসাধারণ! আপনি সত্যিই খুব ভালো করেছেন এবং আপনার কোরিয়ান দক্ষতা দারুণ।"}
  $("resultTitle").textContent=title;$("resultMessageKo").textContent=ko;$("resultMessageBn").textContent=bn;$("resultSub").textContent=auto?"시간이 종료되어 자동 제출되었습니다 · সময় শেষ হওয়ায় পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে":"আপনার পরীক্ষার ফলাফল";document.body.classList.toggle("celebrate",state.score>=9);showView("resultView");
}


async function initFirebase(){
  // Firebase is optional during GitHub testing. Do not load it on page startup.
  return;
}
window.adminLogin=function(){
  const input=$("adminPassword");
  const error=$("adminError");
  const pass=(input.value||"").trim();
  error.textContent="";
  if(!pass){error.textContent="Please enter the admin password.";input.focus();return;}
  if(pass!==ADMIN_PREVIEW_PASSWORD){error.textContent="Incorrect password.";input.select();return;}
  input.value="";
  $("adminModal").classList.add("hidden");
  showView("adminView");
  loadLocalAdmin();
};
function loadLocalAdmin(){renderAdmin(JSON.parse(localStorage.getItem("mlc_results")||"[]"))}
function renderAdmin(rows){
  const term=$("resultSearch").value.trim().toLowerCase();if(term)rows=rows.filter(r=>`${r.name} ${r.id}`.toLowerCase().includes(term));
  const total=rows.length,passed=rows.filter(r=>r.score>=6).length,avg=total?(rows.reduce((a,r)=>a+r.score,0)/total).toFixed(1):"0.0",high=total?Math.max(...rows.map(r=>r.score)):0;
  $("stats").innerHTML=`<div class="stat"><span>TOTAL TESTS</span><strong>${total}</strong></div><div class="stat"><span>PASSED (6+)</span><strong>${passed}</strong></div><div class="stat"><span>AVERAGE</span><strong>${avg}</strong></div><div class="stat"><span>HIGHEST</span><strong>${high}/10</strong></div>`;
  if(!rows.length){$("adminTableWrap").innerHTML='<div class="empty-state">কোনো result পাওয়া যায়নি।</div>';return}
  $("adminTableWrap").innerHTML=`<table class="result-table"><thead><tr><th>STUDENT</th><th>TEST ID</th><th>SCORE</th><th>TIME</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>${rows.map(r=>{const cls=r.score>=9?"score-good":r.score>=6?"score-mid":"score-low";return `<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.id)}</td><td class="${cls}"><strong>${r.score}/10</strong></td><td>${formatTime(r.time)}</td><td>${new Date(r.submittedAt).toLocaleString()}</td><td><span class="status-pill">${r.score>=6?"Passed":"Needs Practice"}</span></td></tr>`}).join("")}</tbody></table>`
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

$("studentName").addEventListener("input",e=>{$("startBtn").disabled=e.target.value.trim().length<2;state.studentName=e.target.value.trim()});
$("startBtn").onclick=()=>showView("instructionView");$("readyBtn").onclick=startExam;$("nextBtn").onclick=()=>state.index===9?finishExam(false):(state.index++,renderQuestion());
$("restartBtn").onclick=()=>{document.body.classList.remove("celebrate");$("studentName").value="";$("startBtn").disabled=true;showView("welcomeView")};
window.openAdminPanel=function(){
  $("adminModal").classList.remove("hidden");
  $("adminError").textContent="";
  $("adminPassword").value="";
  setTimeout(()=>$("adminPassword").focus(),50);
};
window.closeAdminPanel=function(){
  $("adminModal").classList.add("hidden");
  $("adminError").textContent="";
};

$("adminRefresh").onclick=loadLocalAdmin;$("resultSearch").oninput=loadLocalAdmin;
$("adminLogout").onclick=()=>showView("welcomeView");
$("stayBtn").onclick=()=>$("exitModal").classList.add("hidden");$("leaveBtn").onclick=()=>{$("exitModal").classList.add("hidden");clearInterval(state.timerId);state.endAt=Date.now();showView("welcomeView")};
let allowExit=false;window.addEventListener("beforeunload",e=>{if($("examView").classList.contains("active")&&!allowExit){e.preventDefault();e.returnValue=""}});history.pushState(null,"",location.href);window.addEventListener("popstate",()=>{if($("examView").classList.contains("active")){history.pushState(null,"",location.href);$("exitModal").classList.remove("hidden")}});

