const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const server = http.createServer((req,res)=>{
  let p = req.url === "/" ? "/index.html" : req.url;
  const file = path.join(__dirname,path.normalize(p).replace(/^(\.\.[\/\\])+/, ""));
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);return res.end("Not found");}
    const type = file.endsWith(".html")?"text/html":file.endsWith(".js")?"text/javascript":"text/plain";
    res.writeHead(200,{"Content-Type":type});res.end(data);
  });
});
const wss = new WebSocket.Server({server});
const players = new Map();
let nextId=1;
function broadcast(obj, except){
  const s=JSON.stringify(obj);
  for(const [ws] of players) if(ws!==except && ws.readyState===WebSocket.OPEN) ws.send(s);
}
wss.on("connection", ws=>{
  const id=String(nextId++);
  const player={id,name:"Player "+id.slice(-3),x:0,z:8,rot:0};
  players.set(ws,player);
  ws.send(JSON.stringify({type:"welcome",id,players:[...players.values()]}));
  broadcast({type:"join",player},ws);
  ws.on("message", raw=>{
    let m; try{m=JSON.parse(raw)}catch{return}
    if(m.type==="move"){
      player.x=Number(m.x)||0; player.z=Number(m.z)||0; player.rot=Number(m.rot)||0;
      broadcast({type:"move",player},ws);
    } else if(m.type==="name"){
      player.name=String(m.name||player.name).slice(0,20);
      broadcast({type:"move",player});
    } else if(m.type==="chat"){
      const text=String(m.text||"").trim().slice(0,120);
      if(text) broadcast({type:"chat",id,name:player.name,text});
    }
  });
  ws.on("close",()=>{players.delete(ws);broadcast({type:"leave",id})});
});
server.on("error", e => console.error("Server error:", e));
setInterval(()=>{ for(const ws of players.keys()){ if(ws.readyState===WebSocket.OPEN) ws.ping(); } },25000);
server.listen(PORT,"0.0.0.0",()=>console.log("Zainu's World server on "+PORT));
