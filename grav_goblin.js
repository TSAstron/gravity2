'use strict';

const G = 10000;
const h0 = 0.001;
const w1 =  1.3512071919596578*h0;
const w2 = -1.7024143839193155*h0;

let width2;
let PTS;
let FRS, subFRS;
let nr, numGob, N, N6;
let i1, i2;

function DU(i,j) {
    //  force ~ r/r^{3}
    return Math.pow((PTS[i]-PTS[j])**2 + (PTS[i+1]-PTS[j+1])**2 + (PTS[i+2]-PTS[j+2])**2, -1.5);
}

function getForces0() {
    for( let i = i1*6, j=3*i1; i < i2*6; i += 6, j+= 3) {
        const R3 = G*N**0.5*Math.pow(Math.hypot(PTS[i], PTS[i+1], PTS[i+2]), -3);
        FRS[j]   = -PTS[i]*R3;
        FRS[j+1] = -PTS[i+1]*R3;
        FRS[j+2] = -PTS[i+2]*R3;
    }
}

function getForces1() {
    for( let i = i1*6, j=3*i1; i < i2*6; i += 6, j+= 3) {
        //const rad = -G*300*Math.pow(Math.hypot(PTS[i],PTS[i+1],PTS[i+2]),-3);
        FRS[j] = 0;//PTS[i]*rad;
        FRS[j+1] = 0;//PTS[i+1]*rad;
        FRS[j+2] = 0;//PTS[i+2]*rad;
        for( let k=0; k<i; k+=6) {
            const distFact = G*DU(i, k);
            FRS[j]   += distFact*(PTS[k]-PTS[i]);
            FRS[j+1] += distFact*(PTS[k+1]-PTS[i+1]);
            FRS[j+2] += distFact*(PTS[k+2]-PTS[i+2]);
        }
        for( let k=i+6; k<N6; k+=6) {
            const distFact = G*DU(i, k);
            FRS[j]   += distFact*(PTS[k]-PTS[i]);
            FRS[j+1] += distFact*(PTS[k+1]-PTS[i+1]);
            FRS[j+2] += distFact*(PTS[k+2]-PTS[i+2]);
        }
    }
}

function getForces() {
    i1 = Math.floor( N*(1 - (1-nr/numGob)**0.5) );
    i2 = Math.floor( N*(1 - (1-(nr+1)/numGob)**0.5) );
    for( let j = 0; j < 3*N; j++ ) {
        subFRS[j] = 0;
    }
    //let S = 0;
    for( let i = i1*6; i < i2*6; i += 6) {
        const j = i >> 1;
        for( let k = i+6; k < N6; k +=6) {
            const distFact = G*DU(i, k);
            const Fx = distFact*(PTS[k]-PTS[i]);
            const Fy = distFact*(PTS[k+1]-PTS[i+1]);
            const Fz = distFact*(PTS[k+2]-PTS[i+2]);
            subFRS[j]   += Fx;
            subFRS[j+1] += Fy;
            subFRS[j+2] += Fz;
            const l = k >> 1;
            subFRS[l] -= Fx;
            subFRS[l+1] -= Fy;
            subFRS[l+2] -= Fz;
            //S++;
        }
    }
}

function kick(h2) {
    [i1, i2] = [Math.floor((nr*N)/numGob), Math.floor(((nr+1)*N)/numGob)];
    for(let i=i1*6, j=3*i1; i<i2*6; i+=6, j +=3 ) {
        PTS[i+3] += h2*FRS[j];
        PTS[i+4] += h2*FRS[j+1];
        PTS[i+5] += h2*FRS[j+2];
    }
}

function drift(h) {
    [i1, i2] = [Math.floor((nr*N)/numGob), Math.floor(((nr+1)*N)/numGob)];
    for(let i=i1*6; i<i2*6; i+=6 ) {
        PTS[i] += h*PTS[i+3];
        PTS[i+1] += h*PTS[i+4];
        PTS[i+2] += h*PTS[i+5];
    }
}

function leapFrog(h) {
    const h2 = h/2;
    //getForces(); // previous last kick doesn't change forces
    kick(h2);
    drift(h);
    getForces();
    kick(h2);
}

function Yoshida(h) {
    const w1 = 1.3512071919596578*h;
    //getForces(); // previous last kick doesn't change forces
    kick(w1/2);
    drift(w1);
    getForces();
    kick(w1/2);
    const w2 = -1.7024143839193155*h;
    //getForces();
    kick(w2/2);
    drift(w2);
    getForces();
    kick(w2/2);
    //getForces();
    kick(w1/2);
    drift(w1);
    getForces();
    kick(w1/2);
}

function Euler(h) {
    getForces();
    drift(h);
    kick(h);
}

function mainHandler(e) {
    N = e.data[1];
    N6 = 6*N;
    if( e.data[0] == 'FORCE' ) {
        getForces();
    } else if ( e.data[0] == 'KICK' ) {
        kick(0.5*h0);
    } else if ( e.data[0] == '2KICK' ) {
        kick(h0);
    }  else if ( e.data[0] == 'DRIFT' ) {
        drift(h0);
    } else if ( e.data[0] == 'KICK1' ) {
        kick(0.5*w1);
    } else if ( e.data[0] == 'DRIFT1' ) {
        drift(w1);
    } else if ( e.data[0] == 'KICK2' ) {
        kick(0.5*w2);
    } else if ( e.data[0] == 'DRIFT2' ) {
        drift(w2);
    }
    self.postMessage('DONE');
}

self.onmessage = (e) => {
    nr = e.data.nr;
    numGob = e.data.nG;
    width2 = e.data.width/2;
    PTS = new Float64Array(e.data.buffoP);
    FRS = new Float64Array(e.data.buffoF);
    subFRS = new Float64Array(e.data.subF);
    console.log(`goblin `, nr, 'ready');
    self.onmessage = mainHandler;
};
