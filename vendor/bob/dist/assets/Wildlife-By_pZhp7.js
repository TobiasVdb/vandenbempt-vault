import{i as e,l as t}from"./GLTF-C1q4NWke.js";import{E as n,O as r,T as i,h as a,n as o,o as s}from"./Frame-Wjgqo5vC.js";import{S as c,d as l,m as u,u as d,v as f}from"./GeoKit-DH6Z-fpG.js";import{i as p,t as m}from"./Spray-B0MGTGXc.js";import{C as h,E as g,T as _,g as v,i as y}from"./Noise-C8_YOlCO.js";import{n as b}from"./Texture-C_UVBP8u.js";import"./Globals-D2L9LwLa.js";import{F as x,S,_ as C,a as w,b as T,c as E,d as D,f as O,g as k,h as A,i as ee,l as j,m as M,n as te,o as N,p as P,r as F,s as I,t as ne,u as L,v as re,x as R,y as z}from"./index-B4jO2NpI.js";var ie=16,B=e=>{let t=String(+e.toFixed(6));return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},V=(e,t,n)=>`vec3f( ${B(e**2.2)}, ${B(t**2.2)}, ${B(n**2.2)} )`,ae=class{constructor({csm:e=null,capacity:t=160}={}){let n=R.map(e=>S(e)),r=n[0].count;this.NV=r;let a=new Float32Array(R.length*r*16);n.forEach((e,t)=>{for(let n=0;n<r;n++){let i=(t*r+n)*16;a.set(e.A.subarray(n*4,n*4+4),i),a.set(e.B.subarray(n*4,n*4+4),i+4),a.set(e.C.subarray(n*4,n*4+4),i+8),a.set(e.D.subarray(n*4,n*4+4),i+12)}}),this.speciesBuffer=new b({label:`birdSpecies`,count:R.length*r*4,type:`vec4f`,data:a});let o=[];R.forEach((e,t)=>{let r=n[t].joints;o.push(new i(...r.S,e.legs.r)),o.push(new i(...r.E,0)),o.push(new i(...r.W,0)),o.push(new i(...e.pivot,0)),o.push(new i(0,e.tail.y,e.tail.z,0)),o.push(new i(...e.legs.hip,0)),o.push(new i(0,e.eye[1],e.eye[0],e.eye[2])),o.push(new i)}),this.joints=o,this.built=n;let s=new h,c=new Float32Array(r*3),l=new Float32Array(r*3);for(let e=0;e<r;e++)c.set(n[0].C.subarray(e*4,e*4+3),e*3),l.set([0,1,0],e*3);s.setAttribute(`position`,new _(c,3)),s.setAttribute(`normal`,new _(l,3)),s.setIndex(n[0].index),this.records=new j(`birdInstances`,t,ie),this.material=this.createMaterial(),this.mesh=M(`Birds`,s,this.material,this.records,{csm:e,castShadow:!0}),this.triangles=n[0].index.length/3}begin(){this.records.begin()}write(e){let t=this.records.push();if(t<0)return;let n=this.records.data,r=(e,r,i)=>{let a=t+e*4;n[a]=r[0],n[a+1]=r[1],n[a+2]=r[2],n[a+3]=i===void 0?r[3]:i};r(0,e.pos,e.scale),r(1,e.q),r(2,e.QA),r(3,e.QB),r(4,e.QC),r(5,e.qH),r(6,e.headOff,e.fold),r(7,e.kneeL,e.tailPitch),r(8,e.footL,e.tailSpread),r(9,e.kneeR,e.species),r(10,e.footR,e.seed),r(11,e.pPos,e.pScale),r(12,e.pQ),r(13,e.pQA),r(14,e.pQB),r(15,e.pQC)}commit(){this.records.commit()}get count(){return this.records.count}createMaterial(){let e=this.records,n=this.NV,r=t=>e.field(t);return new t({name:`Birds`,roughness:.72,metalness:0,underwaterLighting:`none`,modules:[A],uniforms:{birdJoints:[`vec4f[${this.joints.length}]`,this.joints]},storage:{birdInstances:e.buffer,birdSpecies:this.speciesBuffer},varyings:{vBirdRest:`vec3f`,vBirdRestN:`vec3f`,vBirdInfo:`vec4f`,vBirdFold:`f32`},vertex:`
	let r0 = ${r(0)}; let q = ${r(1)}; let QA = ${r(2)}; let QB = ${r(3)}; let QC = ${r(4)};
	let qH = ${r(5)}; let r6 = ${r(6)}; let r7 = ${r(7)}; let r8 = ${r(8)}; let r9 = ${r(9)}; let r10 = ${r(10)};
	let p11 = ${r(11)}; let pq = ${r(12)}; let pQA = ${r(13)}; let pQB = ${r(14)}; let pQC = ${r(15)};
	let si = u32( r9.w + 0.5 );
	let base = ( si * ${n}u + v.vertex ) * 4u;
	let A = birdSpecies[ base ]; let B = birdSpecies[ base + 1u ];
	let C = birdSpecies[ base + 2u ]; let D = birdSpecies[ base + 3u ];
	let jb = si * 8u;
	let part = A.w;
	let fold = r6.w;

	var pl = vec3f( 0.0 ); var pp = vec3f( 0.0 ); var nl = vec3f( 0.0, 1.0, 0.0 );

	if ( part < 3.5 ) {

		// body, neck, head and bill: the head bone turns about the neck pivot
		let piv = mat.birdJoints[ jb + 3u ].xyz;
		let hp = piv + r6.xyz + rotateQ( qH, A.xyz - piv );
		let w = select( 0.0, B.w, part < 2.5 );
		pl = mix( hp, A.xyz, w );
		nl = mix( rotateQ( qH, B.xyz ), B.xyz, w );
		pp = pl;

	} else if ( part < 4.5 ) {

		// tail: spread about the centre line, pitched about the tail base
		let T = mat.birdJoints[ jb + 4u ].xyz;
		let d = ( A.xyz - T ) * vec3f( r8.w, 1.0, 1.0 );
		let c = cos( r7.w ); let s = sin( r7.w );
		pl = T + vec3f( d.x, d.y * c + d.z * s, d.z * c - d.y * s );
		nl = vec3f( B.x, B.y * c + B.z * s, B.z * c - B.y * s );
		pp = pl;

	} else if ( part < 7.5 ) {

		// wings: three bones, mirrored for the right wing, blended at the joints, and morphed
		// into the folded shape
		let side = sign( A.x );
		let mir = vec4f( 1.0, side, side, 1.0 );
		let sx = vec3f( side, 1.0, 1.0 );
		let S = mat.birdJoints[ jb ].xyz * sx; let E = mat.birdJoints[ jb + 1u ].xyz * sx; let Wj = mat.birdJoints[ jb + 2u ].xyz * sx;
		let seg = part - 5.0;
		// current pose (with normals)
		{
			let a = QA * mir; let b = QB * mir; let c = QC * mir;
			let Ep = S + rotateQ( a, E - S );
			let Wp = Ep + rotateQ( b, Wj - E );
			let pa = S + rotateQ( a, A.xyz - S );
			let pb = Ep + rotateQ( b, A.xyz - E );
			let pc = Wp + rotateQ( c, A.xyz - Wj );
			let p = select( select( mix( pc, pb, B.w ), mix( pb, pa, B.w ), seg < 1.5 ), pa, seg < 0.5 );
			let na = rotateQ( a, B.xyz ); let nb = rotateQ( b, B.xyz ); let nc = rotateQ( c, B.xyz );
			let n = select( select( mix( nc, nb, B.w ), mix( nb, na, B.w ), seg < 1.5 ), na, seg < 0.5 );
			pl = mix( p, C.xyz, fold );
			nl = mix( n, D.xyz, fold );
		}
		// previous pose
		{
			let a = pQA * mir; let b = pQB * mir; let c = pQC * mir;
			let Ep = S + rotateQ( a, E - S );
			let Wp = Ep + rotateQ( b, Wj - E );
			let pa = S + rotateQ( a, A.xyz - S );
			let pb = Ep + rotateQ( b, A.xyz - E );
			let pc = Wp + rotateQ( c, A.xyz - Wj );
			let p = select( select( mix( pc, pb, B.w ), mix( pb, pa, B.w ), seg < 1.5 ), pa, seg < 0.5 );
			pp = mix( p, C.xyz, fold );
		}

	} else {

		// legs: tube hip -> knee -> ankle, the foot at the ankle
		let side = A.x; let seg = A.y;
		let hip = mat.birdJoints[ jb + 5u ].xyz * vec3f( side, 1.0, 1.0 );
		let left = side > 0.0;
		let knee = select( r9.xyz, r7.xyz, left );
		let foot = select( r10.xyz, r8.xyz, left );
		let c = select( select( foot, knee, seg < 1.5 ), hip, seg < 0.5 );
		let d0 = select( select( foot - knee, foot - hip, seg < 1.5 ), knee - hip, seg < 0.5 );
		let dir = d0 / max( length( d0 ), 1e-5 );
		let ax = normalize( cross( dir, vec3f( 1.0, 0.0, 0.001 ) ) );
		let ay = cross( dir, ax );
		let radial = ax * B.x + ay * B.y;
		// collapsed legs (tucked in flight) vanish: the radius follows the leg's length
		let r = mat.birdJoints[ jb ].w * B.z * smoothstep( 0.0, 0.01, length( knee - hip ) + length( foot - knee ) );
		let ring = c + radial * r;
		let isFoot = seg > 2.5;
		pl = select( ring, foot + C.xyz * smoothstep( 0.0, 0.01, length( foot - knee ) ), isFoot );
		nl = select( radial, vec3f( 0.0, 1.0, 0.0 ), isFoot );
		pp = pl;

	}

	o.vBirdRest = select( A.xyz, C.xyz, part > 7.5 );
	o.vBirdRestN = B.xyz;
	o.vBirdInfo = vec4f( part, C.w, D.w, r9.w + fract( r10.w ) * 0.9 );
	o.vBirdFold = fold;

	let world = r0.xyz + rotateQ( q, pl * r0.w );
	let prev = p11.xyz + rotateQ( pq, pp * p11.w );
	v.useWorld = true;
	v.worldPos = world;
	v.worldNormal = rotateQ( q, nl );
	v.prevWorldPos = prev;
`,surface:`
	let vInfo = in.vs.vBirdInfo;
	let part = floor( vInfo.x + 0.5 );
	let u = vInfo.y; let v = abs( vInfo.z );
	let species = floor( vInfo.w ); let seed = fract( vInfo.w ) / 0.9;
	let P = in.vs.vBirdRest; let N = in.vs.vBirdRestN;
	let fold = in.vs.vBirdFold;
	let isBody = part < 2.5; let isBill = part == 3.0; let isTail = part == 4.0;
	let isWing = part > 4.5 && part < 7.5; let isLeg = part > 7.5;
	let top = N.y > 0.0;
	var c = vec3f( 0.5 );
	var rough = 0.72;
	var trans = select( 0.0, 0.35, isWing || isTail );
	// feather texture: fine noise in the rest frame (scaled to the bird's size)
	let fnz = mx_noise_float3( P * 160.0 );

	if ( species == 0.0 ) {

		// laughing gull: slate mantle and upperwing, black primaries with a white trailing
		// edge, white body and tail; breeding birds have a black hood, winter birds a grey smudge
		let white = ${V(.93,.93,.92)}; let slate = ${V(.38,.4,.43)}; let black = ${V(.05,.05,.055)};
		let hooded = seed < 0.5;
		let mantle = smoothstep( 0.1, 0.45, N.y ) * smoothstep( -0.1, -0.07, P.z ) * smoothstep( 0.1, 0.075, P.z );
		let head = smoothstep( 0.1, 0.115, P.z );
		let eyeArc = smoothstep( 0.006, 0.004, length( vec2f( P.z - 0.139, P.y - 0.037 ) ) ) * smoothstep( 0.002, 0.004, length( vec2f( P.z - 0.141, P.y - 0.032 ) ) );
		let hood = select( head * smoothstep( 0.012, 0.004, length( vec2f( P.z - 0.126, P.y - 0.03 ) ) ) * 0.45, head * ( 1.0 - eyeArc ), hooded );
		let body = mix( mix( white, slate, mantle ), select( ${V(.45,.45,.47)}, black, hooded ), hood );
		let tipK = smoothstep( 0.68, 0.76, u );
		let edge = smoothstep( 0.9, 0.97, v ) * ( 1.0 - tipK ) * ( 1.0 - fold );
		let wingTop = mix( mix( slate, white, edge ), black, tipK );
		let wingBot = mix( mix( white, ${V(.72,.73,.75)}, smoothstep( 0.3, 0.9, u ) * 0.6 ), black, smoothstep( 0.78, 0.9, u ) );
		c = select( select( body, white, isTail ), select( wingBot, wingTop, top ), isWing );
		c = select( c, select( ${V(.12,.08,.08)}, ${V(.42,.07,.07)}, hooded ), isBill );
		c = select( c, ${V(.16,.07,.07)}, isLeg );

	} else if ( species == 1.0 ) {

		// royal tern: pale grey mantle and upperwing with a dusky primary wedge, white body,
		// shaggy black crest behind a white forehead, orange bill, black legs
		let white = ${V(.95,.95,.94)}; let grey = ${V(.74,.77,.8)};
		let mantle = smoothstep( 0.15, 0.5, N.y ) * smoothstep( -0.095, -0.07, P.z ) * smoothstep( 0.1, 0.075, P.z );
		let cap = smoothstep( 0.108, 0.12, P.z ) * smoothstep( 0.158, 0.145, P.z ) * smoothstep( 0.028, 0.033, P.y );
		let body = mix( mix( white, grey, mantle ), ${V(.04,.04,.045)}, cap );
		let wedge = smoothstep( 0.66, 0.8, u ) * ( smoothstep( 0.2, 0.0, v ) * 0.5 + 0.5 );
		let wingTop = mix( grey, ${V(.32,.33,.35)}, wedge );
		let wingBot = mix( white, ${V(.55,.56,.58)}, smoothstep( 0.82, 0.95, u ) * smoothstep( 0.4, 1.0, v ) );
		c = select( select( body, mix( white, grey, 0.3 ), isTail ), select( wingBot, wingTop, top ), isWing );
		c = select( c, ${V(.95,.45,.1)}, isBill );
		c = select( c, ${V(.05,.05,.05)}, isLeg );

	} else if ( species == 2.0 ) {

		// brown pelican: silvery grey-brown back, dark belly, cream-white head and neck
		// (chestnut hind neck in breeding birds), dark flight feathers, grey bill, dark pouch
		let back = mix( ${V(.44,.42,.38)}, ${V(.68,.67,.63)}, smoothstep( 0.0, 0.6, fnz ) * smoothstep( 0.0, 0.6, N.y ) );
		let belly = ${V(.24,.22,.2)};
		let neckZone = smoothstep( 0.12, 0.17, P.z );
		let head = mix( ${V(.92,.9,.82)}, ${V(.95,.86,.55)}, smoothstep( 0.27, 0.3, P.z ) * smoothstep( 0.13, 0.15, P.y ) );
		let hindNeck = select( ${V(.9,.88,.82)}, ${V(.28,.14,.09)}, seed < 0.4 );
		let neckCol = mix( hindNeck, head, smoothstep( 0.2, 0.235, P.z ) );
		let body = mix( mix( belly, back, smoothstep( -0.35, 0.25, N.y ) ), mix( neckCol, head, smoothstep( 0.22, 0.25, P.z ) ), neckZone );
		let flight = max( smoothstep( 0.52, 0.6, u ), smoothstep( 0.45, 0.62, v ) * ( 1.0 - fold ) );
		let wingTop = mix( mix( ${V(.56,.55,.51)}, ${V(.72,.71,.67)}, ( fnz * 0.5 + 0.5 ) * 0.6 ), ${V(.1,.09,.085)}, flight );
		let wingBot = mix( ${V(.2,.19,.18)}, ${V(.45,.44,.42)}, smoothstep( 0.2, 0.35, v ) * smoothstep( 0.6, 0.4, v ) * smoothstep( 0.6, 0.3, u ) );
		c = select( select( body, ${V(.2,.19,.18)}, isTail ), select( wingBot, wingTop, top ), isWing );
		let pouch = smoothstep( 0.3, 0.38, v ) * smoothstep( 0.7, 0.62, v );
		c = select( c, mix( mix( ${V(.58,.54,.5)}, ${V(.75,.55,.45)}, smoothstep( 0.6, 1.0, u ) ), ${V(.22,.21,.2)}, pouch ), isBill );
		c = select( c, ${V(.12,.12,.12)}, isLeg );
		trans *= 0.5;

	} else if ( species == 3.0 ) {

		// magnificent frigatebird: black with a faint gloss; females a white breast and a
		// brown bar on the upperwing, juveniles a white head and breast; males a red throat
		let black = ${V(.035,.035,.04)};
		let female = seed < 0.45; let juvenile = seed > 0.85;
		let breast = smoothstep( 0.2, -0.3, N.y ) * smoothstep( -0.06, 0.0, P.z ) * smoothstep( 0.14, 0.1, P.z );
		let headW = smoothstep( 0.13, 0.16, P.z );
		let white = ${V(.9,.9,.88)};
		let body = mix( black, white, select( select( 0.0, breast, female ), max( breast, headW ), juvenile ) );
		let throat = smoothstep( 0.13, 0.16, P.z ) * smoothstep( 0.0, -0.5, N.y ) * select( 1.0, 0.0, female || juvenile );
		let bar = smoothstep( 0.08, 0.14, u ) * smoothstep( 0.45, 0.38, u ) * smoothstep( 0.12, 0.22, v ) * smoothstep( 0.5, 0.4, v ) * select( 0.4, 1.0, female || juvenile );
		let wingTop = mix( black, ${V(.32,.25,.18)}, bar );
		c = select( select( mix( body, ${V(.55,.06,.05)}, throat ), black, isTail ), select( black, wingTop, top ), isWing );
		c = select( c, ${V(.5,.52,.56)}, isBill );
		c = select( c, ${V(.35,.28,.28)}, isLeg );
		rough = 0.55;
		trans *= 0.3;

	} else {

		// sanderling (winter): pale grey above with dark feather centres, white below, dark
		// shoulder and primaries, bold white wing bar, black bill and legs
		let white = ${V(.95,.95,.94)}; let grey = mix( ${V(.62,.62,.6)}, ${V(.48,.48,.47)}, smoothstep( 0.2, 0.7, fnz ) );
		let upper = smoothstep( -0.05, 0.35, N.y ) * max( smoothstep( 0.092, 0.08, P.z ), smoothstep( 0.2, 0.6, N.y ) );
		let body = mix( white, grey, upper );
		let bar = smoothstep( 0.18, 0.26, u ) * smoothstep( 0.78, 0.7, u ) * smoothstep( 0.42, 0.48, v ) * smoothstep( 0.66, 0.6, v ) * ( 1.0 - fold );
		let shoulder = smoothstep( 0.2, 0.3, u ) * smoothstep( 0.55, 0.45, u ) * smoothstep( 0.3, 0.1, v );
		let wingTop = mix( mix( mix( grey, ${V(.12,.12,.12)}, smoothstep( 0.62, 0.72, u ) ), white, bar ), ${V(.1,.1,.1)}, shoulder * 0.8 );
		c = select( select( body, mix( grey, ${V(.2,.2,.2)}, smoothstep( 0.25, 0.0, abs( u - 0.5 ) ) ), isTail ), select( white, wingTop, top ), isWing );
		c = select( c, ${V(.04,.04,.04)}, isBill || isLeg );

	}

	// eye: dark, with a pale iris for pelicans
	let eye = mat.birdJoints[ u32( species ) * 8u + 6u ];
	let ed = length( vec2f( P.z - eye.z, P.y - eye.y ) );
	let onHead = part < 2.5 && abs( P.x ) > 0.004;
	let iris = smoothstep( eye.w, eye.w * 0.8, ed ) * select( 0.0, 1.0, onHead );
	let pupil = smoothstep( eye.w * 0.6, eye.w * 0.45, ed ) * select( 0.0, 1.0, onHead );
	c = mix( mix( c, select( ${V(.05,.03,.02)}, ${V(.8,.75,.55)}, species == 2.0 ), iris ), ${V(.01,.01,.01)}, pupil );
	rough = mix( select( rough, 0.4, isBill || isLeg ), 0.15, iris );
	// fine feather texture, darker feather bases toward the trailing edge of the wings
	c *= ( fnz * 0.06 + 1.0 ) * select( 1.0, mix( 1.0, 0.92, smoothstep( 0.5, 1.0, v ) * ( 1.0 - fold ) ), isWing );
	s.albedo = c;
	s.roughness = rough;
	// light through the thin wing and tail feathers when they are between the sun and the eye
	let back = sat( - dot( in.N, frame.sunDir ) );
	s.translucency = c * trans * ( back * 0.8 + 0.2 );
`})}},oe=c.pier.deckHeight+.95+.0445,H=new n,U=new n,W={[T.GULL]:7,[T.PELICAN]:5.5,[T.TERN]:9},se=class{constructor({terrain:e,village:t,colliders:n,boat:i,boatModel:a,water:o,spray:s,seed:c=11}){this.terrain=e,this.boat=i,this.boatModel=a,this.water=o,this.spray=s,this.rng=y(c),this.time=0,this.agents=[],this.perches=this.buildPerches(t,n),this.wind=new r;let l=this.rng,u=(e,t,n)=>{let r={kind:e,f:new ne(t,l(),y(Math.floor(l()*1e9))),state:`fly`,t:0,perch:null,id:this.agents.length,hy:0,hp:0,hyT:0,hpT:0,headT:0,visible:!0};return n(r),this.agents.push(r),r},d=this.perches.filter(e=>e.kinds.includes(`gull`)&&e.kind!==`sand`);for(let e=0;e<7;e++)u(`gull`,T.GULL,t=>this.settle(t,d[Math.floor(e*d.length/7)]));let f=this.perches.filter(e=>e.kind===`sand`);for(let e=0;e<4&&e<f.length;e++)u(`gull`,T.GULL,t=>this.settle(t,f[e]));for(let e=0;e<4;e++)u(`gull`,T.GULL,e=>this.startRoam(e,-60+l()*200,10+l()*25,-40+l()*100));for(let e=0;e<4;e++)u(`tern`,T.TERN,t=>{t.lane={x0:-150+e*30,x1:120+e*25,z:-10+e*18+l()*10,y:8+l()*4},t.f.place(k(t.lane.x0,t.lane.x1,l()),t.lane.y,t.lane.z,l()<.5?Math.PI/2:-Math.PI/2),t.state=`patrol`,t.t=4+l()*8});this.squad=[],this.squadPath=this.buildSquadPath(),this.squadS=l()*this.squadPath.length;for(let e=0;e<5;e++)this.squad.push(u(`pelican`,T.PELICAN,t=>{t.state=`line`,t.slot=e}));this.squadFlap=3;for(let e=0;e<2;e++)u(`pelican`,T.PELICAN,t=>this.startForage(t,20+e*60,35+e*20));let p=this.perches.filter(e=>e.kinds.includes(`pelican`)&&!e.bird);for(let e=0;e<2&&e<p.length;e++)u(`pelican`,T.PELICAN,t=>this.settle(t,p[e]));for(let e of[[-70,-170,120],[90,-260,160],[170,-110,95],[10,40,75],[-160,-60,135]])u(`frigate`,T.FRIGATE,t=>{t.state=`soar`,t.home={x:e[0],z:e[1]},t.circle={x:e[0],y:e[2],z:e[1],r:35+l()*35,dir:l()<.5?-1:1,t:l()*100},t.f.windK=.6;let n=l()*L;t.f.place(e[0]+Math.cos(n)*40,e[2],e[1]+Math.sin(n)*40,n)});for(let e of this.agents)e.f.P.fresh=!0}registerRegion({id:e,perches:t,water:n}){for(let[r,i]of t.entries()){let t=r%3==2&&n?`pelican`:`gull`,a=t===`pelican`?T.PELICAN:T.GULL,o={...i,region:e,kind:`rail`,kinds:[t],bird:null,yawJitter:this.rng()-.5};this.perches.push(o);let s=new ne(a,this.rng(),y(this.agents.length*977+11));s.place(i.x,i.y+N(s.sp),i.z,0);let c={kind:t,f:s,state:`fly`,t:0,perch:null,id:this.agents.length,hy:0,hp:0,hyT:0,hpT:0,headT:0,visible:!0,region:e,home:i,water:i.water||n};this.settle(c,o),this.agents.push(c)}}buildPerches(e,t){let r=[],i=this.rng,a=(e,t,n,a,o,s={})=>r.push({x:e,y:t,z:n,kind:a,kinds:o,bird:null,yawJitter:(i()-.5)*.8,...s});if(t){let e=t.boxes.filter(e=>e.tag===`pierRail`),n=[];for(let t of e){let e=t.half.z>t.half.x,r=(e?t.half.z:t.half.x)*2;for(let i=0;i<Math.max(1,Math.floor(r/3));i++){let o=(i+.5)/Math.max(1,Math.floor(r/3))-.5,s=t.center.x+(e?0:o*r),l=t.center.z+(e?o*r:0);n.some(e=>Math.hypot(e[0]-s,e[1]-l)<6.5)||(n.push([s,l]),a(s,oe,l,`rail`,l>c.pier.zEnd-c.pier.headDepth-1?[`gull`,`pelican`]:[`gull`]))}}}if(e&&e.buildings)for(let t of e.buildings)t.stilts&&t.roofTop&&a(t.x,t.roofTop-.13,t.z,`roof`,[`gull`]);this.boat&&this.boatModel&&this.boatModel.dimensions&&a(0,0,0,`boat`,[`gull`],{local:new n(-.5,this.boatModel.dimensions.houseRoofHeight,.15)});let o=this.terrain;for(let e of[-38,-31,-35,-27,118,124]){let t=e+(i()-.5)*2,n=-60;for(;n<-20&&!(o.heightAt(t,n)<1.05);n+=.25);n-=1.2+i()*2.5,a(t,o.heightAt(t,n),n,`sand`,[`gull`])}return r}perchPosition(e,t){if(e.kind===`boat`){let n=this.boatModel.group;return n.updateMatrixWorld(),t.copy(e.local).applyMatrix4(n.matrixWorld)}return t.set(e.x,e.y,e.z)}settle(e,t){if(!t){this.startRoam(e,0,20,0);return}e.state=`perched`,e.perch=t,t.bird=e,e.t=20+this.rng()*120,e.fold=1,e.perchYaw=this.windYaw()+t.yawJitter,e.shuffle=0,e.stretch=0,e.f.P.fresh=!0}unperch(e){e.perch&&(e.perch.bird=null),e.perch=null}startRoam(e,t,n,r){e.state=`fly`,e.goal={x:t,y:n,z:r},e.t=10+this.rng()*20,e.f.P.fresh&&e.f.place(t,n,r,this.rng()*L)}startForage(e,t,n){e.state=`forage`,e.center={x:t,z:n,y:11+this.rng()*5,r:25+this.rng()*20,dir:this.rng()<.5?1:-1},e.t=15+this.rng()*25,e.f.P.fresh&&e.f.place(t+e.center.r,e.center.y,n,0)}takeOff(e,t,n){let r=e.f,i=r.P,a=Math.atan2(t,n),o=this.windYaw(),s=a+P(D(o,a),-.9,.9);if(r.x=i.pos[0],r.y=i.pos[1],r.z=i.pos[2],r.yaw=s,r.speed=r.cfg.minSpeed*.55,r.vy=1.6,r.bank=0,r.pitch=.5,r.flap=1,r.phase=.2,r.fold=e.fold,r.legs=1,e.state=`takeoff`,e.region&&r.y>35&&e.water){let t=e.home.clearPoint||{x:r.x+Math.sin(s)*55,y:r.y+4,z:r.z+Math.cos(s)*55};r.yaw=Math.atan2(t.x-r.x,t.z-r.z),e.descend={x:t.x,y:t.y,z:t.z,clear:!0}}e.t=0,this.unperch(e)}windYaw(){return Math.atan2(-this.wind.x,-this.wind.y)}update(e,t,n,r){this.time+=e,this.lastViewer=t,this.wind.set(o.windDir.value.x,o.windDir.value.y).multiplyScalar(o.windSpeed.value);let i=1-o.night.value;this.updateSquad(e);for(let n of this.agents)if(!(n.region&&Math.hypot(n.f.x-r.position.x,n.f.y-r.position.y,n.f.z-r.position.z)>1e3)){if(n.descend&&n.state!==`takeoff`){let t=n.descend;this.flyTo(n,e,t.x,t.y,t.z,n.f.cfg.speed,.3),t.clear&&Math.hypot(n.f.x-t.x,n.f.z-t.z)<15?n.descend={...n.water,y:12,clear:!1}:!t.clear&&n.f.y<20&&(n.descend=null,n.kind===`pelican`?this.startForage(n,t.x,t.z):this.startRoam(n,t.x,10,t.z));continue}switch(n.kind){case`gull`:this.updateGull(n,e,t,i);break;case`tern`:this.updateTern(n,e,t);break;case`pelican`:this.updatePelican(n,e,t);break;case`frigate`:this.updateFrigate(n,e)}}let a=r.position;for(let e of this.agents){if(!e.visible)continue;let t=e.f.P,r=Math.hypot(t.pos[0]-a.x,t.pos[1]-a.y,t.pos[2]-a.z),i=e.kind===`frigate`?1400:e.kind===`pelican`?800:550;if(r>i)continue;let o=e.f.scale0||(e.f.scale0=t.scale);t.scale=o*z(i,i*.8,r),n.write(t),t.scale=o}}threat(e,t,n,r){return e?Math.hypot(e.x-t,(e.y-n)*.7,e.z-r)-e.speed*.6:1e9}idleHead(e,t,n=0,r=1.1){e.headT-=t,e.headT<=0&&(e.headT=.4+this.rng()*2.2,e.hyT=(this.rng()-.5)*2*r,e.hpT=n+(this.rng()-.5)*.3),e.hy+=(e.hyT-e.hy)*O(14,t),e.hp+=(e.hpT-e.hp)*O(14,t)}perchedPose(e,t){let n=e.f,r=n.P,i=n.sp;r.fresh?F(r):I(r);let a=this.perchPosition(e.perch,H),o=this.windYaw()+e.perch.yawJitter,s=D(o,e.perchYaw);e.shuffle=Math.max(0,e.shuffle-t),Math.abs(s)>.5&&e.shuffle<=0&&(e.shuffle=.6);let c=0,l=0;e.shuffle>0&&(e.perchYaw+=s*O(5,t),c=e.shuffle*18,l=i.legs.toe*.8);let u=n.species===T.PELICAN,d=e.perch.kind===`boat`?this.boatYaw():0,f=N(i)*(u?.92:1);te(r,a.x,a.y,a.z,e.perchYaw+d,u?.12:.24,f,c,l,i.legs.toe*.3),this.idleHead(e,t,u?.75:-.12,u?.6:1.2);let p=i.length;ee(r,e.hy,e.hp,0,(u?-.02:.03)*p,(u?-.04:.01)*p),e.stretch=Math.max(0,e.stretch-t),e.stretch<=0&&this.rng()<t/90&&(e.stretch=1.6);let m=Math.sin(Math.PI*P(e.stretch/1.6,0,1));e.fold=Math.min(1,e.fold+t*2.5),r.fold=e.fold*(1-m*.85),w(r,.2+m*.9,-.2*m,.1,.5-m*.3,.6-m*.4,.1),r.tailPitch=.12,r.tailSpread=.9,n.x=r.pos[0],n.y=r.pos[1],n.z=r.pos[2]}lobsterBusy(e){let t=this.boat;return t.model===this.boatModel&&(t.driven||t.speed>e)}boatYaw(){let e=this.boatModel.group.quaternion;return Math.atan2(2*(e.w*e.y+e.x*e.z),1-2*(e.y*e.y+e.x*e.x))}takeoffStep(e,t,n){let r=e.f;e.t+=t,r.fold=Math.max(0,1-e.t/.18),r.legs=Math.max(0,1-e.t/.7),r.extraPitch=.35*Math.max(0,1-e.t/.9);let i=Math.sin(r.yaw),a=Math.cos(r.yaw);r.steer(t,r.x+i*30,r.y+6,r.z+a*30,r.cfg.speed,2,.2,this.wind),r.animate(t),e.t>1.1&&(r.extraPitch=0,r.legs=0,r.fold=0,n())}beginLanding(e,t){let n=e.f,r=this.perchPosition(t,U),i=N(n.sp)*(n.species===T.PELICAN?.92:1),a=Math.hypot(r.x-n.x,r.y+i-n.y,r.z-n.z),o=P(a/Math.max(4,n.speed)*1.7,1.2,4);e.land={x0:n.x,y0:n.y,z0:n.z,vx:n.vx,vy:n.vy,vz:n.vz,T:o,h:i},e.state=`land`,e.t=0,e.perch=t,t.bird=e}landStep(e,t){let n=e.f,r=e.land;e.t+=t;let i=Math.min(1,e.t/r.T),a=this.perchPosition(e.perch,U),o=a.x,s=a.y+r.h,c=a.z,l=2*i*i*i-3*i*i+1,u=i*i*i-2*i*i+i,d=-2*i*i*i+3*i*i,f=i*i*i-i*i,p=6*i*i-6*i,m=3*i*i-4*i+1,h=-6*i*i+6*i,g=3*i*i-2*i,_=r.T,v=(o-r.x0)*.05,y=(c-r.z0)*.05;n.x=l*r.x0+u*_*r.vx+d*o+f*_*v,n.y=l*r.y0+u*_*r.vy+d*s+f*_*.2,n.z=l*r.z0+u*_*r.vz+d*c+f*_*y;let b=(p*r.x0+m*_*r.vx+h*o+g*_*v)/_,x=(p*r.y0+m*_*r.vy+h*s+g*_*.2)/_,S=(p*r.z0+m*_*r.vz+h*c+g*_*y)/_,C=Math.hypot(b,S);if(C>.3){let e=Math.atan2(b,S),r=D(e,n.yaw);n.bank+=(P(r/Math.max(t,.001)*C/9.81,-.6,.6)-n.bank)*O(6,t),n.yaw=e}if(n.vx=b,n.vy=x,n.vz=S,n.speed=Math.hypot(C,x),n.gamma=Math.atan2(x,Math.max(C,.1)),n.flare=z(.45,.9,i),n.legs=z(.3,.75,i),n.flapWant=i>.55?.6:.15,n.animate(t),i>=1){let t=e.perch;e.state=`perched`,e.t=25+this.rng()*120,e.fold=0,e.stretch=.8,e.perchYaw=n.yaw,n.flare=0,n.legs=0,t.bird=e}}updateGull(e,t,n,r){let i=e.f;switch(e.state){case`perched`:{this.perchedPose(e,t);let a=i.P,o=this.threat(n,a.pos[0],a.pos[1],a.pos[2]),s=W[T.GULL]*(e.perch.kind===`sand`?1.6:1),c=e.perch.kind===`boat`&&this.lobsterBusy(.8);e.t-=t*r,o<s||c?(e.alarm=(e.alarm||0)+t,e.alarm>.15+e.id%5*.07&&this.takeOff(e,a.pos[0]-(n?n.x:a.pos[0]),a.pos[2]-(n?n.z:a.pos[2]+1))):e.t<=0?this.takeOff(e,Math.sin(e.perchYaw),Math.cos(e.perchYaw)):e.alarm=0;break}case`takeoff`:this.takeoffStep(e,t,()=>{e.state=`fly`,e.t=12+this.rng()*25,e.goal={x:i.x+Math.sin(i.yaw)*60,y:i.y+8+this.rng()*10,z:i.z+Math.cos(i.yaw)*60}});break;case`fly`:{e.t-=t;let a=e.goal;if(Math.hypot(a.x-i.x,a.z-i.z)<12||e.t<=0){let t=this.rng();if(t<.3||r<.3){let t=this.pickPerch(e,n,r<.3);if(t){e.state=`approach`,e.perch=t,t.bird=e;break}}if(t<.6){e.state=`circle`,e.circle={x:i.x+(this.rng()-.5)*30,z:i.z+(this.rng()-.5)*30,r:14+this.rng()*14,dir:this.rng()<.5?-1:1,y:i.y},e.t=10+this.rng()*20;break}this.newGullGoal(e)}this.flyTo(e,t,a.x,a.y,a.z,i.cfg.speed,1);break}case`circle`:{e.t-=t;let n=e.circle;n.x+=this.wind.x*.25*t,n.z+=this.wind.y*.25*t,n.y=Math.min(n.y+t*.5,45);let r=Math.atan2(i.z-n.z,i.x-n.x)+n.dir*.6;this.flyTo(e,t,n.x+Math.cos(r)*n.r,n.y,n.z+Math.sin(r)*n.r,i.cfg.speed*.9,0,1.6),e.t<=0&&(e.state=`fly`,e.t=15+this.rng()*20,this.newGullGoal(e));break}case`approach`:{let r=this.perchPosition(e.perch,H),a=-this.wind.x,o=-this.wind.y,s=Math.hypot(a,o)||1,c=r.x-a/s*16,l=r.z-o/s*16,u=Math.hypot(c-i.x,l-i.z);if(this.threat(n,r.x,r.y,r.z)<W[T.GULL]*2.5||e.perch.kind===`boat`&&this.lobsterBusy(1/0)){this.unperch(e),e.state=`fly`,this.newGullGoal(e);break}u<5?this.beginLanding(e,e.perch):this.flyTo(e,t,c,r.y+2.5,l,i.cfg.speed*.85,1);break}case`land`:this.landStep(e,t)}}newGullGoal(e,t=this.lastViewer){if(e.region){let t=this.rng,n=e.water||e.home;e.goal={x:n.x+(t()-.5)*90,y:Math.max(8,this.terrain.heightAt(n.x,n.z)+10)+t()*12,z:n.z+(t()-.5)*90},e.t=20+t()*20;return}let n=this.rng,r=n();e.goal=t&&r<.35?{x:t.x+(n()-.5)*70,y:7+n()*12,z:Math.max(t.z+(n()-.5)*50,-75)}:r<.6?{x:-120+n()*280,y:4+n()*5,z:-38+n()*12}:{x:-150+n()*380,y:8+n()*30,z:-70+n()*190},e.t=20+n()*20}pickPerch(e,t,n){let r=null,i=-1/0;for(let a of this.perches){if(a.bird||!a.kinds.includes(e.kind)||e.region&&a.region!==e.region||a.kind===`boat`&&this.lobsterBusy(.5))continue;let o=this.perchPosition(a,H);if(this.threat(t,o.x,o.y,o.z)<18)continue;let s=-Math.hypot(o.x-e.f.x,o.z-e.f.z)*.01+this.rng()*2+(n&&a.kind!==`sand`?1:0);s>i&&(i=s,r=a)}return r}flyTo(e,t,n,r,i,a,o,s=1){let c=e.f,l=c.x+c.vx*2,u=c.z+c.vz*2,d=Math.max(this.terrain.heightAt(l,u),this.terrain.heightAt(c.x,c.z),0),f=d+(d>.5?6:2);c.steer(t,n,Math.max(r,f),i,a,o,s,this.wind),c.y<f-1.5&&(c.y+=(f-1.5-c.y)*O(3,t)),c.animate(t)}updateTern(e,t,n){let r=e.f,i=e.lane,a=this.water.height(e,r.x,r.z);switch(e.state){case`patrol`:e.t-=t,r.x>i.x1?e.dir=-1:r.x<i.x0&&(e.dir=1),e.dir=e.dir||1,r.headPitch+=(.7-r.headPitch)*O(3,t),this.flyTo(e,t,r.x+e.dir*40,i.y+Math.sin(this.time*.4+e.id)*1.5,i.z+Math.sin(this.time*.13+e.id*2)*12,r.cfg.speed,1,.8),e.t<=0&&(e.state=`hover`,e.t=1.5+this.rng()*2.5);break;case`hover`:{e.t-=t,r.hover+=(1-r.hover)*O(4,t);let n=this.windYaw(),i=Math.max(this.wind.length(),3),a=r.x+Math.sin(n)*10,o=r.z+Math.cos(n)*10;r.windK=1,r.steer(t,a,r.y,o,i*.95,1,1.5,this.wind),r.x-=r.vx*t*.85,r.z-=r.vz*t*.85,r.flapWant=.7,r.headPitch+=(1.1-r.headPitch)*O(5,t),r.animate(t),e.t<=0&&(r.windK=.35,this.rng()<.45?(e.state=`dive`,e.t=0):(e.state=`patrol`,e.t=5+this.rng()*10,r.hover=0));break}case`dive`:e.t+=t,r.hover=Math.max(0,r.hover-t*4),r.dive+=(1-r.dive)*O(6,t),r.flapWant=0,r.speed=Math.min(14,r.speed+15*t),r.vy=-r.speed*.85,r.gamma=-1.1,r.x+=Math.sin(r.yaw)*r.speed*.3*t,r.z+=Math.cos(r.yaw)*r.speed*.3*t,r.y+=r.vy*t,r.animate(t),r.y<a+.05&&(this.splash(r.x,a,r.z,.35),e.state=`under`,e.t=.35+this.rng()*.3,e.visible=!1);break;case`under`:e.t-=t,r.y=a-.3,e.t<=0&&(e.visible=!0,r.P.fresh=!0,r.dive=0,r.y=a+.05,r.speed=4,r.vy=2.5,r.pitch=.6,r.flap=1.2,this.splash(r.x,a,r.z,.15),e.state=`patrol`,e.t=6+this.rng()*10)}}splash(e,t,n,r){if(!this.spray)return;let i=this.spray;H.set(e,t+.05,n),i.emit(H,U.set(0,3.5*Math.sqrt(r),0),Math.round(110*r),.03+.02*r,m.DROPLET,{spread:1.6+r*1.5,jitter:.12+.3*r,life:1.3}),i.emit(H,U.set(0,2.2*Math.sqrt(r),0),Math.round(35*r),.08+.1*r,m.SPRAY,{spread:.9+r,jitter:.15+.3*r,life:1.1}),i.emit(H,U.set(0,.2,0),Math.round(18*r)+2,.12+.25*r,m.FOAM,{spread:.5+.6*r,jitter:.1+.4*r,life:3}),r>.5&&i.emit(H,U.set(0,.8,0),10,.35,m.MIST,{spread:.6,jitter:.5,life:2.2})}buildSquadPath(){let e=[],t=e=>5.8*Math.exp(-(((e-c.pier.x)/11)**2)),r=(n,r,i,a,o)=>{for(let s=0;s<=o;s++){let c=k(n,r,s/o);e.push([c,i+Math.sin(s*.9)*3,a+(i<45?t(c):0)])}};r(-210,230,16,1.1,30);for(let t=1;t<8;t++){let n=-Math.PI/2+t/8*Math.PI;e.push([230+Math.cos(n)*50,66+Math.sin(n)*50,1.1+t*.6])}r(230,-210,116,5,22);for(let t=1;t<8;t++){let n=Math.PI/2+t/8*Math.PI;e.push([-210+Math.cos(n)*50,66+Math.sin(n)*50,5-t*.55])}let i=new a(e.map(e=>new n(e[0],e[2],e[1])),!0,`centripetal`);return{curve:i,length:i.getLength(),pt:new n,tan:new n}}updateSquad(e){let t=this.squadPath;this.squadS=(this.squadS+11*e)%t.length,this.squadFlap-=e,this.squadFlap<=0&&(this.squadFlap=5+this.rng()*7,this.squadBeat=this.time,this.squadBeats=3+Math.floor(this.rng()*4))}squadMember(e,t){let n=this.squadPath,r=e.f,i=2.9+e.slot%2*.4,a=(this.squadS-e.slot*i+n.length)%n.length;n.curve.getPointAt(a/n.length,n.pt),n.curve.getTangentAt(a/n.length,n.tan);let o=(e.slot%2?1:-1)*Math.min(e.slot,1)*.9,s=n.tan.x,c=n.tan.z,l=Math.hypot(s,c)||1,u=n.pt.x-c/l*o,d=n.pt.z+s/l*o,f=this.water.height(e,u,d),p=Math.max(f,0)*.8+n.pt.y+Math.sin(this.time*.7+e.slot)*.15;r.P.fresh&&r.place(u,p,d,Math.atan2(s,c));let m=(u-r.x)/Math.max(t,1e-4),h=(d-r.z)/Math.max(t,1e-4),g=(p-r.y)/Math.max(t,1e-4),_=Math.atan2(s,c),v=D(_,r.yaw)/Math.max(t,1e-4);r.bank+=(P(v*11/9.81,-.5,.5)-r.bank)*O(3,t),r.yaw=_,r.x=u,r.y=p,r.z=d,r.vx=m,r.vz=h,r.vy=P(g,-3,3),r.gamma=Math.atan2(r.vy,11);let y=this.time-(this.squadBeat??-1e3)-e.slot*.38,b=this.squadBeats||0;r.flapWant=y>0&&y<b/r.cfg.freq?.8:0,y>0&&y<.1&&(r.phase=0),r.animate(t)}updatePelican(e,t,n){let r=e.f;switch(e.state){case`line`:this.squadMember(e,t);break;case`perched`:{this.perchedPose(e,t);let i=r.P,a=this.threat(n,i.pos[0],i.pos[1],i.pos[2]);e.t-=t,a<W[T.PELICAN]?(e.alarm=(e.alarm||0)+t,e.alarm>.3&&this.takeOff(e,i.pos[0]-n.x,i.pos[2]-n.z)):e.alarm=0,e.t<=0&&e.state===`perched`&&this.takeOff(e,Math.sin(e.perchYaw),Math.cos(e.perchYaw));break}case`takeoff`:this.takeoffStep(e,t,()=>this.startForage(e,r.x+Math.sin(r.yaw)*40,r.z+Math.cos(r.yaw)*40));break;case`forage`:{e.t-=t;let i=e.center,a=Math.atan2(r.z-i.z,r.x-i.x)+i.dir*.5;if(r.headPitch+=(.35-r.headPitch)*O(2,t),this.flyTo(e,t,i.x+Math.cos(a)*i.r,i.y,i.z+Math.sin(a)*i.r,r.cfg.speed*.9,1,1.2),e.t<=0){if(this.rng()<.6)e.state=`dive`,e.t=0,e.twist=this.rng()<.5?-1:1;else{let t=this.pickPerch(e,n,!1);t?(e.state=`approach`,e.perch=t,t.bird=e):e.region&&e.water?this.startForage(e,e.water.x,e.water.z):this.startForage(e,-60+this.rng()*200,10+this.rng()*70)}}break}case`dive`:{e.t+=t;let n=this.water.height(e,r.x,r.z);r.dive+=(1-r.dive)*O(3.5,t),r.flapWant=0,r.speed=Math.min(17,r.speed+12*t),r.vy=-r.speed*Math.min(.9,.3+e.t*1.2),r.gamma=Math.asin(P(r.vy/r.speed,-.95,0));let i=Math.max(r.speed*Math.cos(r.gamma),0);r.x+=Math.sin(r.yaw)*i*t,r.z+=Math.cos(r.yaw)*i*t,r.y+=r.vy*t,r.twirl=e.twist*z(3.5,1,r.y-n)*1.9,r.animate(t),r.y<n+.3&&(this.splash(r.x,n,r.z,1),e.state=`float`,e.t=0,e.floatYaw=r.yaw,r.twirl=0,r.dive=0,r.P.fresh=!0);break}case`float`:{e.t+=t;let i=r.P;i.fresh?F(i):I(i);let a=this.water.height(e,r.x,r.z);r.y+=(a+.02-r.y)*O(6,t),e.floatYaw+=D(this.windYaw(),e.floatYaw)*O(.3,t),r.yaw=e.floatYaw,re(i.q,r.yaw,.08+Math.sin(this.time*1.3+e.id)*.04,Math.sin(this.time*.9+e.id)*.05),i.pos[0]=r.x,i.pos[1]=r.y,i.pos[2]=r.z;let o=e.t<3?1.1:e.t<4.5?-.9:.55;e.hp+=(o-e.hp)*O(3,t),ee(i,0,e.hp,0,-.02,-.03),i.fold=1,w(i,.2,0,.1,.5,.6,.1),E(i),i.tailPitch=-.1,i.tailSpread=.9;let s=this.threat(n,r.x,r.y,r.z);(e.t>10+e.id%4*3||s<9)&&(e.state=`watertakeoff`,e.t=0,r.yaw=this.windYaw()+(this.rng()-.5)*.6,r.speed=1,r.vy=0,r.pitch=.3,r.fold=1,r.flap=.8,r.phase=.3);break}case`watertakeoff`:{e.t+=t;let n=this.water.height(e,r.x,r.z);r.fold=Math.max(0,1-e.t/.3),r.speed=Math.min(11,r.speed+t*4),r.legs=+(e.t<2),r.flapWant=1.25,r.x+=Math.sin(r.yaw)*r.speed*t,r.z+=Math.cos(r.yaw)*r.speed*t,r.vx=Math.sin(r.yaw)*r.speed,r.vz=Math.cos(r.yaw)*r.speed;let i=z(1.4,2.6,e.t);r.vy=i*1.2,r.y=Math.max(r.y+r.vy*t,n+.12),r.gamma=.1*i,r.extraPitch=.25*(1-i);let a=r.phase;r.animate(t),i<.9&&r.phase<a&&this.splash(r.x,n,r.z,.12),e.t>3&&(r.extraPitch=0,r.legs=0,this.startForage(e,r.x+Math.sin(r.yaw)*50,r.z+Math.cos(r.yaw)*50));break}case`approach`:{let i=this.perchPosition(e.perch,H),a=-this.wind.x,o=-this.wind.y,s=Math.hypot(a,o)||1,c=i.x-a/s*22,l=i.z-o/s*22;if(this.threat(n,i.x,i.y,i.z)<12){this.unperch(e),this.startForage(e,r.x,r.z);break}Math.hypot(c-r.x,l-r.z)<6?this.beginLanding(e,e.perch):this.flyTo(e,t,c,i.y+3,l,r.cfg.speed*.85,1);break}case`land`:this.landStep(e,t)}}updateFrigate(e,t){let n=e.f,r=e.circle;r.t+=t,r.x+=(this.wind.x*.3+(e.home.x-r.x)*.01)*t,r.z+=(this.wind.y*.3+(e.home.z-r.z)*.01)*t;let i=r.y+Math.sin(r.t*.05)*20,a=Math.atan2(n.z-r.z,n.x-r.x)+r.dir*.45;n.headYaw+=(r.dir*.25-n.headYaw)*O(1,t),this.flyTo(e,t,r.x+Math.cos(a)*r.r,i,r.z+Math.sin(a)*r.r,n.cfg.speed,+(n.y<i-25),1.4)}},G={GHOST:0,HERMIT:1,BURROW:2},K=(e,t)=>Math.sign(e)*Math.abs(e)**+t;function ce(e,t){let n=e*Math.PI*2,r=Math.cos(n),i=Math.sin(n),a=t*Math.PI,o=Math.sin(a)**.55,s=Math.cos(a),c=.43*K(r,.35)*o,l=.5*K(i,.35)*o*(1-.12*Math.max(0,-r));return c>0&&(c*=1-.05*(1-Math.abs(i))),[l,(s>0?.2*K(s,.6):.1*K(s,.8))+.02*Math.cos(n)*o,c]}function le(e,t){let n=e*Math.PI*2,r=fe(ue,t),i=fe(de,t),a=i*Math.sin(n),o=i*Math.cos(n),s=.66,c=Math.cos(s),l=Math.sin(s);return[a,.74-r*l+o*c,.05+r*c+o*l]}var ue=[[0,-.9],[.15,-.7],[.35,-.42],[.55,-.12],[.72,.12],[.86,.32],[.95,.46],[1,.5]],de=[[0,0],[.15,.2],[.35,.42],[.55,.62],[.72,.72],[.86,.66],[.95,.44],[1,.18]],fe=(e,t)=>{if(t<=e[0][0])return e[0][1];for(let n=1;n<e.length;n++)if(t<=e[n][0]){let r=e[n-1],i=e[n],a=(t-r[0])/(i[0]-r[0]);return r[1]+(i[1]-r[1])*(a*a*(3-2*a))}return e[e.length-1][1]};function pe(e,t){let n=e*Math.PI*2,r=1+1.4*Math.max(0,Math.cos(n))**2,i=t<.34?.5*t/.34:.5+(t-.34)/.66*1.6*r,a=Math.exp(-(((t-.4)/.1)**2))*.2,o=t>.34?.12*Math.sin(Math.PI*(t-.34)/.66)*(r-.6):0,s=t<.34?-.05+.2*(t/.34)**2:a+o;return[i*Math.sin(n),Math.max(s,0)*.9+.01,i*Math.cos(n)]}var me=[ce,le,pe];function he(e){let t=[],n=(e,n,r,a)=>{let o=[.62,.2,-.18,-.6][n],s=e>0?o:Math.PI-o;t.push(new i(e*.44,.06,.2-n*.14,s),new i(r[0],r[1],r[2],a))};if(e===0){for(let e of[1,-1])for(let t=0;t<4;t++)n(e,t,[.58-t*.02,.28,.55-Math.abs(t-1.5)*.05],.045);t.push(new i(.22,.05,.38,1.25),new i(.3,.22,.34,.07)),t.push(new i(-.22,.05,.38,Math.PI-1.25),new i(.26,.18,.27,.055)),t.push(new i(.36,.17,.4,1.35),new i(.2,.18,0,.05)),t.push(new i(-.36,.17,.4,Math.PI-1.35),new i(.2,.18,0,.05))}else if(e===1){for(let e of[1,-1])for(let t=0;t<4;t++)n(e,t,t<2?[.36,.22,.34]:[0,0,0],.06);for(let e=0;e<8;e+=2)t[e].z+=.32;t.push(new i(.14,.12,.62,1.35),new i(.18,.14,.34,.1)),t.push(new i(-.14,.12,.6,Math.PI-1.35),new i(.14,.1,.2,.065)),t.push(new i(.08,.3,.66,1.45),new i(.18,.1,0,.035)),t.push(new i(-.08,.3,.66,Math.PI-1.45),new i(.18,.1,0,.035))}else for(let e=0;e<12;e++)t.push(new i,new i);return t}function ge(){let e=[],t=me.length,n=new Float32Array(t*110*8),r=(e,t)=>e*12+t%12;for(let t=0;t<8;t++)for(let n=0;n<12;n++)e.push(r(t,n),r(t+1,n),r(t,n+1),r(t,n+1),r(t+1,n),r(t+1,n+1));for(let t=0;t<12;t++)e.push(108,r(0,t),r(0,t+1)),e.push(109,r(8,t+1),r(8,t));for(let i=0;i<t;i++){let t=me[i],a=new Float32Array(330),o=new Float32Array(110);for(let e=0;e<9;e++){let n=(e+1)/10;for(let i=0;i<12;i++)a.set(t(i/12,n),r(e,i)*3),o[r(e,i)]=n}a.set(t(0,0),324),a.set(t(0,1),327),o[108]=0,o[109]=1;let s=new h;s.setAttribute(`position`,new _(a,3)),s.setIndex(e.slice()),s.computeVertexNormals();let c=s.attributes.normal.array;for(let e=0;e<110;e++){let t=e<108?e%12/12:0;n.set([a[e*3],a[e*3+1],a[e*3+2],t,c[e*3],c[e*3+1],c[e*3+2],o[e]],(i*110+e)*8)}}let i=[],a=[],o=110;for(let e=0;e<110;e++)i.push(-1,0,0,0),a.push(0,0);let s=(e,t,n,r,s,c)=>(i.push(e,t,n,r),a.push(s,c),o++);for(let t=0;t<12;t++){let n=t===8||t===9,r=t>=10,i=n?[[0,0,1],[1,0,1],[2,0,1.6],[2,.45,2.1],[2,1,.9]]:r?[[0,0,1],[1,0,.8],[1,.5,1.6],[1,1,1.3]]:[[0,0,1.15],[1,0,1],[2,0,.8]],a=o;for(let[e,n,r]of i)for(let i=0;i<4;i++){let a=i/4*Math.PI*2+Math.PI/4;s(t,e,n,r,Math.cos(a),Math.sin(a))}let c=s(t,r?1:2,n?1.18:r?1.12:1,0,0,0),l=i.length;for(let t=0;t<l-1;t++)for(let n=0;n<4;n++){let r=a+t*4+n,i=a+t*4+(n+1)%4;e.push(r,r+4,i,i,r+4,i+4)}for(let t=0;t<4;t++)e.push(a+(l-1)*4+t,c,a+(l-1)*4+(t+1)%4)}let c=new h,l=new Float32Array(o*3),u=new Float32Array(o*3);for(let e=0;e<o;e++)u[e*3+1]=1;c.setAttribute(`position`,new _(l,3)),c.setAttribute(`normal`,new _(u,3)),c.setAttribute(`aLimb`,new g(i,4)),c.setAttribute(`aRing`,new g(a,2)),c.setIndex(e);let d=[];for(let e=0;e<t;e++)d.push(...he(e));return{geometry:c,bodyData:n,limbs:d,species:t,vertices:o,triangles:e.length/3}}var _e=6,q=e=>{let t=String(+e.toFixed(6));return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},J=(e,t,n)=>`vec3f( ${q(e**2.2)}, ${q(t**2.2)}, ${q(n**2.2)} )`,ve=[0,Math.PI,0,Math.PI,Math.PI,0,Math.PI,0],ye=class{constructor({capacity:e=160}={}){let t=ge();this.template=t,this.bodyBuffer=new b({label:`critterBodies`,count:t.bodyData.length/4,type:`vec4f`,data:t.bodyData}),this.limbs=t.limbs,this.records=new j(`critterInstances`,e,_e),this.material=this.createMaterial(),this.mesh=M(`Critters`,t.geometry,this.material,this.records,{castShadow:!1}),this.triangles=t.triangles}begin(){this.records.begin()}write(e){let t=this.records.push();if(t<0)return;let n=this.records.data;n[t]=e.x,n[t+1]=e.y,n[t+2]=e.z,n[t+3]=e.scale,n[t+4]=e.q[0],n[t+5]=e.q[1],n[t+6]=e.q[2],n[t+7]=e.q[3],n[t+8]=e.species,n[t+9]=e.phase,n[t+10]=e.stride,n[t+11]=e.lift,n[t+12]=e.out,n[t+13]=e.eyes,n[t+14]=e.claws,n[t+15]=e.seed,n[t+16]=e.px,n[t+17]=e.py,n[t+18]=e.pz,n[t+19]=e.pPhase,n[t+20]=e.pq[0],n[t+21]=e.pq[1],n[t+22]=e.pq[2],n[t+23]=e.pq[3]}commit(){this.records.commit()}get count(){return this.records.count}createMaterial(){let e=this.records,n=t=>e.field(t),r=ve.map(e=>new i(e,0,0,0)),a=new s({name:`critterJoints`,deps:[A],code:`
struct CritterJoints { j0: vec3f, j1: vec3f, j2: vec3f, j3: vec3f, r: f32 };

fn critterDir( az: f32, el: f32 ) -> vec3f { return vec3f( cos( az ) * cos( el ), sin( el ), sin( az ) * cos( el ) ); }

fn critterJoints( si: u32, k: u32, ph: f32, stride: f32, lift: f32, outK: f32, eyes: f32, claws: f32 ) -> CritterJoints {
	let a = mat.critterLimbs[ si * 24u + k * 2u ];
	let L = mat.critterLimbs[ si * 24u + k * 2u + 1u ];
	let kf = f32( k );
	let isLeg = kf < 7.5; let isClaw = kf > 7.5 && kf < 9.5;
	let side = select( -1.0, 1.0, a.x > 0.0 );
	let p = ph + mat.critterGait[ min( k, 7u ) ].x;
	let swing = max( sin( p ), 0.0 ) * stride;
	let az = a.w + cos( p ) * stride * 0.28 * select( 0.0, 1.0, isLeg );
	let j0 = vec3f( a.x, a.y + lift, a.z );
	var j1 = vec3f( 0.0 ); var j2 = vec3f( 0.0 ); var j3 = vec3f( 0.0 );
	if ( isLeg ) {
		// merus up and out, carpus level, dactyl reaching down to the ground
		j1 = j0 + critterDir( az, 0.62 + swing * 0.22 ) * L.x;
		j2 = j1 + critterDir( az, -0.15 + swing * 0.15 ) * L.y;
		let e3 = asin( clamp( - j2.y / max( L.z, 1e-4 ), -0.99, -0.25 ) ) + swing * 0.25;
		j3 = j2 + critterDir( az, e3 ) * L.z;
	} else if ( isClaw ) {
		// chelipeds folded in front of the mouth, lifted when feeding / threatening
		let inward = side * 0.95;
		j1 = j0 + critterDir( az, -0.35 + claws * 0.5 ) * L.x;
		j2 = j1 + critterDir( az + inward, 0.25 + claws * 0.6 ) * L.y;
		j3 = j2 + critterDir( az + inward * 1.55, -0.25 + claws * 0.4 ) * L.z;
	} else {
		// eyestalks: up when alert, folded along the front edge when running for the burrow
		let el = mix( 0.05, 1.3, eyes );
		j1 = j0 + critterDir( az, el * 0.8 ) * L.x;
		j2 = j1 + critterDir( az, el ) * L.y;
		j3 = j2;
	}
	// hermit crabs pull everything back into the aperture
	let hole = vec3f( 0.0, lift + 0.32, 0.5 );
	let isHermit = si == ${G.HERMIT}u;
	let k2 = select( 1.0, outK, isHermit );
	var J: CritterJoints;
	J.j0 = mix( hole, j0, k2 ); J.j1 = mix( hole, j1, k2 ); J.j2 = mix( hole, j2, k2 ); J.j3 = mix( hole, j3, k2 );
	J.r = L.w * select( 1.0, outK * 0.7 + 0.3, isHermit );
	return J;
}

// a vertex of limb k at ( segment, t, radius ) around the segment; returns position (xyz) and
// writes the normal
fn critterLimbVertex( J: CritterJoints, seg: f32, t: f32, rs: f32, ring: vec2f, n: ptr<function, vec3f> ) -> vec3f {
	let a = select( select( J.j2, J.j1, seg < 1.5 ), J.j0, seg < 0.5 );
	let b = select( select( J.j3, J.j2, seg < 1.5 ), J.j1, seg < 0.5 );
	let d0 = b - a;
	let d = d0 / max( length( d0 ), 1e-5 );
	let rf = select( vec3f( 0.0, 1.0, 0.0 ), vec3f( 1.0, 0.0, 0.0 ), abs( d.y ) > 0.9 );
	let ax = normalize( cross( d, rf ) );
	let ay = cross( ax, d );
	let radial = ax * ring.x + ay * ring.y;
	*n = normalize( radial + d * select( 0.0, 1.0, rs < 0.01 ) );
	return mix( a, b, t ) + radial * ( J.r * rs );
}
`});return new t({name:`Critters`,roughness:.6,metalness:0,underwaterLighting:`none`,modules:[A,a],uniforms:{critterLimbs:[`vec4f[${this.limbs.length}]`,this.limbs],critterGait:[`vec4f[8]`,r]},storage:{critterInstances:e.buffer,critterBodies:this.bodyBuffer},attributes:{aLimb:`vec4f`,aRing:`vec2f`},varyings:{vCritInfo:`vec4f`,vCritLocal:`vec3f`},vertex:`
	let r0 = ${n(0)}; let q = ${n(1)}; let r2 = ${n(2)}; let r3 = ${n(3)}; let p4 = ${n(4)}; let pq = ${n(5)};
	let si = u32( r2.x + 0.5 );
	let lift = r2.w; let outK = r3.x;
	var pl = vec3f( 0.0 ); var pp = vec3f( 0.0 ); var nl = vec3f( 0.0, 1.0, 0.0 );
	var info = vec4f( 0.0 );
	let k = v.aLimb.x;

	if ( k < 0.0 ) {

		// body grid: carapace / shell (lifted on the legs) or the burrow mound
		let base = ( si * 110u + v.vertex ) * 2u;
		let A = critterBodies[ base ]; let B = critterBodies[ base + 1u ];
		let up = select( lift, 0.0, si == ${G.BURROW}u );
		pl = A.xyz + vec3f( 0.0, up, 0.0 );
		nl = B.xyz;
		pp = pl;
		info = vec4f( 0.0, A.w, B.w, 0.0 );

	} else {

		let ki = u32( k );
		let J = critterJoints( si, ki, r2.y, r2.z, lift, outK, r3.y, r3.z );
		var n = vec3f( 0.0 );
		pl = critterLimbVertex( J, v.aLimb.y, v.aLimb.z, v.aLimb.w, v.aRing, &n );
		nl = n;
		let Jp = critterJoints( si, ki, p4.w, r2.z, lift, outK, r3.y, r3.z );
		var np = vec3f( 0.0 );
		pp = critterLimbVertex( Jp, v.aLimb.y, v.aLimb.z, v.aLimb.w, v.aRing, &np );
		let part = select( select( 3.0, 2.0, k < 9.5 ), 1.0, k < 7.5 );
		info = vec4f( part, v.aLimb.y + v.aLimb.z, v.aLimb.w, 0.0 );

	}

	// ghost crabs sink into their burrow (the sand hides what is below)
	let sink = select( 0.0, ( 1.0 - outK ) * 1.3, si == ${G.GHOST}u );
	pl.y -= sink;
	pp.y -= sink;
	o.vCritLocal = pl;
	o.vCritInfo = vec4f( info.xyz, r2.x + fract( r3.w ) * 0.9 );
	let world = r0.xyz + rotateQ( q, pl * r0.w );
	let prev = p4.xyz + rotateQ( pq, pp * r0.w );
	v.useWorld = true;
	v.worldPos = world;
	v.worldNormal = rotateQ( q, nl );
	v.prevWorldPos = prev;
`,surface:`
	let vInfo = in.vs.vCritInfo;
	let part = floor( vInfo.x + 0.5 );
	let u = vInfo.y; let v = vInfo.z;
	let species = floor( vInfo.w ); let seed = fract( vInfo.w ) / 0.9;
	let P = in.vs.vCritLocal;
	let n = mx_noise_float3( P * 14.0 + seed * 17.0 );
	var c = vec3f( 0.5 );
	var rough = 0.6;

	if ( species == ${q(G.GHOST)} ) {

		// ghost crab: pale straw carapace with fine granules, whitish legs and claws, black
		// club-shaped eyes on the stalks
		let straw = mix( ${J(.8,.73,.58)}, ${J(.88,.83,.7)}, n * 0.5 + 0.5 );
		let body = straw * mix( 0.86, 1.04, smoothstep( 0.0, 0.18, P.y ) );
		let legs = mix( ${J(.86,.82,.72)}, ${J(.7,.62,.5)}, smoothstep( 0.8, 1.0, fract( u ) ) * 0.5 );
		let claw = mix( ${J(.9,.87,.8)}, ${J(.78,.7,.75)}, smoothstep( 1.6, 2.3, u ) );
		let eye = mix( ${J(.8,.75,.62)}, ${J(.04,.04,.045)}, smoothstep( 1.25, 1.4, u ) );
		c = select( select( select( eye, claw, part == 2.0 ), legs, part == 1.0 ), body, part == 0.0 );
		rough = select( 0.55, 0.15, part == 3.0 && u > 1.3 );

	} else if ( species == ${q(G.HERMIT)} ) {

		// hermit crab: turban shell (banded / mottled / chequered by seed), red-orange legs
		// with pale tips, a purple claw; the aperture shows the crab's dark body
		let turns = u + v * 3.2; // spiral: sutures along u + v * turns
		let suture = smoothstep( 0.9, 0.97, fract( turns ) ) * smoothstep( 0.05, 0.3, v );
		let kind = floor( fract( seed * 3.7 ) * 3.0 );
		let c1 = select( select( ${J(.85,.8,.7)}, ${J(.72,.42,.2)}, kind == 1.0 ), ${J(.9,.86,.78)}, kind == 0.0 );
		let c2 = select( select( ${J(.55,.35,.22)}, ${J(.35,.18,.08)}, kind == 1.0 ), ${J(.12,.11,.1)}, kind == 0.0 );
		let bands = select(
			smoothstep( 0.2, 0.8, sin( v * 31.0 + n * 2.0 ) ),
			smoothstep( 0.3, 0.7, sin( u * ${q(43.9824)} + sin( v * 40.0 ) * 1.5 ) ), // zigzag
			kind == 0.0 );
		let shellC = mix( c1, c2, bands * 0.8 ) * ( 1.0 - suture * 0.5 ) * ( n * 0.12 + 0.94 );
		let aperture = smoothstep( 0.86, 0.93, v );
		let body = mix( shellC, ${J(.35,.12,.08)}, aperture );
		let legs = mix( ${J(.72,.28,.12)}, ${J(.9,.78,.6)}, smoothstep( 2.6, 3.0, u ) );
		let claw = mix( ${J(.42,.14,.4)}, ${J(.85,.5,.2)}, smoothstep( 2.5, 3.1, u ) );
		c = select( select( select( ${J(.1,.08,.06)}, claw, part == 2.0 ), legs, part == 1.0 ), body, part == 0.0 );
		rough = select( 0.5, 0.45, part == 0.0 );

	} else {

		// burrow: dark shaft, damp dug-out sand around the lip, loose clumps fanned out; the
		// rim fades into the beach
		let dry = ${J(.86,.79,.64)} * ( n * 0.1 + 0.95 );
		let damp = ${J(.66,.58,.45)};
		let clumps = smoothstep( 0.35, 0.55, mx_noise_float3( P * 38.0 + seed * 5.0 ) );
		let sand = mix( mix( damp, dry, smoothstep( 0.4, 0.75, v ) ), dry * 1.06, clumps * 0.5 );
		let hole = smoothstep( 0.36, 0.2, v );
		c = mix( sand, ${J(.035,.03,.025)}, hole );
		rough = 0.9;
		// dithered fade at the outer edge (resolved by the temporal filter)
		let fade = smoothstep( 1.0, 0.72, v );
		let noise = interleavedGradientNoise( in.pixel + fract( frame.time * 7.13 ) * 97.0 );
		if ( noise > fade ) { discard; }

	}

	s.albedo = c;
	s.roughness = rough;
`})}},Y=36,X=34,be=32,xe=14,Z=12,Se=class{constructor({terrain:e,village:t=null,colliders:n=null,vegetation:r=null,seed:i=5}){this.terrain=e,this.rng=y(i),this.burrows=this.placeBurrows(t,n),this.homes=this.placeHomes(r,n),this.grid=new Map,this.burrows.forEach((e,t)=>this.cell(e.x,e.z).push(t)),this.ghosts=[],this.hermits=[],this.time=0,this.scan=0,this.nearBurrows=[],this._rec={x:0,y:0,z:0,scale:1,q:[0,0,0,1],species:0,phase:0,stride:0,lift:0,out:1,eyes:1,claws:0,seed:0,px:0,py:0,pz:0,pPhase:0,pq:[0,0,0,1]}}cell(e,t){let n=Math.floor(e/Z)*4096+Math.floor(t/Z),r=this.grid.get(n);return r||this.grid.set(n,r=[]),r}okGround(e,t,n,r){let i=this.terrain;if(n&&n.groundHeightAt(e,t,100)>-1/0)return!1;if(r&&r.getFootprints){for(let n of r.getFootprints())if(Math.hypot(n.x-e,n.z-t)<n.r)return!1}let a=.8,o=i.heightAt(e+a,t)-i.heightAt(e-a,t),s=i.heightAt(e,t+a)-i.heightAt(e,t-a);return Math.hypot(o,s)/(2*a)<.22}sandAt(e,t){let n=this.terrain,r=Math.floor((e-n.origin)/n.texel),i=Math.floor((t-n.origin)/n.texel);return r<0||i<0||r>=n.res||i>=n.res?0:n.sand[i*n.res+r]/255}placeBurrows(e,t){let n=this.terrain,r=this.rng,i=[],a=c.beach;for(let o=a.xMin+4;o<a.xMax-4;o+=1.7)for(let a=-110;a<-40;a+=1.7){let s=o+(r()-.5)*1.6,l=a+(r()-.5)*1.6,u=n.heightAt(s,l);if(u<1||u>4.5||this.sandAt(s,l)<.75||Math.abs(s-c.pier.x)<4.5)continue;let d=.16*z(1,1.4,u)*(1-.6*z(2.5,4.5,u));r()>d||this.okGround(s,l,t,e)&&(i.some(e=>Math.abs(e.x-s)<2.2&&Math.abs(e.z-l)<2.2)||i.push({x:s,z:l,y:u,yaw:r()*L,seed:r(),size:.85+r()*.35,resident:r()<.75,crab:null,hideT:r()*30}))}return i}placeHomes(e,t){let n=this.rng,r=[],i=c.beach,a=e&&e.records?e.records.palms:[];for(let e of a){if(e.x<i.xMin||e.x>i.xMax||e.z<-130||e.z>-50||e.y<1||e.y>9||n()>.55)continue;let a=n()*L,o=.8+n()*2.2,s=e.x+Math.cos(a)*o,c=e.z+Math.sin(a)*o;this.okGround(s,c,t,null)&&r.push({x:s,z:c,seed:n(),crab:null})}for(let e=0;e<40&&r.length<60;e++){let e=i.xMin+10+n()*(i.xMax-i.xMin-20),a=-100;for(;a<-45&&!(this.terrain.heightAt(e,a)<3.2);a+=1);Math.abs(e-c.pier.x)<5||!this.okGround(e,a-2,t,null)||r.push({x:e,z:a-2-n()*4,seed:n(),crab:null})}return r}update(e,t,n,r,i=null){this.time+=e;let a=r.position,s=o.night.value,c=o.sunDir.value.y;this.activity=P(.45+.5*Math.max(s,z(.35,.05,c)),0,.95),this.scan-=e,this.scan<=0&&(this.scan=.25,this.assign(a));for(let n of this.ghosts)this.updateGhost(n,e,t);for(let n of this.hermits)this.updateHermit(n,e,t);let l=this._rec;for(let e of this.nearBurrows){let t=Math.hypot(e.x-a.x,e.z-a.z);t>X||(this.burrowRecord(e,l,z(X,X*.75,t)),n.write(l))}for(let e of this.ghosts)if(e.visible){if(this.crabRecord(e,l,a),l.scale<=0)continue;n.write(l),i&&i.add(e.x,e.y,e.z,l.scale*.75,l.scale*(e.lift+.12),z(.35,.8,e.out),e.sx,e.sz)}for(let e of this.hermits)this.crabRecord(e,l,a),!(l.scale<=0)&&(n.write(l),i&&i.add(e.x,e.y,e.z,l.scale*.8,l.scale*.45,.9,e.sx,e.sz))}assign(e){let t=this.nearBurrows;t.length=0;let n=Math.ceil(Y/Z),r=Math.floor(e.x/Z),i=Math.floor(e.z/Z);for(let a=r-n;a<=r+n;a++)for(let r=i-n;r<=i+n;r++){let n=this.grid.get(a*4096+r);if(n)for(let r of n){let n=this.burrows[r];Math.hypot(n.x-e.x,n.z-e.z)<Y&&t.push(n)}}for(let t=this.ghosts.length-1;t>=0;t--){let n=this.ghosts[t];Math.hypot(n.home.x-e.x,n.home.z-e.z)>40&&(n.home.crab=null,this.ghosts.splice(t,1))}t.sort((t,n)=>Math.hypot(t.x-e.x,t.z-e.z)-Math.hypot(n.x-e.x,n.z-e.z));for(let n of t){if(this.ghosts.length>=be)break;!n.crab&&n.resident&&(n.crab=this.spawnGhost(n,Math.hypot(n.x-e.x,n.z-e.z)),this.ghosts.push(n.crab))}for(let t=this.hermits.length-1;t>=0;t--){let n=this.hermits[t];Math.hypot(n.home.x-e.x,n.home.z-e.z)>32.8&&(n.home.crab=null,this.hermits.splice(t,1))}for(let t of this.homes){if(this.hermits.length>=xe)break;t.crab||Math.hypot(t.x-e.x,t.z-e.z)>Y*.8||(t.crab=this.spawnHermit(t),this.hermits.push(t.crab))}}newCrab(e,t,n){return{species:e,home:t,seed:n,x:t.x,z:t.z,y:0,yaw:this.rng()*L,bodyYaw:0,speed:0,vx:0,vz:0,phase:this.rng()*L,pPhase:0,stride:0,lift:.3,out:1,eyes:1,claws:0,state:`idle`,t:1,tx:t.x,tz:t.z,want:0,q:[0,0,0,1],pq:[0,0,0,1],px:0,py:0,pz:0,fresh:!0,visible:!0,fade:0,alarm:0,feed:0,size:e===G.GHOST?(.034+n*.022)*t.size:.028+n*.016}}spawnGhost(e,t){let n=this.newCrab(G.GHOST,e,e.seed);if(this.rng()<this.activity&&t>12){let t=this.rng()*L,r=.5+this.rng()*4;n.x=e.x+Math.cos(t)*r,n.z=e.z+Math.sin(t)*r,n.state=`idle`,n.t=.5+this.rng()*3}else n.state=`hidden`,n.out=0,n.visible=!1,n.x=e.x,n.z=e.z,n.t=3+this.rng()*20;return n.bodyYaw=this.rng()*L,n}spawnHermit(e){let t=this.newCrab(G.HERMIT,e,e.seed);t.state=`idle`,t.t=this.rng()*5,t.eyes=1;let n=this.rng()*L;return t.x=e.x+Math.cos(n)*this.rng()*2,t.z=e.z+Math.sin(n)*this.rng()*2,t.lift=.08,t}threat(e,t){if(!t||t.mode===`boat`)return{d:1e9,closing:0};let n=e.x-t.x,r=e.z-t.z,i=Math.hypot(n,r);return Math.abs(t.y-e.y)>6?{d:1e9,closing:0}:{d:i,closing:t.speed}}moveTo(e,t,n,r=12){let i=e.tx-e.x,a=e.tz-e.z,o=Math.hypot(i,a),s=o<.02?0:Math.min(n,o*6);if(e.speed+=P(s-e.speed,-r*2*t,r*t),o>1e-4){let n=Math.min(e.speed*t,o);if(e.vx=i/o*e.speed,e.vz=a/o*e.speed,e.x+=i/o*n,e.z+=a/o*n,e.species===G.GHOST){let n=Math.atan2(i,a),r=n+Math.PI/2,o=n-Math.PI/2,s=Math.abs(D(r,e.bodyYaw))<Math.abs(D(o,e.bodyYaw))?r:o;e.bodyYaw+=D(s,e.bodyYaw)*O(14,t)}else e.bodyYaw+=D(Math.atan2(i,a),e.bodyYaw)*O(3,t)}return o}pickSpot(e,t,n,r=0){let i=this.rng()*L,a=t+this.rng()*(n-t);e.tx=e.home.x+Math.cos(i)*a,e.tz=e.home.z+Math.sin(i)*a+r}updateGhost(e,t,n){let r=e.home;e.pPhase=e.phase;let i=this.threat(e,n),a=i.d<6.5+i.closing*1.2,o=i.d<10+i.closing*1.5;switch(e.t-=t,e.state){case`hidden`:e.visible=!1,e.out=0,i.d<10&&(e.t=Math.max(e.t,4+this.rng()*6)),e.t<=0&&(e.state=`peek`,e.t=1.5+this.rng()*3,e.x=r.x,e.z=r.z,e.visible=!0,e.fresh=!0);break;case`peek`:e.out+=(.45-e.out)*O(3,t),e.eyes=1,o?(e.state=`enter`,e.t=.3):e.t<=0&&(e.state=`emerge`,e.t=.5);break;case`emerge`:e.out=Math.min(1,e.out+t*1.6),o?e.state=`enter`:e.out>=1&&(e.state=`idle`,e.t=1+this.rng()*3);break;case`idle`:if(e.feed+=t*4,e.claws=.25+.25*Math.max(0,Math.sin(e.feed)),this.moveTo(e,t,0),a)this.flee(e,n);else if(o)e.state=`freeze`,e.t=.8+this.rng()*1.5;else if(e.t<=0){let t=this.rng();t<.15&&this.time>2?e.state=`return`:(e.state=t<.45?`dash`:`walk`,this.pickSpot(e,.5,t<.45?5:2.5,this.rng()<.2?3:0),e.t=5)}break;case`walk`:case`dash`:{let r=e.state===`dash`?1.2+e.seed*.9:.12+e.seed*.1,i=this.moveTo(e,t,r);e.claws=.1,a?this.flee(e,n):o?(e.state=`freeze`,e.t=.6+this.rng()*1.5):(i<.05||e.t<=0)&&(e.state=`idle`,e.t=1+this.rng()*5);break}case`freeze`:this.moveTo(e,t,0,30),e.claws=.05,a?this.flee(e,n):e.t<=0&&(o?this.flee(e,n):(e.state=`idle`,e.t=1+this.rng()*2));break;case`flee`:{let n=this.moveTo(e,t,2.1+e.seed*.9,25);e.claws=0,e.eyes=e.target?.6:1,n<.08&&(e.target?(e.state=`enter`,e.t=.25):(e.state=`freeze`,e.t=2+this.rng()*3));break}case`return`:{e.tx=r.x,e.tz=r.z;let i=this.moveTo(e,t,.3+e.seed*.2);a?this.flee(e,n):i<.05&&(e.state=`enter`,e.t=.4);break}case`enter`:e.speed=0,e.x+=(e.home.x-e.x)*O(20,t),e.z+=(e.home.z-e.z)*O(20,t),e.out=Math.max(0,e.out-t/.22),e.eyes=Math.max(0,e.eyes-t*4),e.out<=0&&(e.state=`hidden`,e.visible=!1,e.t=12+this.rng()*25+(1-this.activity)*30)}let s=e.size,c=P(e.speed/(s*2.4),0,13);e.phase=(e.phase+L*c*t)%(L*64),e.stride+=(P(e.speed/(s*10),0,1)-e.stride)*O(10,t);let l=e.state===`freeze`?.26:e.speed>.6?.4:.32;e.lift+=(l-e.lift)*O(8,t),e.state!==`enter`&&e.state!==`peek`&&(e.eyes+=(1-e.eyes)*O(6,t))}flee(e,t){e.state=`flee`;let n=e.x-t.x,r=e.z-t.z,i=Math.hypot(n,r)||1,a=null,o=-1/0,s=t=>{if(t.crab&&t.crab!==e)return;let s=t.x-e.x,c=t.z-e.z,l=Math.hypot(s,c);if(l>11)return;let u=l>.01?(s*n+c*r)/(l*i):1;if(u<-.35&&l>1.2)return;let d=-l*.5+u*2+(t===e.home?1.5:0);d>o&&(o=d,a=t)};s(e.home);for(let e of this.nearBurrows)s(e);if(a)a!==e.home&&(e.home.crab=null,e.home=a,a.crab=e),e.target=a,e.tx=a.x,e.tz=a.z;else{e.target=null;let t=Math.atan2(n,r)+(this.rng()-.5)*1.2,i=4+this.rng()*5;e.tx=e.x+Math.sin(t)*i,e.tz=e.z+Math.cos(t)*i}}updateHermit(e,t,n){e.pPhase=e.phase;let r=this.threat(e,n);e.t-=t;let i=r.d<2.2+r.closing*.6;switch(e.state){case`idle`:this.moveTo(e,t,0),i?this.withdraw(e):e.t<=0&&(e.state=`walk`,this.pickSpot(e,0,3),e.t=20);break;case`walk`:{let n=this.moveTo(e,t,.035+e.seed*.03,.3);i?this.withdraw(e):(n<.03||e.t<=0)&&(e.state=`idle`,e.t=3+this.rng()*12);break}case`withdrawn`:e.speed=0,e.out=Math.max(0,e.out-t/.25),r.d<4&&(e.t=Math.max(e.t,6+this.rng()*8)),e.t<=0&&(e.state=`emerge`);break;case`emerge`:e.out=Math.min(1,e.out+t/2.5),i?this.withdraw(e):e.out>=1&&(e.state=`idle`,e.t=2+this.rng()*4)}let a=e.size;e.phase=(e.phase+L*P(e.speed/(a*1.6),0,6)*t)%(L*64),e.stride+=(P(e.speed/(a*3),0,1)-e.stride)*O(6,t),e.lift+=((e.out>.5?.14:0)*e.out-e.lift)*O(6,t),e.claws=.15,e.eyes=e.out}withdraw(e){e.state=`withdrawn`,e.t=8+this.rng()*10}crabRecord(e,t,n){let r=this.terrain,i=Math.hypot(e.x-n.x,e.z-n.z),a=e.fade=Math.min(1,e.fade+.05);if(t.scale=e.size*z(X,X*.72,i)*a,t.scale<=0)return;let o=r.heightAt(e.x,e.z);e.y=o;let s=.15,c=r.heightAt(e.x-s,e.z)-r.heightAt(e.x+s,e.z),l=r.heightAt(e.x,e.z-s)-r.heightAt(e.x,e.z+s),u=Math.hypot(c,2*s,l);e.sx=-c/(2*s),e.sz=-l/(2*s);for(let t=0;t<4;t++)e.pq[t]=e.q[t];if(C(e.q,e.bodyYaw,c/u,2*s/u,l/u),e.fresh){e.px=e.x,e.py=o,e.pz=e.z;for(let t=0;t<4;t++)e.pq[t]=e.q[t];e.pPhase=e.phase,e.fresh=!1}t.x=e.x,t.y=o,t.z=e.z;for(let n=0;n<4;n++)t.q[n]=e.q[n],t.pq[n]=e.pq[n];t.species=e.species,t.phase=e.phase,t.pPhase=e.pPhase,t.stride=e.stride,t.lift=e.lift,t.out=e.out,t.eyes=e.eyes,t.claws=e.claws,t.seed=e.seed,t.px=e.px,t.py=e.py,t.pz=e.pz,e.px=e.x,e.py=o,e.pz=e.z}burrowRecord(e,t,n){let r=this.terrain;if(t.x=e.x,t.y=e.y,t.z=e.z,t.scale=.05*e.size*n,!e.q){e.q=[0,0,0,1];let t=.3,n=r.heightAt(e.x-t,e.z)-r.heightAt(e.x+t,e.z),i=r.heightAt(e.x,e.z-t)-r.heightAt(e.x,e.z+t),a=Math.hypot(n,2*t,i);C(e.q,e.yaw,n/a,2*t/a,i/a)}for(let n=0;n<4;n++)t.q[n]=t.pq[n]=e.q[n];t.species=G.BURROW,t.phase=t.pPhase=0,t.stride=0,t.lift=0,t.out=1,t.eyes=0,t.claws=0,t.seed=e.seed,t.px=e.x,t.py=e.y,t.pz=e.z}},Ce=class{constructor({capacity:n=160}={}){this.records=new j(`blobInstances`,n,2);let r=this.records,i=new v(2,2);i.rotateX(-Math.PI/2);let a=e=>r.field(e),o=new t({name:`ContactShadows`,lit:!1,transparent:!0,blending:`premultiplied`,depthWrite:!1,velocityWeight:0,storage:{blobInstances:r.buffer},varyings:{vBlobUV:`vec2f`,vBlobInfo:`vec4f`},vertex:`
	let r0 = ${a(0)}; let r1 = ${a(1)};
	// the quad covers the blob and its sun shadow (offset away from the light, stretched)
	let L = frame.sunDir;
	let lh = max( length( L.xz ), 1e-3 );
	let dir = - L.xz / lh;
	let reach = min( r1.x * lh / max( L.y, 0.12 ), r0.w * 4.0 );
	let p = v.position;
	let side = vec2f( dir.y, - dir.x ); // (keeps the winding: the quad faces up)
	let s = r0.w * 1.6;
	let along = p.z * ( s + reach * 0.5 ) + reach * 0.5;
	let xz = r0.xz + dir * along + side * ( p.x * s );
	o.vBlobUV = vec2f( along, p.x * s );
	o.vBlobInfo = vec4f( r0.w, reach, r1.y, L.y );
	let off = xz - r0.xz;
	v.useWorld = true;
	v.worldPos = vec3f( xz.x, r0.y + off.x * r1.z + off.y * r1.w + 0.012, xz.y );
	v.worldNormal = vec3f( 0.0, 1.0, 0.0 );
`,surface:`
	let vUV = in.vs.vBlobUV; let vInfo = in.vs.vBlobInfo;
	let r = vInfo.x; let reach = vInfo.y; let dark = vInfo.z;
	let q = vUV / r;
	// occlusion right below, the sun shadow stretched along the light
	let ao = exp( dot( q, q ) * -2.2 ) * 0.55;
	let t = clamp( vUV.x / max( reach, 1e-3 ), 0.0, 1.0 );
	let c = vec2f( vUV.x - reach * t, vUV.y ) / r;
	let sun = exp( dot( c, c ) * -1.6 ) * 0.6 * select( 0.0, 1.0, vInfo.w > 0.0 );
	s.albedo = vec3f( 0.0 );
	s.emissive = vec3f( 0.0 );
	s.alpha = max( ao, sun ) * dark * ( ( 1.0 - frame.night ) * 0.6 + 0.4 );
`});this.material=o,this.mesh=M(`ContactShadows`,i,o,r,{}),this.mesh.castShadow=!1,this.mesh.receiveShadow=!1,this.mesh.layers.set(e.TRANSPARENT),this.mesh.renderOrder=-1}begin(){this.records.begin()}add(e,t,n,r,i,a=1,o=0,s=0){let c=this.records.push();if(c<0)return;let l=this.records.data;l[c]=e,l[c+1]=t,l[c+2]=n,l[c+3]=r,l[c+4]=i,l[c+5]=a,l[c+6]=o,l[c+7]=s}commit(){this.records.commit()}},we=class{constructor(e,{shore:t,terrainGPU:n,count:r=32,interval:i=6}){this.renderer=e,this.shore=t,this.n=r,this.interval=i,this._frame=0,this.inputs=new Float32Array(r*4),this.inputBuffer=new b({label:`swashProbeIn`,count:r,type:`vec4f`}),this.results=new b({label:`swashProbe`,count:r,type:`vec4f`}),this.readback=new x({byteLength:r*16,label:`swashProbe`}),this.cpu=new Float32Array(r*4),this.valid=!1,this.issued=new Float32Array(r*4),this.resultTime=0,this._pending=!1,this._inputsCopy=new Float32Array(r*4),this.active=!1,this.kernel=new p({label:`Swash Probe`,modules:[n.module,t.module],bindings:{swashIn:{storage:this.inputBuffer,access:`read`},swashOut:{storage:this.results,access:`read_write`}},workgroupSize:[32,1,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let i = gid.x;
	if ( i >= ${r}u ) { return; }
	let q = swashIn[ i ];
	if ( q.w > 0.5 ) {
		let p = q.xy;
		let ground = terrainHeightAt( p );
		let sw = shoreEvaluateNoNormal( p, frame.seaLevel - ground, ground );
		swashOut[ i ] = vec4f( sw.runup, sw.inland, sw.dRdt, sw.tau );
	}
}
`}),this.readback.onData=e=>{this.cpu.set(new Float32Array(e)),this.issued.set(this._inputsCopy),this.resultTime=this._issuedTime,this.valid=!0,this._pending=!1}}set(e,t,n){let r=e*4;this.inputs[r]=t,this.inputs[r+1]=n,this.inputs[r+3]=1,this.active=!0}clear(e){this.inputs[e*4+3]=0}update(){this.active&&(this.active=!1,!(this._pending||this._frame++%this.interval!==0)&&(this.inputBuffer.write(this.inputs),this.kernel.dispatch(Math.ceil(this.n/32)),this._issuedTime=o.time.value,this._inputsCopy.set(this.inputs),this._pending=this.readback.request(this.results)))}get(e,t){if(!this.valid||this.issued[e*4+3]<.5)return null;let n=this.cpu,r=e*4,i=o.time.value-this.resultTime,a=n[r+3]+i/Math.max(this.shore.period.value,1);if(t.inland=n[r+1],t.x=this.issued[r],t.z=this.issued[r+1],t.age=i,a<1)t.runup=n[r]+n[r+2]*i,t.speed=n[r+2];else{let e=(a-1)*this.shore.period.value;t.speed=3.2*Math.max(.2,1-e/3),t.runup=.35+3.2*e*(1-e/6)}return t.tau=a%1,t}},Te=.066,Ee=190,De=15,Oe=8,ke={runup:0,inland:0,speed:0,tau:0,x:0,z:0,age:0},Q=new n,$=new n,Ae=class{constructor({terrain:e,probe:t=null,seed:n=17}){this.terrain=e,this.probe=t,this.rng=y(n),this.time=0,this.birds=[],this.flocks=[{x:22,range:[-135,c.pier.x-9],n:12},{x:115,range:[c.pier.x+9,c.beach.xMax-8],n:9}];for(let e of this.flocks){e.birds=[],e.state=`feed`,e.drift=this.rng()<.5?-1:1,e.alarm=0;for(let t=0;t<e.n;t++){let t=this.newBird(e,this.birds.length);e.birds.push(t),this.birds.push(t)}}}newBird(e,t){let n=this.rng,r=new ne(T.SANDERLING,n(),y(Math.floor(n()*1e9)));r.windK=.25;let i={F:e,f:r,index:t,state:`feed`,x:e.x+(n()-.5)*10,z:-42,y:0,yaw:n()*L,v:0,vx:0,vz:0,offset:(n()-.5)*11,margin:n(),phase:n()*L,peck:0,peckT:n(),head:0,stop:0,hop:0,fold:1,t:0,lx:0,lz:0,form:[(n()-.5)*4,(n()-.5)*1.2,(n()-.5)*3]};return i.z=this.frontGuess(i.x)-1-n()*2,i.y=this.terrain.heightAt(i.x,i.z),i}frontGuess(e,t=.35){let n=this.terrain,r=-70;for(;r<-10&&!(n.heightAt(e,r)<t);r+=.5);return r}slopeAt(e,t,n){let r=this.terrain,i=.6,a=(r.heightAt(e+i,t)-r.heightAt(e-i,t))/(2*i),o=(r.heightAt(e,t+i)-r.heightAt(e,t-i))/(2*i),s=Math.hypot(a,o);return n.set(a/(s||1),s,o/(s||1)),n}update(e,t,n,r,i=null){this.time+=e;let a=r.position,s=o.night.value;for(let n of this.flocks){let r=0;for(let e of n.birds)r+=e.x;r/=n.birds.length,n.cx=r,!(Math.hypot(r-a.x,-40-a.z)>310)&&this.updateFlock(n,e,t,s)}for(let e of this.birds){let t=e.f.P,r=Math.hypot(t.pos[0]-a.x,t.pos[1]-a.y,t.pos[2]-a.z);if(r>Ee)continue;let o=e.scale0||=t.scale;if(t.scale=o*z(Ee,Ee*.8,r),n.write(t),t.scale=o,i&&e.state!==`fly`){let t=this.slopeAt(e.x,e.z,$);i.add(e.x,e.y,e.z,.06*o,.06*o,.85,t.x*t.y,t.z*t.y)}}this.probe&&this.probe.update()}updateFlock(e,t,n,r){let i=1e9,a=!1;if(n&&n.mode!==`boat`){for(let t of e.birds)t.state!==`fly`&&(i=Math.min(i,Math.hypot(t.x-n.x,t.z-n.z)));a=n.speed>3.5}e.away=n?Math.sign(e.cx-n.x)||1:e.drift;let o=i<Oe||a&&i<Oe*1.7;e.state===`feed`&&o?(e.alarm+=t,e.alarm>.15&&this.flush(e,n)):e.alarm=Math.max(0,e.alarm-t),e.wary=i<De+(a?6:0),e.x=e.x??e.cx,e.state===`feed`&&(this.rng()<t/25&&(e.drift=-e.drift),e.x+=e.drift*.25*t+(e.wary?e.away*1.4*t:0),e.x=P(e.x,e.range[0]+8,e.range[1]-8)),e.state===`fly`&&this.flockFlight(e,t);for(let i of e.birds)i.state===`fly`?this.flyBird(i,t):this.groundBird(i,t,n,r);e.state===`fly`&&e.birds.every(e=>e.state!==`fly`)&&(e.state=`feed`,e.x=e.cx)}groundBird(e,t,n,r){let i=e.F,a=this.terrain,s=this.slopeAt(e.x,e.z,$),c=s.x,l=s.z,u=Math.max(s.y,.015),d=-l,f=c,p=a.heightAt(e.x,e.z),m=3,h=0,g=!1,_=this.probe?this.probe.get(e.index,ke):null;if(_&&_.age<1.5){let e=_.runup;m=(Math.max(p-o.seaLevel.value,0)/Te-e)*Te/u,h=_.speed*Te/u,g=_.speed>.05}else m=(p-.35)/u;this.probe&&this.probe.set(e.index,e.x,e.z);let v=g?1+e.margin*1.2:.15+e.margin*.55;r>.6&&(v=6+e.margin*1.5);let y=P((g?h:0)+(v-m)*2.2,-1.3,2.4),b=P((i.x+e.offset-e.x)*.6,-.9,.9);i.wary&&(b=i.away*(1.3+e.margin*.5));for(let t of i.birds){if(t===e||t.state===`fly`)continue;let n=e.x-t.x,r=e.z-t.z,i=n*n+r*r;if(i<.25&&i>1e-6){let e=Math.sqrt(i);b+=(n*d+r*f)/e*(.5-e)*3,y+=(n*c+r*l)/e*(.5-e)*3}}let x=v-m,S=m<.25&&g;e.stop=Math.max(0,e.stop-t),e.stop>0?(S||i.wary||Math.abs(x)>.8+e.margin*.5||Math.abs(b)>.7)&&(e.stop=0):Math.abs(x)<.3&&Math.abs(b)<.55&&!S&&!i.wary&&(e.stop=.5+this.rng()*1.6);let C=e.stop>0?0:1,w=(c*y+d*b)*C,T=(l*y+f*b)*C,E=O(14,t);e.vx+=(w-e.vx)*E,e.vz+=(T-e.vz)*E,e.v=Math.hypot(e.vx,e.vz),e.x+=e.vx*t,e.z+=e.vz*t,e.x=P(e.x,i.range[0],i.range[1]),e.v>.15&&(e.yaw+=D(Math.atan2(e.vx,e.vz),e.yaw)*O(16,t)),S&&m<-.35&&e.hop<=0&&(e.hop=.45),e.hop=Math.max(0,e.hop-t),e.peckT+=t*(e.stop>0?4.5:0);let k=e.stop>0?Math.max(0,Math.sin(e.peckT*Math.PI))**.6:0;e.head+=(k-e.head)*O(30,t);let A=e.v>.05?P(5+e.v*5,5,14):0;e.phase=(e.phase+L*A*t)%L,e.y=a.heightAt(e.x,e.z),this.groundPoseOf(e,t,A>0?e.v/A:0)}groundPoseOf(e,t,n){let r=e.f,i=r.P,a=r.sp;i.fresh?F(i):I(i);let o=Math.sin(Math.PI*e.hop/.45),s=N(a),c=n>0?.012:0;if(te(i,e.x,e.y+o*.12,e.z,e.yaw,-.08*e.head+(n>0?-.05:.04),s,e.phase,Math.min(n,.07),c),ee(i,0,-.1+e.head*1.15,0,-.006*e.head,.004*e.head),e.fold=Math.min(1,e.fold+t*4),o>0){let e=this.time*60;w(i,.4+Math.cos(e)*.7,0,0,.3,.5,0),i.fold=1-o}else w(i,.2,0,.1,.5,.6,.1),i.fold=e.fold;i.tailPitch=.05,i.tailSpread=1,r.x=i.pos[0],r.y=i.pos[1],r.z=i.pos[2]}flush(e,t){e.state=`fly`;let r=this.rng,i=e.cx,o=e.away,s=i+o*(55+r()*50);(s<e.range[0]+10||s>e.range[1]-10)&&(o=-o,s=P((t?t.x:i)+o*(50+r()*40),e.range[0]+10,e.range[1]-10));let c=this.frontGuess(i),l=this.frontGuess(s),u=(i+s)/2,d=[[i,.6,c],[i+o*10,2.2,c+7],[u-o*12,3+r()*2,c+14+r()*8],[u+o*14,2.5+r()*2,l+12+r()*8],[s-o*12,1.4,l+4],[s,.4,l-1.5]];e.path=new a(d.map(e=>new n(e[0],e[1],e[2])),!1,`centripetal`),e.len=e.path.getLength(),e.s=0,e.dest=s;for(let t of e.birds){t.state=`fly`,t.t=-r()*.3,t.lx=s+t.offset*.8,t.lz=l-.5-t.margin*2;let e=t.f;e.x=t.x,e.y=t.y+.06,e.z=t.z,e.yaw=Math.atan2(d[1][0]-t.x,d[1][2]-t.z),e.speed=3,e.vy=1.5,e.flap=0,e.bank=0,e.pitch=.3,e.fold=1}}flockFlight(e,t){e.s=Math.min(e.len,e.s+t*12.5),e.path.getPointAt(e.s/e.len,Q),e.path.getTangentAt(e.s/e.len,$),e.px=Q.x,e.py=Q.y,e.pz=Q.z,e.hx=$.x,e.hz=$.z}flyBird(e,t){let n=e.F,r=e.f;if(e.t+=t,e.t<0){this.groundPoseOf(e,t,0);return}r.fold=Math.max(0,r.fold-t*8);let i=Math.hypot(n.hx,n.hz)||1,a=n.hx/i,o=n.hz/i,s=e.form,c=n.px+a*s[2]-o*s[0],l=n.py+s[1]*.6,u=n.pz+o*s[2]+a*s[0],d=n.s>=n.len-.01,f=Math.hypot(e.lx-r.x,e.lz-r.z);(d||n.s>n.len-14)&&(c=e.lx,u=e.lz,l=this.terrain.heightAt(e.lx,e.lz)+Math.min(1.2,f*.25));let p=Math.hypot(c-r.x,u-r.z),m=P(9+(p-2)*1.2,5,16);r.steer(t,c,l,u,m,e.t<.6?2:1,2.2);let h=Math.max(this.terrain.heightAt(r.x,r.z),0);r.y<h+.25&&(r.y=h+.25),r.flare=z(3,.8,f)*(d?1:.5),r.legs=z(2.5,.8,f),r.animate(t),f<.6&&r.y<h+.45&&n.s>n.len-14&&(e.state=`feed`,e.x=r.x,e.z=r.z,e.vx=r.vx*.3,e.vz=r.vz*.3,e.yaw=r.yaw,e.fold=0,r.flare=0,r.legs=0,e.stop=0)}},je=Math.PI*2,Me=[[44,-76],[67,-82],[15,-105],[-35,-115],[-85,-155],[115,-155],[75,-210]],Ne=class{constructor({terrain:e,colliders:t=null,village:n=null,seed:r=1947,count:i=28}){this.terrain=e,this.colliders=t,this.footprints=n?.getFootprints()||[],this.rng=y(r),this.rabbits=[];for(let t=0;t<i;t++){let n=Me[t%Me.length];for(let r=0;r<100;r++){let r=this.rng()*je,i=3+this.rng()*13,a=n[0]+Math.cos(r)*i,o=n[1]+Math.sin(r)*i;if(this.safe(a,o)&&!this.rabbits.some(e=>Math.hypot(e.x-a,e.z-o)<1.6)){this.rabbits.push({x:a,z:o,y:e.heightAt(a,o),homeX:a,homeZ:o,yaw:this.rng()*je,scale:.85+this.rng()*.3,coat:t%4,were:t===13,time:this.rng()*20,wait:.5+this.rng()*3,hop:null,lift:0,stretch:0});break}}}}safe(e,t){if(Math.abs(e)>250||t<-350||t>-45)return!1;let n=this.terrain.heightAt(e,t),r=.35;if(!Number.isFinite(n)||n<1.6||n>55)return!1;let i=this.terrain.heightAt(e+r,t)-this.terrain.heightAt(e-r,t),a=this.terrain.heightAt(e,t+r)-this.terrain.heightAt(e,t-r);return!(Math.hypot(i,a)/(2*r)>.55||this.footprints.some(n=>Math.hypot(n.x-e,n.z-t)<n.r+.4)||this.colliders&&(this.colliders.groundHeightAt(e,t,n+3,.3)>n+.05||this.colliders.resolveCapsule({x:e,y:n,z:t},.32,.8,0)))}pathClear(e,t,n,r){let i=Math.ceil(Math.hypot(n-e,r-t)/.18);for(let a=1;a<=i;a++)if(!this.safe(e+(n-e)*a/i,t+(r-t)*a/i))return!1;return!0}startHop(e,t,n=!1){let r=!!t&&!n,i=n&&t?Math.atan2(t.x-e.x,t.z-e.z):r?Math.atan2(e.x-t.x,e.z-t.z):e.yaw+(this.rng()-.5)*2.4;!r&&!n&&Math.hypot(e.x-e.homeX,e.z-e.homeZ)>9&&(i=Math.atan2(e.homeX-e.x,e.homeZ-e.z));for(let t=0;t<10;t++){let t=i+(this.rng()-.5)*(n?.55:r?1.8:3.5),a=n?1.6+this.rng()*1.25:r?1.3+this.rng()*.7:.5+this.rng()*.65,o=e.x+Math.sin(t)*a,s=e.z+Math.cos(t)*a;if(!(Math.hypot(o-e.homeX,s-e.homeZ)>(n?34:22)||!this.pathClear(e.x,e.z,o,s))){e.yaw=t,e.hop={x:e.x,z:e.z,tx:o,tz:s,t:0,duration:n?.28:r?.34:.55,height:n?.42:r?.34:.22,scared:r,attack:n};return}}e.wait=.4+this.rng()}update(e,t,n=[],{night:r=0,onAttack:i=null}={}){e=Math.max(0,Math.min(e,.1));let a=null;for(let i of this.rabbits){if(Math.hypot(i.x-t.x,i.z-t.z)>95)continue;i.time+=e;let o=null,s=i.were&&r>.55?18:5;for(let e of n){if(!e||e.mode===`boat`||e.mode===`deck`||Math.abs(e.y-(i.y-i.lift))>3)continue;let t=Math.hypot(e.x-i.x,e.z-i.z);t<s&&(s=t,o=e)}let c=i.were&&r>.55&&o;if(c&&s<.95&&!a&&(a=i),i.hop||(i.wait-=e,(i.wait<=0||o&&i.wait<2)&&this.startHop(i,o,c)),i.hop){let t=i.hop;t.t=Math.min(1,t.t+e/t.duration),i.x=t.x+(t.tx-t.x)*t.t,i.z=t.z+(t.tz-t.z)*t.t,i.stretch=Math.sin(Math.PI*t.t),i.lift=t.height*i.stretch,t.t>=1&&(i.hop=null,i.lift=0,i.stretch=0,i.wait=t.attack?.04:t.scared?.08:.4+this.rng()*3.2)}i.y=this.terrain.heightAt(i.x,i.z)+i.lift}return a&&i&&i(a),a}};function Pe(){let e=[],t=(t,n,r,i,a,o,s=0,c=0,l=0)=>{e.push(u(f(1,12,8),{color:16777215,pattern:s,anim:c,matrix:d(t,n,r,0,0,l,i,a,o)}))};t(0,.28,-.04,.19,.22,.3),t(0,.3,.14,.15,.17,.18,1),t(0,.46,.24,.145,.14,.15,0,1),t(-.048,.416,.354,.064,.047,.056,1,1),t(.048,.416,.354,.064,.047,.056,1,1),t(0,.435,.398,.025,.018,.016,2,1);for(let e of[-1,1]){let n=e<0?2:3;t(e*.076,.7,.22,.05,.21,.039,0,n,-e*.16),t(e*.076,.71,.252,.028,.161,.013,2,n,-e*.16),t(e*.125,.482,.302,.024,.032,.023,3,1),t(e*.131,.492,.32,.007,.009,.006,1,1),t(e*.15,.19,-.15,.12,.16,.17),t(e*.15,.055,-.08,.074,.055,.16,1,4),t(e*.088,.12,.21,.052,.1,.06,0,5),t(e*.088,.042,.26,.053,.042,.093,1,5)}return t(0,.32,-.34,.083,.082,.083,1),l(e)}var Fe=new s({name:`bunnyPose`,deps:[A],code:`
fn bunnyLocal(p0: vec3f, part: f32, anim: vec4f) -> vec3f {
	var p = p0;
	let t = anim.x; let hop = anim.y;
	if (part > 1.5 && part < 3.5) {
		let side = select(-1.0, 1.0, part > 2.5);
		let pivot = vec3f(side * 0.076, 0.53, 0.22);
		p -= pivot;
		let angle = side * (sin(t * 2.3 + side) * 0.07 + hop * 0.22);
		p = vec3f(cos(angle) * p.x - sin(angle) * p.y, sin(angle) * p.x + cos(angle) * p.y, p.z) + pivot;
	}
	if (part > 0.5 && part < 3.5) {
		let pivot = vec3f(0.0, 0.38, 0.2);
		p -= pivot;
		let sniff = (1.0 - hop) * (0.08 + 0.12 * sin(t * 2.0));
		p = vec3f(p.x, cos(sniff) * p.y - sin(sniff) * p.z, sin(sniff) * p.y + cos(sniff) * p.z) + pivot;
	}
	if (part > 3.5) { p.y += hop * 0.085; p.z += hop * select(-0.07, 0.07, part > 4.5); }
	p.z *= 1.0 + hop * 0.12;
	return p;
}
`}),Ie=class{constructor({capacity:e=28,csm:n=null}={}){this.records=new j(`bunnyInstances`,e,6);let r=e=>this.records.field(e);this.material=new t({name:`Bunnies`,roughness:.94,underwaterLighting:`none`,modules:[Fe],attributes:{aux:`vec4f`},storage:{bunnyInstances:this.records.buffer},varyings:{vBunny:`vec3f`,vBunnyLocal:`vec3f`},vertex:`
	let at = ${r(0)}; let q = ${r(1)}; let anim = ${r(2)};
	let prev = ${r(3)}; let pq = ${r(4)}; let pa = ${r(5)};
	let p = bunnyLocal(v.position, v.aux.w, anim);
	let n = normalize(bunnyLocal(v.position + v.normal, v.aux.w, anim) - p);
	v.useWorld = true;
	v.worldPos = at.xyz + rotateQ(q, p * at.w);
	v.worldNormal = rotateQ(q, n);
	v.prevWorldPos = prev.xyz + rotateQ(pq, bunnyLocal(v.position, v.aux.w, pa) * prev.w);
	o.vBunny = vec3f(v.aux.z, anim.w, anim.z);
	o.vBunnyLocal = v.position;
`,surface:`
	let region = in.vs.vBunny.x; let coat = in.vs.vBunny.y; let wereNight = in.vs.vBunny.z;
	var fur = vec3f(0.38, 0.23, 0.12);
	if (coat > 0.5) { fur = vec3f(0.34, 0.32, 0.29); }
	if (coat > 1.5) { fur = vec3f(0.78, 0.70, 0.56); }
	if (coat > 2.5) { fur = vec3f(0.14, 0.085, 0.055); }
	if (region > 0.5) { fur = mix(fur, vec3f(0.88, 0.83, 0.72), 0.85); }
	if (region > 1.5) { fur = vec3f(0.57, 0.26, 0.24); }
	if (region > 2.5) { fur = mix(vec3f(0.012, 0.009, 0.007), vec3f(1.0, 0.02, 0.0), wereNight); s.emissive = vec3f(1.0, 0.02, 0.0) * wereNight * 7.0; }
	let grain = sin(in.vs.vBunnyLocal.x * 390.0 + sin(in.vs.vBunnyLocal.z * 247.0)) * sin(in.vs.vBunnyLocal.y * 281.0);
	s.albedo = fur * (0.96 + 0.04 * grain);
	s.roughness = select(0.94, 0.18, region > 2.5);
`}),this.geometry=Pe(),this.mesh=M(`Bunnies`,this.geometry,this.material,this.records,{csm:n,castShadow:!0})}update(e,t,n,r=null){this.records.begin();for(let i of e){let e=Math.hypot(i.x-n.x,i.z-n.z);if(e>=85){i.previousRender=null;continue}let a=i.scale*z(85,70,e),o=.2,s=(t.heightAt(i.x+o,i.z)-t.heightAt(i.x-o,i.z))/(2*o),c=(t.heightAt(i.x,i.z+o)-t.heightAt(i.x,i.z-o))/(2*o),l=Math.hypot(s,1,c),u=[0,0,0,1];C(u,i.yaw,-s/l,1/l,-c/l);let d=[i.x,i.y+.025,i.z,a,...u,i.time,i.stretch,i.were&&i.wereNight||0,i.coat],f=this.records.push();if(f<0)break;this.records.data.set(d,f),this.records.data.set(i.previousRender||d,f+12),i.previousRender=d,r?.add(i.x,i.y-i.lift,i.z,.25*a,i.lift+.2,.75,s,c)}this.records.commit()}},Le=class{constructor(e,t=8){this.query=e,this.n=t,this.start=-1;try{e&&(this.start=e.allocate(`wildlife`,t))}catch(e){console.warn(`Wildlife: no water query slots`,e)}this.keys=Array(t).fill(null),this.used=new Int32Array(t).fill(-1e6),this.since=new Int32Array(t),this.frame=0}height(e,t,n){let r=this.query;if(this.start<0)return 0;let i=this.keys.indexOf(e);if(i<0){i=0;for(let e=1;e<this.n;e++)this.used[e]<this.used[i]&&(i=e);this.keys[i]=e,this.since[i]=this.frame}this.used[i]=this.frame;let a=this.start+i;r.setPoint(a,t,n);let o=r.cpu[a*4];return r.cpuValid&&this.frame-this.since[i]>4&&Number.isFinite(o)?o:0}endFrame(){this.frame++}},Re=class{constructor({scene:e,renderer:t,terrain:n,terrainGPU:r=null,shore:i=null,village:a=null,colliders:o=null,vegetation:s=null,boat:c=null,boatModel:l=null,query:u=null,spray:d=null,csm:f=null,getNight:p=null,onWereRabbitAttack:m=null}){this.terrain=n,this.birdBatch=new ae({csm:f}),e.add(this.birdBatch.mesh),this.critterBatch=new ye,e.add(this.critterBatch.mesh),this.crabs=new Se({terrain:n,village:a,colliders:o,vegetation:s}),this.bunnies=new Ne({terrain:n,village:a,colliders:o}),this.bunnyBatch=new Ie({csm:f}),e.add(this.bunnyBatch.mesh),this.blobs=new Ce,e.add(this.blobs.mesh);let h=null;if(i&&r)try{h=new we(t,{shore:i,terrainGPU:r})}catch(e){console.warn(`Wildlife: swash probe unavailable`,e)}this.shorebirds=new Ae({terrain:n,probe:h}),this.water=new Le(u),this.birds=new se({terrain:n,village:a,colliders:o,boat:c,boatModel:l,water:this.water,spray:d}),this.viewer={x:0,y:0,z:0,speed:0,mode:`walk`,px:0,pz:0,init:!1},this.test=null,this.getNight=p||(()=>0),this.onWereRabbitAttack=m,this.cpuMs=0,this.dinos=null}updateViewer(e,t,n){let r=this.viewer,i,a,o;n?(i=n.position.x,a=n.position.y,o=n.position.z,r.mode=n.mode):(i=t.position.x,a=t.position.y-1.6,o=t.position.z,r.mode=`fly`),r.init||=(r.px=i,r.pz=o,!0);let s=Math.hypot(i-r.px,o-r.pz)/Math.max(e,.001);r.speed+=(Math.min(s,20)-r.speed)*(1-Math.exp(-e*4)),r.px=i,r.pz=o,r.x=i,r.y=a,r.z=o;let c=Math.max(this.terrain.heightAt(i,o),0);return r.mode===`fly`&&a-c>3?null:r}update(e,t,n=null,r=[]){let i=performance.now(),a=this.updateViewer(e,t,n);if(this.birdBatch.begin(),this.critterBatch.begin(),this.blobs.begin(),this.bunnyBatch.mesh.visible=!this.test,this.test)this.test(this.birdBatch,e,this.critterBatch,this.blobs);else{this.birds.update(e,a,this.birdBatch,t),this.shorebirds.update(e,a,this.birdBatch,t,this.blobs),this.crabs.update(e,a,this.critterBatch,t,this.blobs),this.dinos&&this.dinos.update(e,a,t,this.birdBatch,this.blobs);let n=Math.max(0,Math.min(1,this.getNight()));for(let e of this.bunnies.rabbits)e.wereNight=e.were?n:0;this.bunnies.update(e,t.position,[a,...r],{night:n,onAttack:this.onWereRabbitAttack}),this.bunnyBatch.update(this.bunnies.rabbits,this.terrain,t.position,this.blobs)}this.birdBatch.commit(),this.critterBatch.commit(),this.blobs.commit(),this.water.endFrame(),this.cpuMs+=(performance.now()-i-this.cpuMs)*.05}};export{Re as Wildlife};