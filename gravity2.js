'use strict';

const width = 1200, height = 600;
const width2 = width/2, height2 = height/2;
const width4 = width/4;
const canvas = document.getElementById('obraz');
canvas.width = width, canvas.height = height;

const ctx = canvas.getContext('2d');

let N = 4800;
let N6 = 6*N, N3 = 3*N;

const dispN = document.getElementById('dispN');
const dispFPS = document.getElementById('dispFPS');
dispN.innerHTML = N;
dispFPS.innerHTML = 0;

const bufforP = new SharedArrayBuffer(N6*8);
const PTS = new Float64Array(bufforP);
const bufforF = new SharedArrayBuffer(N3*8);
const FRS = new Float64Array(bufforF);

const G = 10000;
const h = 0.001;
const h2 = h/2;
let aniRate = 0;

const angStep = Math.PI/36;
let FI = Math.PI/6, TH = Math.PI/3;//1.15;
let pVx = [Math.cos(-0.0)*Math.cos(FI), Math.cos(-0.0)*Math.sin(FI), Math.sin(-0.0)];
let pVz = [-Math.cos(TH)*Math.sin(FI), Math.cos(TH)*Math.cos(FI), Math.sin(TH)];

const numGob = navigator.hardwareConcurrency - 1;
const goblins = Array.from( {length:numGob}, i => new Worker('grav_goblin.js'));
const subFRS = Array.from( {length:numGob}, i => new SharedArrayBuffer(N3*8) );
const arrFRS = Array.from( subFRS, q => new Float64Array(q) );

const resolver = {};
let respCounter = numGob;
let nextTask = () => {};

for( let i = 0; i < numGob; i++ ) {
    const g = goblins[i];
    g.postMessage( {nr: i, nG: numGob, buffoP: bufforP, buffoF: bufforF, width: width, subF: subFRS[i]} );
    g.onmessage = (e) => {
        if( --respCounter == 0 ) {
            respCounter = numGob;
            nextTask();
        }
    };
}

function center() {
    let CM = [0,0,0,0,0,0];
    for(let i=0; i < N6; i += 6 ) {
        CM[0] += PTS[i];
        CM[1] += PTS[i+1];
        CM[2] += PTS[i+2];
        CM[3] += PTS[i+3];
        CM[4] += PTS[i+4];
        CM[5] += PTS[i+5];
    }
    return CM.map(q => q/N);
}

function zeroCM(x=true, v=true) {
    const CM = center();
    for( let i=0; i<N6; i += 6) {
        if(x) {
            PTS[i] -= CM[0];
            PTS[i+1] -= CM[1];
            PTS[i+2] -= CM[2];
        }
        if(v) {
            PTS[i+3] -= CM[3];
            PTS[i+4] -= CM[4];
            PTS[i+5] -= CM[5];
        }
    }
}

function initPoints() {
    const xScale = 0.2*width;
    const vScale = 0.1*width;
    const NN = N**0.5 | 0;

    for( let i = 0; i < N6 ; i += 6 ) { //0.25 + 0.15x
        PTS[i]   = (0.3+0.1*i/N6)*width2*Math.cos(-5*2*Math.PI*i/N6 + Math.PI*i/6);
        PTS[i+1] = (0.3+0.1*i/N6)*width2*Math.sin(-5*2*Math.PI*i/N6 + Math.PI*i/6);
        PTS[i+2] = 0.01*(Math.random()-0.5);
        PTS[i+3] = 0;
        PTS[i+4] = 0;
        PTS[i+5] = 0;
    }

    zeroCM(true, false);
    // prescribed ~ Kepler
    for( let i = 0; i < N6; i += 6 ) {
        const R = Math.hypot(PTS[i], PTS[i+1]);
        PTS[i+3] = -1.95*PTS[i+1]*(G/R**2)**0.5;
        PTS[i+4] =  1.95*PTS[i]*(G/R**2)**0.5;
    }

    zeroCM(false, true);
}

function drawPoints() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'red'; // 'rgba(255, 0, 0, 0.75)';
    let remov = false;
    for(let i = 0; i < N6; i += 6 ) {
        if( Math.hypot(PTS[i],PTS[i+1],PTS[i+2]) > width ) {
            remov = true;
            PTS[i] = PTS[N6-6];
            PTS[i+1] = PTS[N6-5];
            PTS[i+2] = PTS[N6-4];
            PTS[i+3] = PTS[N6-3];
            PTS[i+4] = PTS[N6-2];
            PTS[i+5] = PTS[N6-1];
            i -= 6;
            N--;
            N6 -= 6;
        }
        const vvx = PTS[i]*pVx[0] + PTS[i+1]*pVx[1] + PTS[i+2]*pVx[2];
        const vvz = PTS[i]*pVz[0] + PTS[i+1]*pVz[1] + PTS[i+2]*pVz[2];
        ctx.fillRect(width2+(vvx), height2-(vvz), 2, 2);
        //ctx.fillRect(width2+(PTS[i]+0.75*PTS[i+1]), height2-(PTS[i+2]+0.5*PTS[i+1]), 2, 2);
    }
    if( remov ) zeroCM(false, true);
    if( N < 2 ) STOP();
}

function scheduleGoblins(curr, next) {
    nextTask = next;
    for( let i = 0; i < numGob; i++ ) {
        //const [i1, i2] = [Math.floor((i*N)/numGob), Math.floor(((i+1)*N)/numGob)];
        goblins[i].postMessage( [curr, N] );
    }
}

function sumForces() { // lots of zero-blocks, could be optimized still
    for( let j = 0; j < N3; j += 3) {
        FRS[j] = arrFRS.reduce( (a,c) => a + c[j], 0);
        FRS[j+1] = arrFRS.reduce( (a,c) => a + c[j+1], 0);
        FRS[j+2] = arrFRS.reduce( (a,c) => a + c[j+2], 0);
    }
}

const leapFrog0 = () => scheduleGoblins('FORCE', () => {sumForces(); leapFrog1();} ); // init only: only drift changes forces
const leapFrog1 = () => scheduleGoblins('KICK', leapFrog2); //entry
const leapFrog2 = () => scheduleGoblins('DRIFT', leapFrog3);
const leapFrog3 = () => scheduleGoblins('FORCE', () => {sumForces(); leapFrog4();} );
const leapFrog4 = () => scheduleGoblins('KICK', animate);

// combine two kicks - eponymous leapFrog
const leapFrogInit0 = () => scheduleGoblins('FORCE', () => {sumForces(); leapFrogInit1();} ); //init
const leapFrogInit1 = () => scheduleGoblins('KICK', leapFrog1b);
const leapFrog1b = () => scheduleGoblins('DRIFT', leapFrog2b); //entry
const leapFrog2b = () => scheduleGoblins('FORCE', () => {sumForces(); leapFrog3b();} );
const leapFrog3b = () => scheduleGoblins('2KICK', animate);

// Yoshida next order scheme
const Yoshida0 = () => scheduleGoblins('FORCE', () => {sumForces(); Yoshida1();} ); //init
const Yoshida1 = () => scheduleGoblins('KICK1', Yoshida2); //entry
const Yoshida2 = () => scheduleGoblins('DRIFT1', Yoshida3);
const Yoshida3 = () => scheduleGoblins('FORCE', () => {sumForces(); Yoshida4();} );
const Yoshida4 = () => scheduleGoblins('KICK1', Yoshida5);
const Yoshida5 = () => scheduleGoblins('KICK2', Yoshida6);
const Yoshida6 = () => scheduleGoblins('DRIFT2', Yoshida7);
const Yoshida7 = () => scheduleGoblins('FORCE', () => {sumForces(); Yoshida8();} );
const Yoshida8 = () => scheduleGoblins('KICK2', Yoshida9);
const Yoshida9 = () => scheduleGoblins('KICK1', Yoshida10);
const Yoshida10 = () => scheduleGoblins('DRIFT1', Yoshida11);
const Yoshida11 = () => scheduleGoblins('FORCE', () => {sumForces(); Yoshida12();} );
const Yoshida12 = () => scheduleGoblins('KICK1', animate);

let entryProc = leapFrog0;
let contiProc = leapFrog1;

function U( i, j) { 
    return -Math.pow((PTS[i]-PTS[j])**2 + (PTS[i+1]-PTS[j+1])**2 + (PTS[i+2]-PTS[j+2])**2, -0.5);
}

function energy() {
    let kinetic = 0, potential = 0;
    for(let i=0; i<N6; i+=6 ) {
        kinetic += PTS[i+3]**2 + PTS[i+4]**2 + PTS[i+5]**2;
        for(let j=i+6; j<N6; j+=6 ) {
            potential += U(i,j);
        }
    }
    kinetic *= 0.5;
    potential *= G;
    return kinetic + potential;//, kinetic, potential ];
}

function krent() {
    const CM = center();
    let j1 = 0, j2 = 0, j3 = 0;
    for(let i=0; i<N6; i+=6 ) {
        j1 += (PTS[i+1]-CM[1])*(PTS[i+5]-CM[5]) - (PTS[i+2]-CM[2])*(PTS[i+4]-CM[4]); // Jx = y*vz - z*vy
        j2 += (PTS[i+2]-CM[2])*(PTS[i+3]-CM[3]) - (PTS[i]-CM[0])*(PTS[i+5]-CM[5]); // Jy = z*vx - x*vz
        j3 += (PTS[i]-CM[0])*(PTS[i+4]-CM[4]) - (PTS[i+1]-CM[1])*(PTS[i+3]-CM[3]); // Jz = x*vy - y*vx
    }
    //const J = Math.hypot(j1,j2,j3);
    return [j1, j2, j3];
}

let mainInt;
let running = false;
let iterum = 0;
let latency = 0, tStamp = performance.now();

function animate() {
    latency = 0.75*latency + 0.25*(performance.now()-tStamp)
    dispFPS.innerHTML = (1000/latency).toFixed(1);
    tStamp = performance.now();
    drawPoints();
    dispN.innerHTML = N;
    iterum++;
    if( running ) {
        mainInt = setTimeout( contiProc, aniRate);
    }
}

function START() {
    running = true;
    tStamp = performance.now();
    entryProc();
}
function STOP() {
    running = false;
    clearTimeout(mainInt);
}

initPoints();
let t0 = Date.now();
drawPoints();
console.log(Date.now()-t0);
console.log('CM:', center());
console.log('E:', energy());
console.log('J:', krent());


canvas.onclick = (e) => {
    if( running ) STOP();
    else START();
    document.getElementById('instruct').style.display = 'none';
}

document.addEventListener('keydown', function(event) {
    // console.log('Key pressed:', event.key);
    if( event.key == 'ArrowRight' ) {
        FI -= angStep;
    } else if( event.key == 'ArrowLeft' ) {
        FI += angStep;
    }
    if( event.key == 'ArrowUp' ) {
        TH += angStep;
    } else if( event.key == 'ArrowDown' ) {
        TH -= angStep;
    }
    pVx = [Math.cos(0.0)*Math.cos(FI), Math.cos(0.0)*Math.sin(FI), Math.sin(0.0)];
    pVz = [-Math.cos(TH)*Math.sin(FI), Math.cos(TH)*Math.cos(FI), Math.sin(TH)];
    if( !running ) drawPoints();
});
