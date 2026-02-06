// ========================================================
// 3D Survival Game - Clean Modular Version
// ========================================================

// ==============================
// 1. THREE.js Scene Setup
// ==============================
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(854, 480);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

const camera = new THREE.PerspectiveCamera(75, 854/480, 0.1, 1000);
camera.position.y = 2;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 100, 50);
scene.add(sun);

const controls = new THREE.PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());
scene.add(controls.getObject());

// ==============================
// 2. HUD / UI
// ==============================
const ui = {
    health: document.getElementById('health'),
    energy: document.getElementById('energy'),
    hunger: document.getElementById('hunger'),
    thirst: document.getElementById('thirst'),
    wood: document.getElementById('wood'),
    metal: document.getElementById('metal'),
    food: document.getElementById('food'),
    water: document.getElementById('water'),
    day: document.getElementById('day')
};

const messagesEl = document.getElementById('messages');
function log(msg){
    const p = document.createElement('p');
    p.textContent = msg;
    messagesEl.appendChild(p);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ==============================
// 3. Player
// ==============================
const player = {
    health: 100,
    energy: 100,
    hunger: 100,
    thirst: 100,
    day: 1,
    inventory: { wood:0, metal:0, food:0, water:0, tools:[], weapons:[] },
    crafting: { campfire:false, axe:false, pickaxe:false, shelter:false },
};

// ==============================
// 4. Movement Controls
// ==============================
let move = { forward:false, backward:false, left:false, right:false };
document.addEventListener('keydown', e=>{
    if(e.key==='w') move.forward = true;
    if(e.key==='s') move.backward = true;
    if(e.key==='a') move.left = true;
    if(e.key==='d') move.right = true;
});
document.addEventListener('keyup', e=>{
    if(e.key==='w') move.forward = false;
    if(e.key==='s') move.backward = false;
    if(e.key==='a') move.left = false;
    if(e.key==='d') move.right = false;
});

// ==============================
// 5. Ground
// ==============================
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200,200),
    new THREE.MeshStandardMaterial({ color:0x228B22 })
);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

// ==============================
// 6. Resources
// ==============================
class Resource{
    constructor(x,y,z,type){
        this.x = x; this.y = y; this.z = z; this.type = type;
        this.collected = false;
        const colors = { wood:0x8B4513, metal:0x808080, food:0xffa500, water:0x0000ff };
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:colors[type]}));
        this.mesh.position.set(x,y,z);
        scene.add(this.mesh);
    }
}
let resources = [];
function spawnResources(){
    const types = ['wood','metal','food','water'];
    for(let i=0;i<20;i++){
        types.forEach(t=>{
            resources.push(new Resource(Math.random()*50-25,0.5,Math.random()*50-25, t));
        });
    }
}
spawnResources();

// ==============================
// 7. Animals
// ==============================
class Animal{
    constructor(x,y,z,type='deer'){
        this.x=x; this.y=y; this.z=z; this.type=type;
        const color = type==='wolf'?0x222222:0x964B00;
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color}));
        this.mesh.position.set(x,y,z);
        scene.add(this.mesh);
        this.direction=Math.random()*Math.PI*2;
        this.speed=0.02 + Math.random()*0.02;
    }
    move(){
        if(this.type==='wolf'){
            const dx=camera.position.x-this.x;
            const dz=camera.position.z-this.z;
            const dist=Math.sqrt(dx*dx+dz*dz);
            if(dist<10){
                this.direction = Math.atan2(dz,dx);
                this.x += Math.cos(this.direction)*this.speed*1.5;
                this.z += Math.sin(this.direction)*this.speed*1.5;
            } else { this.randomMove(); }
        } else { this.randomMove(); }
        this.mesh.position.set(this.x,this.y,this.z);
    }
    randomMove(){
        if(Math.random()<0.02) this.direction=Math.random()*Math.PI*2;
        this.x += Math.cos(this.direction)*this.speed;
        this.z += Math.sin(this.direction)*this.speed;
    }
}
let animals=[];
function spawnAnimals(){
    for(let i=0;i<7;i++) animals.push(new Animal(Math.random()*50-25,0.5,Math.random()*50-25));
    for(let i=0;i<3;i++) animals.push(new Animal(Math.random()*50-25,0.5,Math.random()*50-25,'wolf'));
}
spawnAnimals();

// ==============================
// 8. Campfires
// ==============================
class Campfire{
    constructor(x,z){
        this.x=x; this.z=z;
        this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.5,8), new THREE.MeshStandardMaterial({color:0xff4500}));
        this.mesh.position.set(x,0.25,z);
        scene.add(this.mesh);
        this.active = true;
    }
    burn(){
        if(this.active){
            player.energy = Math.min(100,player.energy+0.1);
            player.health = Math.min(100,player.health+0.05);
        }
    }
}
let campfires = [];

// ==============================
// 9. Helper Functions
// ==============================
function clamp(val,min,max){ return Math.min(max,Math.max(min,val)); }
function checkCollision(obj1,obj2){
    const dx=Math.abs(obj1.position.x-obj2.position.x);
    const dy=Math.abs(obj1.position.y-obj2.position.y);
    const dz=Math.abs(obj1.position.z-obj2.position.z);
    return dx<1 && dy<1 && dz<1;
}
function updateUI(){
    ui.health.textContent = Math.floor(player.health);
    ui.energy.textContent = Math.floor(player.energy);
    ui.hunger.textContent = Math.floor(player.hunger);
    ui.thirst.textContent = Math.floor(player.thirst);
    ui.wood.textContent = player.inventory.wood;
    ui.metal.textContent = player.inventory.metal;
    ui.food.textContent = player.inventory.food;
    ui.water.textContent = player.inventory.water;
    ui.day.textContent = player.day;
}

// ==============================
// 10. Player Stats Update
// ==============================
function updatePlayerStats(){
    player.hunger -= 0.01;
    player.thirst -= 0.01;
    player.energy -= 0.005;
    if(player.hunger<=0||player.thirst<=0) player.health -= 0.05;
    updateUI();
}

// ==============================
// 11. Collect Resources
// ==============================
function collectResources(){
    resources.forEach(r=>{
        if(!r.collected && checkCollision(controls.getObject(), r.mesh)){
            r.collected = true;
            scene.remove(r.mesh);
            player.inventory[r.type]++;
            log(`Collected 1 ${r.type}`);
        }
    });
}

// ==============================
// 12. Movement Update
// ==============================
function updateMovement(){
    let velocity=new THREE.Vector3();
    if(move.forward) velocity.z-=0.1;
    if(move.backward) velocity.z+=0.1;
    if(move.left) velocity.x-=0.1;
    if(move.right) velocity.x+=0.1;
    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);
}

// ==============================
// 13. Day/Night & Weather
// ==============================
let time={hour:6};
let weather='clear';
function advanceTime(hours=0.02){
    time.hour += hours;
    if(time.hour>=24){
        time.hour=0;
        player.day++;
        log(`Day ${player.day} begins!`);
    }
    const intensity = Math.max(0.1, Math.sin(time.hour/24*Math.PI*2));
    sun.intensity = intensity;
    scene.background = new THREE.Color(intensity*0.5+0.5, intensity*0.7+0.3, intensity*1);
}
function updateEnvironmentVisuals(){
    if(weather==='storm'){ scene.background = new THREE.Color(0.3,0.3,0.4); }
}

// ==============================
// 14. Respawn Animals
// ==============================
function respawnAnimals(){
    while(animals.length<10){
        const type = Math.random()<0.2?'wolf':'deer';
        animals.push(new Animal(Math.random()*50-25,0.5,Math.random()*50-25,type));
    }
}

// ==============================
// 15. Campfire Updates
// ==============================
function updateCampfires(){
    campfires.forEach(fire=>{
        const dx = camera.position.x - fire.x;
        const dz = camera.position.z - fire.z;
        if(Math.sqrt(dx*dx+dz*dz)<3) fire.burn();
    });
}

// ==============================
// 16. Crafting
// ==============================
function craftItem(item){
    switch(item){
        case 'campfire':
            if(player.inventory.wood>=5){ player.inventory.wood-=5; player.crafting.campfire=true; log('Crafted a Campfire'); }
            else log('Not enough wood');
            break;
        case 'axe':
            if(player.inventory.wood>=3 && player.inventory.metal>=2){ player.inventory.wood-=3; player.inventory.metal-=2; player.crafting.axe=true; player.inventory.tools.push({name:'axe',durability:100}); log('Crafted an Axe'); }
            else log('Not enough resources for Axe'); break;
        case 'pickaxe':
            if(player.inventory.wood>=3 && player.inventory.metal>=3){ player.inventory.wood-=3; player.inventory.metal-=3; player.crafting.pickaxe=true; player.inventory.tools.push({name:'pickaxe',durability:100}); log('Crafted a Pickaxe'); }
            else log('Not enough resources for Pickaxe'); break;
        case 'shelter':
            if(player.inventory.wood>=10){ player.inventory.wood-=10; player.crafting.shelter=true; log('Built a Shelter'); }
            else log('Not enough wood for Shelter'); break;
    }
}
document.addEventListener('keydown', e=>{
    if(e.key==='1') craftItem('campfire');
    if(e.key==='2') craftItem('axe');
    if(e.key==='3') craftItem('pickaxe');
    if(e.key==='4') craftItem('shelter');
    if(e.key==='c' && player.crafting.campfire) { campfires.push(new Campfire(camera.position.x+2,camera.position.z+2)); log('Placed a Campfire'); }
});

// ==============================
// 17. Achievements
// ==============================
let achievements = [];
function checkAchievements(){
    if(player.inventory.wood>=50 && !achievements.includes('Wood Collector')){ achievements.push('Wood Collector'); log('Achievement unlocked: Wood Collector'); }
    if(player.inventory.food>=20 && !achievements.includes('Food Hoarder')){ achievements.push('Food Hoarder'); log('Achievement unlocked: Food Hoarder'); }
    if(player.day>=10 && !achievements.includes('Survivor')){ achievements.push('Survivor'); log('Achievement unlocked: Survived 10 Days'); }
}

// ==============================
// 18. Mini-Games & Actions
// ==============================
document.addEventListener('keydown', e=>{
    if(e.key==='h'){ // hunt
        animals.forEach((a,i)=>{
            if(checkCollision(controls.getObject(), a.mesh)){
                player.inventory.food++;
                log('Hunted an animal for food');
                scene.remove(a.mesh); animals.splice(i,1);
            }
        });
    }
    if(e.key==='x'){ // chop wood
        resources.forEach(r=>{
            if(r.type==='wood' && !r.collected && checkCollision(controls.getObject(),r.mesh)){
                player.inventory.wood++; r.collected=true; scene.remove(r.mesh); log('Chopped 1 wood');
            }
        });
    }
    if(e.key==='m'){ // mine metal
        resources.forEach(r=>{
            if(r.type==='metal' && !r.collected && checkCollision(controls.getObject(),r.mesh)){
                player.inventory.metal++; r.collected=true; scene.remove(r.mesh); log('Mined 1 metal');
            }
        });
    }
    if(e.key==='f'){ // eat
        if(player.inventory.food>0){ player.inventory.food--; player.hunger=Math.min(100,player.hunger+20); log('Ate food'); }
    }
    if(e.key==='w'){ // drink
        if(player.inventory.water>0){ player.inventory.water--; player.thirst=Math.min(100,player.thirst+20); log('Drank water'); }
    }
    if(e.key==='g'){ // fish
        if(Math.random()>0.5){ player.inventory.food++; log('Caught a fish'); } else log('No fish'); 
    }
    if(e.key==='d'){ // dig
        if(Math.random()<0.7){ player.inventory.metal++; log('Found metal'); } else { player.inventory.wood++; log('Found wood'); }
    }
    if(e.key==='r'){ // repair tools
        player.inventory.tools.forEach(t=>{ t.durability=Math.min(100,t.durability+20); });
        log('Repaired all tools +20 durability');
    }
    if(e.key==='b'){ // build shelter
        if(player.inventory.wood>=15){ player.inventory.wood-=15; const s = new THREE.Mesh(new THREE.BoxGeometry(4,2,4), new THREE.MeshStandardMaterial({color:0x654321})); s.position.set(camera.position.x+5,1,camera.position.z+5); scene.add(s); log('Built Shelter'); }
        else log('Not enough wood');
    }
});

// ==============================
// 19. Main Game Loop
// ==============================
function animate(){
    requestAnimationFrame(animate);
    updateMovement();
    collectResources();
    animals.forEach(a=>a.move());
    updatePlayerStats();
    advanceTime();
    updateCampfires();
    respawnAnimals();
    updateEnvironmentVisuals();
    checkAchievements();
    renderer.render(scene,camera);
}
animate();
