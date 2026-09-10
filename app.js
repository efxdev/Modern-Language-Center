import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

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

const DISTRACTOR_BANK=[
["빠르다","느리다","서두르다","늦다"],["정리하다","치우다","청소하다","수리하다"],
["사용하다","바꾸다","고치다","준비하다"],["오다","가다","들어가다","나가다"],
["알다","모르다","묻다","대답하다"],["시작하다","끝내다","준비하다","계속하다"],
["주다","받다","보내다","가져오다"],["찾다","확인하다","문의하다","정하다"],
["아프다","건강하다","치료하다","쉬다"],["생각하다","기억하다","잊다","말하다"]
];

const state={
  studentName:"",set:[],index:0,score:0,answers:[],startAt:0,endAt:0,remaining:300,
  timerId:null,testId:"",firebase:null,auth:null,db:null,authReady:false,currentUser:null,
  admin:false,adminResults:[],adminBusy:false
};
const $=id=>document.getElementById(id);
const views=["welcomeView","instructionView","examView","resultView","adminView"];
function showView(id){views.forEach(v=>$(v).classList.toggle("active",v===id));window.scrollTo({top:0,behavior:"smooth"});}
function toast(message){const el=$("toast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600);}
function cleanName(n){return n.trim().toUpperCase().replace(/[^A-Z0-9가-힣]+/g,"-").replace(/^-|-$/g,"").slice(0,24)||"STUDENT";}
function makeTestId(){const d=new Date(),date=`${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`,key=`mlc_counter_${date}`,n=Number(localStorage.getItem(key)||0)+1;localStorage.setItem(key,String(n));return `${cleanName(state.studentName)}-MLC-${date}-${String(n).padStart(3,"0")}`;}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
function shuffle(a,seed){a=[...a];let s=seed>>>0;for(let i=a.length-1;i>0;i--){s=(s*1664525+1013904223)>>>0;let j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a;}
function buildSet(){
  const seed=hashString(state.testId);
  const usable=GROUPS.map((g,i)=>({g,i})).filter(x=>x.g.length>=2);
  const selected=shuffle(usable.map(x=>x.i),seed).slice(0,10);
  return selected.map((gi,pos)=>{
    const g=GROUPS[gi],target=g[(seed+pos)%g.length];
    const correct=g.find(x=>x!==target)||target;
    const bank=shuffle(DISTRACTOR_BANK[(gi+pos)%DISTRACTOR_BANK.length],seed+gi*101+pos*997).filter(x=>!g.includes(x)&&x!==target).slice(0,3);
    return {groupIndex:gi,prompt:`${target}의 비슷한 말은 무엇입니까?`,answer:correct,options:shuffle([correct,...bank],seed+pos*31337)};
  });
}
function formatTime(sec){return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;}
function renderQuestion(){
  const q=state.set[state.index];
  $("qNumber").textContent=String(state.index+1).padStart(2,"0");
  $("progressText").textContent=`Question ${String(state.index+1).padStart(2,"0")} / 10`;
  $("progressBar").style.width=`${(state.index+1)*10}%`;
  $("questionText").textContent=q.prompt;
  $("nextKorean").textContent=state.index===9?"제출하기":"다음 문제";
  $("options").innerHTML="";
  ["A","B","C","D"].forEach((letter,i)=>{
    const opt=q.options[i],b=document.createElement("button");
    b.className="option";b.innerHTML=`<span class="letter">${letter}</span><span>${opt}</span>`;
    b.onclick=()=>{document.querySelectorAll(".option").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");state.answers[state.index]=opt;$("nextBtn").disabled=false;};
    $("options").appendChild(b);
  });
  $("nextBtn").disabled=true;
}
function updateTimer(){
  state.remaining=Math.max(0,300-Math.floor((Date.now()-state.startAt)/1000));
  $("timer").textContent=formatTime(state.remaining);
  $("timer").parentElement.classList.toggle("warning",state.remaining<=60&&state.remaining>30);
  $("timer").parentElement.classList.toggle("danger",state.remaining<=30);
  if(state.remaining<=0){clearInterval(state.timerId);finishExam(true);}
}
async function ensureAnonymousAuth(){
  if(!state.auth)return null;
  if(state.currentUser && state.currentUser.isAnonymous)return state.currentUser;
  try{
    const cred=await signInAnonymously(state.auth);state.currentUser=cred.user;return cred.user;
  }catch(error){console.error(error);toast("Firebase authentication failed. Please try again.");return null;}
}
async function initFirebase(){
  try{
    state.firebase=initializeApp(firebaseConfig);
    state.auth=getAuth(state.firebase);
    state.db=getFirestore(state.firebase);
    onAuthStateChanged(state.auth,user=>{state.currentUser=user;state.authReady=true;});
    await ensureAnonymousAuth();
  }catch(error){console.error("Firebase init failed",error);toast("Firebase connection failed. Local mode is active.");}
}
async function saveResultToCloud(result){
  if(!state.db||!state.auth)return false;
  const user=await ensureAnonymousAuth();
  if(!user)return false;
  try{
    await addDoc(collection(state.db,"examResults"),{
      uid:user.uid,name:result.name,score:Number(result.score),total:10,time:Number(result.time),
      passed:Number(result.score)>=6,submittedAt:result.submittedAt,autoSubmitted:!!result.autoSubmitted,testId:result.id
    });
    return true;
  }catch(error){console.error("Firestore save failed",error);return false;}
}
function saveLocalResult(result){
  const a=JSON.parse(localStorage.getItem("mlc_results")||"[]");a.unshift(result);
  const clean=a.filter((r,i,arr)=>r&&(!r.id||arr.findIndex(x=>x&&x.id===r.id)===i)).slice(0,200);
  localStorage.setItem("mlc_results",JSON.stringify(clean));localStorage.setItem("mlc_last_result",JSON.stringify(result));
}
async function finishExam(auto=false){
  if(state.endAt)return;state.endAt=Date.now();clearInterval(state.timerId);
  state.score=state.set.reduce((s,q,i)=>s+(state.answers[i]===q.answer?1:0),0);
  const used=Math.min(300,Math.max(0,Math.round((state.endAt-state.startAt)/1000)));
  const result={id:state.testId,name:state.studentName,score:state.score,time:used,submittedAt:new Date().toISOString(),autoSubmitted:auto};
  saveLocalResult(result);
  const cloudSaved=await saveResultToCloud(result);
  const mins=Math.floor(used/60),secs=used%60,examTime=`${mins}:${String(secs).padStart(2,"0")}`;
  $("score").textContent=state.score;$("scoreRing").style.setProperty("--score",`${state.score*10}%`);$("resultName").textContent=state.studentName;$("resultTime").textContent=examTime;$("resultId").textContent=state.testId;
  let title,ko,bn;
  if(state.score<=5){title="계속 도전하세요!";ko="조금 더 연습하면 분명히 더 좋은 결과를 만들 수 있습니다.";bn="আরও একটু অনুশীলন করুন—আপনি সামনে অবশ্যই আরও ভালো করতে পারবেন।";}
  else if(state.score<=8){title="잘하셨습니다!";ko="좋은 결과입니다. 꾸준히 공부하면 더 높은 점수에 도전할 수 있습니다.";bn="অভিনন্দন! খুব ভালো করেছেন। নিয়মিত পড়াশোনা করলে আরও ভালো করতে পারবেন।";}
  else{title="최고입니다! 🎉";ko="정말 훌륭한 결과입니다. 뛰어난 한국어 실력을 보여주셨습니다!";bn="অসাধারণ! আপনি সত্যিই খুব ভালো করেছেন এবং আপনার কোরিয়ান দক্ষতা দারুণ।";}
  $("resultTitle").textContent=title;$("resultMessageKo").textContent=ko;$("resultMessageBn").textContent=bn;
  $("resultSub").textContent=auto?"시간이 종료되어 자동 제출되었습니다 · সময় শেষ হওয়ায় পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে":"আপনার পরীক্ষার ফলাফল";
  document.body.classList.toggle("celebrate",state.score>=9);showView("resultView");
  if(!cloudSaved)toast("Result shown, but Firebase save failed. Please check your connection.");
}
function readLocalResults(){
  const keys=["mlc_results","mlc_exam_results","modern_language_center_results"],map=new Map();
  for(const key of keys){try{const arr=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(arr))for(const r of arr){if(!r||typeof r!=="object")continue;const id=String(r.id||"");const sig=id||JSON.stringify(r);if(!map.has(sig))map.set(sig,r);}}catch(e){console.warn("Could not read",key,e);}}
  return [...map.values()].sort((a,b)=>new Date(b.submittedAt||0)-new Date(a.submittedAt||0));
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
function secondsFromTime(v){
  if(typeof v==="number")return Math.max(0,Math.min(300,Math.round(v)));
  const m=String(v||"").trim().match(/^(\d{1,2}):([0-5]\d)$/);return m?Math.max(0,Math.min(300,Number(m[1])*60+Number(m[2]))):0;
}
function resultTime(v){const s=Math.max(0,Math.round(Number(v)||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
function renderStats(rows){
  const stats=$("stats");if(!stats)return;const total=rows.length,passed=rows.filter(r=>Number(r.score)>=6).length,avg=total?(rows.reduce((a,r)=>a+Number(r.score||0),0)/total).toFixed(1):"0.0",high=total?Math.max(...rows.map(r=>Number(r.score||0))):0;
  stats.innerHTML=`<div class="stat"><span>TOTAL TESTS</span><strong>${total}</strong></div><div class="stat"><span>PASSED (6+)</span><strong>${passed}</strong></div><div class="stat"><span>AVERAGE</span><strong>${avg}</strong></div><div class="stat"><span>HIGHEST</span><strong>${high}/10</strong></div>`;
}
function renderAdminTable(){
  const table=$("adminTableWrap"),search=$("resultSearch");if(!table)return;
  let rows=[...state.adminResults];const term=(search?.value||"").trim().toLowerCase();if(term)rows=rows.filter(r=>`${r.name||""} ${r.testId||r.id||""}`.toLowerCase().includes(term));
  renderStats(rows);
  if(!rows.length){table.innerHTML='<div class="empty-state"><strong>কোনো পরীক্ষার তথ্য পাওয়া যায়নি।</strong><br><span>Firestore-এ এখনো কোনো পরীক্ষার ফলাফল নেই।</span></div>';return;}
  table.innerHTML=`<table class="result-table"><thead><tr><th>STUDENT</th><th>TEST ID</th><th>SCORE</th><th>EXAM TIME</th><th>EXAM DATE</th><th>SUBMITTED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${rows.map(r=>{
    const score=Number(r.score||0),cls=score>=9?"score-good":score>=6?"score-mid":"score-low",dt=r.submittedAt?new Date(r.submittedAt):null,date=dt?dt.toLocaleDateString():"—",submitted=dt?dt.toLocaleTimeString():"—",id=r.docId||r.id||"";
    return `<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.testId||r.id||"—")}</td><td class="${cls}"><strong>${score}/10</strong></td><td>${resultTime(r.time)}</td><td>${esc(date)}</td><td>${esc(submitted)}</td><td><span class="status-pill">${score>=6?"PASS":"FAIL"}</span></td><td class="admin-actions"><button class="secondary-btn admin-edit-btn" data-id="${esc(id)}" type="button">Edit</button><button class="danger-btn admin-delete-btn" data-id="${esc(id)}" type="button">Delete</button></td></tr>`;
  }).join("")}</tbody></table>`;
  table.querySelectorAll(".admin-edit-btn").forEach(b=>b.addEventListener("click",()=>openEditModal(b.dataset.id)));
  table.querySelectorAll(".admin-delete-btn").forEach(b=>b.addEventListener("click",()=>deleteAdminResult(b.dataset.id)));
}
async function loadAdminResults(){
  if(!state.db){state.adminResults=readLocalResults();renderAdminTable();return;}
  try{
    const snap=await getDocs(query(collection(state.db,"examResults"),orderBy("submittedAt","desc")));
    state.adminResults=snap.docs.map(d=>({docId:d.id,...d.data()}));renderAdminTable();
  }catch(error){console.error("Admin result load failed",error);state.adminResults=[];renderAdminTable();toast("Could not load Firestore results. Check Admin authentication and rules.");}
}
function openEditModal(id){
  const r=state.adminResults.find(x=>x.docId===id);if(!r)return;
  $("editDocId").value=id;$("editStudentName").value=r.name||"";$("editScore").value=Number(r.score||0);$("editTime").value=resultTime(r.time);$("editModal").classList.remove("hidden");
}
function closeEditModal(){$("editModal")?.classList.add("hidden");}
async function saveAdminEdit(){
  const id=$("editDocId").value;if(!id||!state.db)return;
  const name=$("editStudentName").value.trim();const score=Number($("editScore").value);const time=secondsFromTime($("editTime").value);
  if(name.length<2||name.length>32){toast("Student name must be 2–32 characters.");return;}
  if(!Number.isInteger(score)||score<0||score>10){toast("Score must be between 0 and 10.");return;}
  if(time<0||time>300){toast("EXAM TIME must be between 0:00 and 5:00.");return;}
  try{
    await updateDoc(doc(state.db,"examResults",id),{name,score,total:10,time,passed:score>=6});
    closeEditModal();await loadAdminResults();toast("Exam result updated.");
  }catch(error){console.error(error);toast("Update failed. Please try again.");}
}
async function deleteAdminResult(id){
  if(!id||!state.db)return;
  const r=state.adminResults.find(x=>x.docId===id);if(!r)return;
  const label=r.testId||r.name||id;
  if(!window.confirm(`Delete this exam result?\n\n${label}\n\nThis cannot be undone.`))return;
  try{await deleteDoc(doc(state.db,"examResults",id));await loadAdminResults();toast("Exam result deleted.");}
  catch(error){console.error(error);toast("Delete failed. Please try again.");}
}
window.mlcOpenAdmin=function(){
  const modal=$("adminModal"),input=$("adminPassword"),err=$("adminError");if(!modal)return;
  modal.classList.remove("hidden");if(err)err.textContent="";if(input){input.value="";setTimeout(()=>input.focus(),80);}return false;
};
window.mlcCloseAdmin=function(){$("adminModal")?.classList.add("hidden");if($("adminError"))$("adminError").textContent="";return false;};
window.mlcAdminLogin=async function(){
  const input=$("adminPassword"),err=$("adminError"),pass=(input?.value||"").trim();
  if(!pass){if(err)err.textContent="Password required.";return false;}
  if(!state.auth){if(err)err.textContent="Firebase is not ready.";return false;}
  try{
    const cred=await signInWithEmailAndPassword(state.auth,ADMIN_EMAIL,pass);
    if(!cred.user.email||cred.user.email.toLowerCase()!==ADMIN_EMAIL.toLowerCase()){throw new Error("Not an admin account");}
    state.admin=true;state.currentUser=cred.user;if(input)input.value="";window.mlcCloseAdmin();showView("adminView");await loadAdminResults();return false;
  }catch(error){console.error(error);if(err)err.textContent="Incorrect admin password or Admin account is not configured.";if(input){input.select();input.focus();}return false;}
};
window.mlcAdminLogout=async function(){
  try{if(state.auth)await signOut(state.auth);}catch(e){console.error(e);}state.admin=false;state.adminResults=[];await ensureAnonymousAuth();showView("welcomeView");return false;
};
window.mlcRefreshAdmin=()=>loadAdminResults();

$("studentName").addEventListener("input",e=>{$("startBtn").disabled=e.target.value.trim().length<2;state.studentName=e.target.value.trim();});
$("startBtn").onclick=()=>showView("instructionView");
$("readyBtn").onclick=async()=>{if(!state.currentUser||!state.currentUser.isAnonymous)await ensureAnonymousAuth();startExam();};
$("nextBtn").onclick=()=>state.index===9?finishExam(false):(state.index++,renderQuestion());
$("stayBtn").onclick=()=>$("exitModal").classList.add("hidden");
$("leaveBtn").onclick=()=>{$("exitModal").classList.add("hidden");clearInterval(state.timerId);state.endAt=Date.now();showView("welcomeView");};
$("adminRefresh").addEventListener("click",()=>loadAdminResults());
$("resultSearch").addEventListener("input",renderAdminTable);
$("editCancel").addEventListener("click",closeEditModal);
$("editSave").addEventListener("click",saveAdminEdit);
let allowExit=false;
window.addEventListener("beforeunload",e=>{if($("examView").classList.contains("active")&&!allowExit){e.preventDefault();e.returnValue="";}});
history.pushState(null,"",location.href);
window.addEventListener("popstate",()=>{if($("examView").classList.contains("active")){history.pushState(null,"",location.href);$("exitModal").classList.remove("hidden");}});
document.addEventListener("keydown",e=>{
  const adminModal=$("adminModal"),editModal=$("editModal");
  if(e.key==="Escape"&&adminModal&&!adminModal.classList.contains("hidden"))window.mlcCloseAdmin();
  if(e.key==="Escape"&&editModal&&!editModal.classList.contains("hidden"))closeEditModal();
  if(e.key==="Enter"&&adminModal&&!adminModal.classList.contains("hidden")&&document.activeElement===$("adminPassword")){e.preventDefault();window.mlcAdminLogin();}
});
initFirebase();
