import{t as e}from"./GPU-CNSNCkR2.js";import{c as t,i as n,l as r,t as i,u as a}from"./GLTF-C1q4NWke.js";import{C as o,E as s,T as c,_ as l,a as u,c as d,d as f,f as p,g as m,i as h,l as g,o as _,r as v,s as y,t as b,u as x}from"./Frame-Wjgqo5vC.js";import{C as S,F as C,P as w,S as T,T as E,b as ee,o as D,w as te}from"./Noise-C8_YOlCO.js";import{n as O,r as k}from"./Texture-C_UVBP8u.js";import{a as ne,i as A,n as j,o as re,r as ie,s as M,t as ae}from"./lighting-CtGmQgMO.js";import"./Globals-D2L9LwLa.js";var N=()=>typeof performance<`u`?performance.now():Date.now(),oe=class{constructor(){this._startTime=N(),this._previousTime=0,this._currentTime=0,this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=()=>{e.hidden===!1&&this.reset()},e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=N()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?N():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}},P=[];for(let e=0;e<8;e++)P.push(new s);var F=new s,se=new s(0,1,0),I=new o,ce=new s,le=new c,ue=class{constructor({size:e=2048,splits:t=[10,60,400],lightMargin:n=200,normalBias:r=[.015,.06,.3],bias:i=2e-5,pcssCascades:a=1}={}){this.size=e,this.splits=t,this.count=t.length,this.lightMargin=n,this.normalBias=r,this.periods=t.map((e,t)=>t===0?1:t===1?2:4),this.texture=new k({label:`sunShadowMap`,width:e,height:e,depth:this.count,dimension:`2d-array`,format:`depth32float`,usage:[`sample`,`render`]}),ne(this.texture),this.cascades=t.map((e,t)=>({camera:{matrixWorld:new o,matrixWorldInverse:new o,projectionMatrix:new o,near:0,far:1,reversedDepth:!1,updateMatrixWorld(){},isCamera:!0,isShadowCamera:!0},block:h(`shadowView`+t),viewProj:new o,radius:0,dirty:!0})),this.enabled=!0,this.layerMask=4294967295,this.frame=0,this.lastSun=new s(0,-2,0);let c=j.fields;c.count.value=this.count,c.mapSize.value=e,c.bias.value=i,c.pcssCascades.value=a,c.enabled.value=1}_margin(e){let t=this.splits[this.count-1],n=e/t;return Math.max(.25*n*n,.25*n)*t}_fit(e,t,n){let r=this.cascades[e],i=e===0?0:this.splits[e-1],a=this.splits[e],o=this._margin(i),l=this._margin(a),u=Math.max(t.near,i-o*.5),d=e===this.count-1?a:a+l*.5;j.fields.blend.value[e]=new c(i,a,o,l);let f=Math.tan(t.fov*Math.PI/360),p=f*t.aspect,m=0;for(let e of[u,d])for(let n of[-1,1])for(let r of[-1,1])P[m++].set(n*p*e,r*f*e,-e).applyMatrix4(t.matrixWorld);let h=Math.min(d,(u+d)/2*(1+p*p+f*f));F.set(0,0,-h).applyMatrix4(t.matrixWorld);let g=0;for(let e of P)g=Math.max(g,e.distanceTo(F));g=Math.ceil(g*16)/16,r.radius=g;let _=r.camera,v=n,y=Math.abs(v.y)>.99?ce.set(1,0,0):se;_.matrixWorld.lookAt(v,new s(0,0,0),y),I.copy(_.matrixWorld).invert();let b=2*g/this.size,x=le.set(F.x,F.y,F.z,1).applyMatrix4(I);x.x=Math.round(x.x/b)*b,x.y=Math.round(x.y/b)*b;let S=g+this.lightMargin,C=new s(x.x,x.y,x.z+S).applyMatrix4(_.matrixWorld);_.matrixWorld.setPosition(C),_.matrixWorldInverse.copy(_.matrixWorld).invert();let w=.1,T=S+g;_.near=w,_.far=T,de(_.projectionMatrix,-g,g,g,-g,w,T),r.viewProj.multiplyMatrices(_.projectionMatrix,_.matrixWorldInverse);let E=j.fields;E.matrices.value[e]=r.viewProj.clone(),E.cascades.value[e]=new c(d,b,this.normalBias[e]??.05,T-w)}update(e,t){if(this.frame++,j.fields.enabled.value=this.enabled&&t.y>-.05?1:0,!j.fields.enabled.value){for(let e of this.cascades)e.dirty=!0;return[]}e.updateMatrixWorld();let n=this.lastSun.angleTo(t)>1e-4;this.lastSun.copy(t);let r=[];for(let i=0;i<this.count;i++)(n||this.cascades[i].dirty||(this.frame+i)%this.periods[i]===0)&&(this._fit(i,e,t),this.cascades[i].dirty=!1,r.push(i));return r}render(e,t,n){if(n.length){t.prepareScene?t.prepareScene(e):e.updateMatrixWorld();for(let r of n){let n=this.cascades[r];u(n.camera,this.size,this.size,{block:n.block}),t.render(e,{label:`shadow cascade `+r,kind:`depth`,updateMatrices:!1,camera:n.camera,frameBlock:n.block,depthView:this.texture.view({dimension:`2d`,baseArrayLayer:r,arrayLayerCount:1}),depthFormat:`depth32float`,clearDepth:1,depthCompare:`less-equal`,layerMask:this.layerMask,depthBias:2,depthBiasSlopeScale:1.5})}}}};function de(e,t,n,r,i,a,o){let s=1/(n-t),c=1/(r-i),l=1/(o-a);return e.set(2*s,0,0,-(n+t)*s,0,2*c,0,-(r+i)*c,0,0,-l,-a*l,0,0,0,1),e}var fe={position:`vec3f`,normal:`vec3f`,uv:`vec2f`,color:`vec4f`},pe={normal:`vec3f( 0.0, 1.0, 0.0 )`,uv:`vec2f( 0.0 )`,color:`vec4f( 1.0 )`},me=/^(u32|i32|vec[234][ui])$/;function he(e){return e===`f32`?`0.0`:e===`u32`?`0u`:e===`i32`?`0i`:`${e}()`}function ge(t,n,r){let i=r.kind,a=new Set(n.map(e=>e.name)),o=t.allDefines();o.PASS_MAIN=+(i===`main`),o.PASS_DEPTH=+(i===`depth`),o.PASS_COLOR=+(i===`color`),o.PASS_LATE=+!!r.late,o.LIT=+!!t.lit,o.INSTANCED=+!!a.has(`instanceMatrix0`),o.INSTANCE_COLOR=+!!a.has(`instanceColor`),Object.assign(o,r.defines||{}),o.CLIP_DISTANCES=o.REFRACTION_CLIP&&e.features.has(`clip-distances`)?1:0;let s=`struct VertexIn {
`;for(let e of n)s+=`\t@location( ${e.location} ) ${e.name}: ${e.wgsl},\n`;s+=`	@builtin( instance_index ) instance: u32,
	@builtin( vertex_index ) vertex: u32,
};
`;let c=`struct VertexData {
	position: vec3f,
	normal: vec3f,
	uv: vec2f,
	color: vec4f,
	model: mat4x4f,
	prevModel: mat4x4f,
	instance: u32,
	vertex: u32,
	worldOffset: vec3f,
	prevWorldOffset: vec3f,
	useWorld: bool,
	worldPos: vec3f,
	worldNormal: vec3f,
	prevWorldPos: vec3f,
`;for(let e in t.attributes)c+=`\t${e}: ${t.attributes[e]},\n`;c+=`};
`;let l=i===`main`,u=0,d=`struct VSOut {
	@builtin( position ) clip: vec4f,
`;d+=`\t@location( ${u++} ) worldPos: vec3f,\n`,d+=`\t@location( ${u++} ) normal: vec3f,\n`,d+=`\t@location( ${u++} ) uv: vec2f,\n`,d+=`\t@location( ${u++} ) color: vec4f,\n`,l&&(d+=`\t@location( ${u++} ) curClip: vec4f,\n`,d+=`\t@location( ${u++} ) prevClip: vec4f,\n`);for(let e in t.varyings){let n=t.varyings[e];d+=`\t@location( ${u++} )${me.test(n)?` @interpolate( flat )`:``} ${e}: ${n},\n`}if(d+=`};
`,o.CLIP_DISTANCES){let e=[...d.matchAll(/\s(\w+): [^,]+,\n/g)].map(e=>e[1]);d+=d.replace(`struct VSOut {`,`struct VSOutClip {`).replace(/};\n$/,`	@builtin( clip_distances ) clipDistances: array<f32, 1>,
};
`),d+=`fn vsClip( o: VSOut, d: f32 ) -> VSOutClip {\n\tvar c: VSOutClip;\n${e.map(e=>`\tc.${e} = o.${e};\n`).join(``)}\tc.clipDistances[ 0 ] = d;\n\treturn c;\n}\n`}let f=``;for(let e in fe)if(a.has(e)){let t=n.find(t=>t.name===e);e===`color`&&t.wgsl===`vec3f`?f+=`	v.color = vec4f( i.color, 1.0 );
`:f+=`\tv.${e} = i.${e};\n`}else e!==`position`&&(f+=`\tv.${e} = ${pe[e]};\n`);for(let e in t.attributes)f+=a.has(e)?`\tv.${e} = i.${e};\n`:`\tv.${e} = ${he(t.attributes[e])};\n`;let p=`
struct Draw {
	model: mat4x4f,
	prevModel: mat4x4f,
	params: vec4f,  // x: object id, y: user, z: user, w: user
	params2: vec4f,
};
@group( 2 ) @binding( 0 ) var<uniform> draw: Draw;

${s}
${c}
${d}

struct FragInput {
	vs: VSOut,
	P: vec3f,
	N: vec3f,
	V: vec3f,
	uv: vec2f,
	color: vec4f,
	front: bool,
	pixel: vec2f,
};

struct FragResult {
	color: vec4f,
	velocity: vec4f,
	mask: vec4f,
};

fn cofactor3( m: mat4x4f ) -> mat3x3f {
	let a = m[ 0 ].xyz; let b = m[ 1 ].xyz; let c = m[ 2 ].xyz;
	return mat3x3f( cross( b, c ), cross( c, a ), cross( a, b ) );
}

fn materialVertex( v: ptr<function, VertexData>, o: ptr<function, VSOut> ) {
${t.vertex}
}

fn materialSurface( in: FragInput, s: ptr<function, Surface> ) {
${t.surface}
}

fn materialOutput( in: FragInput, s: Surface, r: ptr<function, FragResult> ) {
${t.output}
}

#if CLIP_DISTANCES
@vertex fn vs( i: VertexIn ) -> VSOutClip {
#else
@vertex fn vs( i: VertexIn ) -> VSOut {
#endif
	var v: VertexData;
${f}#if !HAS_POSITION
	v.position = vec3f( 0.0 );
#endif
	v.instance = i.instance;
	v.vertex = i.vertex;
#if INSTANCED
	let im = mat4x4f( i.instanceMatrix0, i.instanceMatrix1, i.instanceMatrix2, i.instanceMatrix3 );
	v.model = draw.model * im;
	v.prevModel = draw.prevModel * im;
#else
	v.model = draw.model;
	v.prevModel = draw.prevModel;
#endif
#if INSTANCE_COLOR
	v.color = vec4f( v.color.rgb * i.instanceColor, v.color.a );
#endif
	v.worldOffset = vec3f( 0.0 );
	v.prevWorldOffset = vec3f( 1e30 );
	v.useWorld = false;
	v.prevWorldPos = vec3f( 1e30 );
	var o: VSOut;
	materialVertex( &v, &o );
	var wp: vec3f;
	var wn: vec3f;
	var pwp: vec3f;
	if ( v.useWorld ) {
		wp = v.worldPos;
		wn = v.worldNormal;
		pwp = select( v.prevWorldPos, wp, v.prevWorldPos.x > 1e29 );
	} else {
		let lp = vec4f( v.position, 1.0 );
		wp = ( v.model * lp ).xyz + v.worldOffset;
		wn = cofactor3( v.model ) * v.normal;
		pwp = ( v.prevModel * lp ).xyz + select( v.prevWorldOffset, v.worldOffset, v.prevWorldOffset.x > 1e29 );
	}
	o.worldPos = wp;
	o.normal = wn;
	o.uv = v.uv;
	o.color = v.color;
	o.clip = frame.viewProj * vec4f( wp, 1.0 );
#if PASS_MAIN
	o.curClip = frame.viewProjNoJitter * vec4f( wp, 1.0 );
	o.prevClip = frame.prevViewProjNoJitter * vec4f( pwp, 1.0 );
#endif
#if CLIP_DISTANCES
	return vsClip( o, frame.seaLevel + REFRACTION_CLIP_MARGIN - wp.y );
#else
	return o;
#endif
}

#if PASS_MAIN && !PASS_LATE && LIT && !IS_WATER && !ALPHA_TEST && !STUDIO_LIGHTING
// Deep under the water, seen from above it: the water drawn over this pixel shows the refraction
// pass (ocean/RefractionPass.js) at its refracted end point, never this pixel's own colour. The end
// point is predicted as the water shader traces it (flat surface, the seabed at P's depth, a margin
// for the wave slopes); where it would leave the screen the water takes the refraction pass' edge.
const SUBMERGED_DEPTH: f32 = 2.5; // m below sea level: below the deepest wave troughs
fn submergedHidden( P: vec3f ) -> bool {
	let sea = frame.seaLevel;
	if ( P.y > sea - SUBMERGED_DEPTH || frame.cameraPos.y < sea + 1.0 ) { return false; }
	let V = normalize( P - frame.cameraPos );
	let pos = frame.cameraPos + V * ( ( frame.cameraPos.y - sea ) / max( - V.y, 1e-4 ) );
	let Tr = refract( V, vec3f( 0.0, 1.0, 0.0 ), 1.0 / 1.333 );
	let Tv = normalize( vec3f( Tr.x, min( Tr.y, -0.08 ), Tr.z ) );
	let L = ( sea - P.y ) / max( - Tv.y, 0.04 );
	let c = frame.viewProj * vec4f( pos + Tv * min( L, 80.0 ), 1.0 );
	let uv = c.xy / max( c.w, 1e-4 ) * vec2f( 0.5, -0.5 ) + 0.5;
	return all( uv > vec2f( 0.1 ) ) && all( uv < vec2f( 0.9 ) ) && c.w > 0.0;
}
#endif

fn fragInput( vs: VSOut, front: bool ) -> FragInput {
	var in: FragInput;
	in.vs = vs;
	in.P = vs.worldPos;
	var N = normalize( vs.normal );
#if DOUBLE_SIDED
	N = select( -N, N, front );
#endif
#if BACK_SIDE
	N = -N;
#endif
	in.N = N;
	in.V = normalize( frame.cameraPos - vs.worldPos );
	in.uv = vs.uv;
	in.color = vs.color;
	in.front = front;
	in.pixel = vs.clip.xy;
	return in;
}

fn surfaceOf( in: FragInput ) -> Surface {
	var s = defaultSurface( in.N );
	s.albedo = mat.color * in.color.rgb;
	s.alpha = mat.opacity * in.color.a;
	s.roughness = mat.roughness;
	s.metalness = mat.metalness;
	s.emissive = mat.emissive;
	materialSurface( in, &s );
	return s;
}

#if PASS_DEPTH
#if NEEDS_DEPTH_FRAGMENT
@fragment fn fs( vs: VSOut, @builtin( front_facing ) front: bool ) {
	let in = fragInput( vs, front );
#if HAS_SHADOW_HOOK
	if ( ! materialShadow( in ) ) { discard; }
#else
	let s = surfaceOf( in );
	if ( s.alpha < mat.alphaTest ) { discard; }
#endif
}
#endif
#else

#if PASS_MAIN
struct FragOut {
	@location( 0 ) color: vec4f,
	@location( 1 ) velocity: vec4f,
	@location( 2 ) mask: vec4f,
};
#else
struct FragOut {
	@location( 0 ) color: vec4f,
};
#endif

@fragment fn fs( vs: VSOut, @builtin( front_facing ) front: bool ) -> FragOut {
	let in = fragInput( vs, front );
#if REFRACTION_CLIP
#if !CLIP_DISTANCES
	// the water's refraction source only holds what is under the water (pass.defines)
	if ( in.P.y > frame.seaLevel + REFRACTION_CLIP_MARGIN ) { discard; }
#endif
#endif
#if PASS_MAIN && !PASS_LATE && LIT && !IS_WATER && !ALPHA_TEST && !STUDIO_LIGHTING
	// hidden under the water (see submergedHidden): an ambient colour, keeping depth and motion
	if ( submergedHidden( in.P ) ) {
		var so: FragOut;
		so.color = vec4f( mat.color * in.color.rgb * hookEnvDiffuse( in.N ) * hookAmbientModulation( in.P, in.N ), 1.0 );
		let cur0 = vs.curClip.xy / vs.curClip.w;
		let prev0 = vs.prevClip.xy / vs.prevClip.w;
		so.velocity = vec4f( ( cur0 - prev0 ) * vec2f( 0.5, -0.5 ), 0.0, 1.0 );
		so.mask = vec4f( 0.0 );
		return so;
	}
#endif
	var s = surfaceOf( in );
#if ALPHA_TEST
	if ( s.alpha < mat.alphaTest ) { discard; }
#endif
	s.normal = normalize( s.normal );
	s.clearcoatNormal = normalize( s.clearcoatNormal );
	var r: FragResult;
#if LIT
	r.color = vec4f( shadeSurface( s, in.P, in.V, in.pixel ), s.alpha );
#else
	r.color = vec4f( s.albedo + s.emissive, s.alpha );
#endif
#if PASS_MAIN
	let cur = vs.curClip.xy / vs.curClip.w;
	let prev = vs.prevClip.xy / vs.prevClip.w;
	r.velocity = vec4f( ( cur - prev ) * vec2f( 0.5, -0.5 ), 0.0, 1.0 );
#else
	r.velocity = vec4f( 0.0 );
#endif
	r.mask = vec4f( 0.0 );
	materialOutput( in, s, &r );
	var out: FragOut;
	out.color = r.color;
#if PASS_MAIN
#if PASS_LATE
	// premultiplied: opaque outputs overwrite, blended ones weight their motion by coverage
#if VELOCITY_OPAQUE
	// the fragment owns the motion of its pixel even when its colour is blended (AirMotes specks)
	let a = VELOCITY_WEIGHT;
#else
	let a = select( 1.0, r.color.a, TRANSPARENT_F ) * VELOCITY_WEIGHT;
#endif
	out.velocity = vec4f( r.velocity.xy * a, 0.0, a );
#else
	out.velocity = r.velocity;
#endif
	out.mask = r.mask;
#endif
	return out;
}
#endif
`,m=t.shadow?`fn materialShadow( in: FragInput ) -> bool {\n${t.shadow}\n}\n`:``;o.HAS_SHADOW_HOOK=+!!t.shadow,o.NEEDS_DEPTH_FRAGMENT=i===`depth`&&(t.alphaTest>0||t.shadow)?1:0,o.HAS_POSITION=+!!a.has(`position`);let h=p.replace(`fn fragInput(`,m+`fn fragInput(`).replace(/\bTRANSPARENT_F\b/g,t.transparent?`true`:`false`).replace(/\bVELOCITY_WEIGHT\b/g,L(t.velocityWeight)).replace(/\bREFRACTION_CLIP_MARGIN\b/g,L((r.defines&&r.defines.REFRACTION_CLIP_MARGIN)??0)),g=[D,M,...t.modules];return(i!==`depth`||y(t.modules).includes(A))&&(g=[D,M,...ie(),A,...t.modules]),t.lightingHooks===!1&&!y(t.modules).includes(A)&&(g=[D,M,re,...t.modules]),{code:h,modules:g,defines:o,bindings:{mat:{uniform:t.uniformBlock},...t.bindings},hasFragment:i!==`depth`||o.NEEDS_DEPTH_FRAGMENT===1}}function L(e){let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`}var R=new l,z=new m,B=new o,_e=new s,V=new s,H=new WeakMap,ve=0,U=256,W=class{constructor(){this.pipelines=new Map,this.sharedPipelines=new Map,this.pipelineObjects=new WeakMap,this.nextPipelineObject=0,this.geometries=new WeakMap,this.capacity=8192,this.drawBuffer=null,this.drawData=null,this.drawCount=0,this.frame=-1,this.stats={draws:0,triangles:0,pipelines:0},this.passStats=[],this.reuseSceneMatrices=!1,this.sceneFrames=new WeakMap,this.pipelineJobs=[],this.pipelinePump=!1,this.drawLayout=null,this.drawBindGroup=null,this.syncPipelines=!0}_ensureDrawBuffer(){this.drawBuffer&&this.drawData.byteLength>=this.capacity*U||(this.drawBuffer&&this.drawBuffer.destroy(),this.drawBuffer=e.device.createBuffer({label:`draws`,size:this.capacity*U,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.drawData=new Float32Array(this.capacity*U/4),this.drawLayout=x([{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`,hasDynamicOffset:!0,minBindingSize:160}}],`draw`),this.drawBindGroup=e.device.createBindGroup({label:`draws`,layout:this.drawLayout,entries:[{binding:0,resource:{buffer:this.drawBuffer,size:160}}]}))}_beginFrame(){this.frame!==e.frame&&(this.frame=e.frame,this._ensureDrawBuffer(),this.drawCount>this.capacity*.75&&(this.capacity*=2,this._ensureDrawBuffer()),this.drawCount=0,e.onSubmit(()=>{this.drawCount&&e.queue.writeBuffer(this.drawBuffer,0,this.drawData.buffer,0,this.drawCount*U)}),this.stats.draws=0,this.stats.triangles=0,this.passStats.length=0)}_slot(t){let n=t.__draw;if(n||=t.__draw={frame:-1,slot:0,cur:new Float32Array(16),prev:new Float32Array(16),has:!1},n.frame===e.frame)return n.slot;if(this.drawCount>=this.capacity)throw Error(`MeshRenderer: draw buffer full`);n.frame=e.frame,n.slot=this.drawCount++;let r=t.matrixWorld.elements;n.has&&!t.resetVelocity?n.prev.set(n.cur):n.prev.set(r),n.cur.set(r),n.has=!0,t.resetVelocity=!1;let i=n.slot*U/4,a=this.drawData;a.set(n.cur,i),a.set(t.staticVelocity?n.cur:n.prev,i+16);let o=t.drawParams;if(a[i+32]=t.id??0,a[i+33]=o?o[0]:0,a[i+34]=o?o[1]:0,a[i+35]=o?o[2]:0,o&&o.length>3)for(let e=0;e<4;e++)a[i+36+e]=o[3+e]??0;return n.slot}_geometryGPU(e){let t=this.geometries.get(e);return t||(t={buffers:new Map,index:null,indexVersion:-1},this.geometries.set(e,t),e.addEventListener&&e.addEventListener(`dispose`,()=>{for(let e of t.buffers.values())e.buffer.destroy();t.index&&t.index.buffer.destroy(),this.geometries.delete(e)})),t}_attributeBuffer(t,n){let r=this._geometryGPU(t),i=n.isInterleavedBufferAttribute?n.data:n;if(i.gpuBuffer)return i.gpuBuffer.getGPU?i.gpuBuffer.getGPU():i.gpuBuffer;let a=r.buffers.get(i),o=i.version??0;if(a&&a.version===o&&a.array===i.array)return a.buffer;let s=ye(n);if((!a||a.size<s.byteLength)&&(a&&a.buffer.destroy(),a={buffer:e.device.createBuffer({label:n.name||`attribute`,size:Math.max(16,G(s.byteLength)),usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),size:s.byteLength,version:-1},r.buffers.set(i,a)),a.version!==o){let t=i.updateRanges&&i.updateRanges.length&&a.version>=0?i.updateRanges:null;if(t&&s.array===i.array){let n=i.array.BYTES_PER_ELEMENT;for(let r of t)e.queue.writeBuffer(a.buffer,r.start*n,i.array.buffer,i.array.byteOffset+r.start*n,G(r.count*n));i.clearUpdateRanges?i.clearUpdateRanges():i.updateRanges.length=0}else K(a.buffer,s);a.version=o}return a.array=i.array,a.buffer}_indexBuffer(t){let n=t.index;if(!n)return null;let r=this._geometryGPU(t);if(r.indexRef&&r.indexSrc===n.array&&r.indexVersion===(n.version??0))return r.indexRef;let i=n.array instanceof Uint16Array||n.array instanceof Uint32Array?n.array:new Uint32Array(n.array);return(!r.index||r.index.size<i.byteLength)&&(r.index&&r.index.buffer.destroy(),r.index={buffer:e.device.createBuffer({label:`index`,size:Math.max(16,G(i.byteLength)),usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),size:i.byteLength},r.indexVersion=-1),r.indexVersion!==(n.version??0)&&(K(r.index.buffer,i),r.indexVersion=n.version??0),r.indexSrc=n.array,r.indexRef={buffer:r.index.buffer,format:i instanceof Uint16Array?`uint16`:`uint32`},r.indexRef}_cachedLayout(e,t,n){let r=e.isInstancedMesh?e:t,i=H.get(r);i||H.set(r,i=new Map);let a=e.isInstancedMesh?e.instanceColor?2:1:0,o=a?n.id+`:`+a:n.id,s=i.get(o);if(s&&s.geometry===t&&s.version===n.version&&s.attrsVersion===t.attributesVersion&&(!a||s.instanceMatrix===e.instanceMatrix&&s.instanceColor===e.instanceColor)){let e=s.refs,n=s.names,r=t.attributes,i=!0;for(let t=0;t<n.length;t++)if(r[n[t]]!==e[t]){i=!1;break}if(i)return s.vl}let c=this._layout(e,t,n),l=c.layout.filter(e=>!e.name.startsWith(`instance`)).map(e=>e.name);return s={geometry:t,version:n.version,attrsVersion:t.attributesVersion,instanceMatrix:e.instanceMatrix,instanceColor:e.instanceColor,names:l,refs:l.map(e=>t.attributes[e]),vl:c},c.pipelines=new Map,i.set(o,s),c}_layout(e,t,n){let r=[],i=[`position`,`normal`,`uv`,`color`,...Object.keys(n.attributes)];for(let e of i){let i=t.attributes[e];i&&(e!==`color`||n.vertexColors||n.attributes.color)&&r.push({name:e,attr:i})}if(e.isInstancedMesh){for(let t=0;t<4;t++)r.push({name:`instanceMatrix`+t,attr:e.instanceMatrix,column:t});e.instanceColor&&r.push({name:`instanceColor`,attr:e.instanceColor})}let a=[],o=[],s=new Map,c=0;for(let e of r){let t=e.attr,r=t.isInterleavedBufferAttribute?t.data:t,i=!!(t.isInstancedBufferAttribute||r.isInstancedInterleavedBuffer||t.meshPerAttribute||r.meshPerAttribute)||e.name.startsWith(`instance`),l=J(t),u=s.get(r);if(u===void 0){u=a.length,s.set(r,u);let e=t.isInterleavedBufferAttribute?t.data.stride*l.bytesPerComponent:t.itemSize*l.bytesPerComponent;a.push({src:r,attr:t,layout:{arrayStride:l.converted?l.itemSize*4:e,stepMode:i?`instance`:`vertex`,attributes:[]}})}let d=t.isInterleavedBufferAttribute?t.offset*l.bytesPerComponent:0,f=l.format,p=l.wgsl;e.column!==void 0&&(d=e.column*16,f=`float32x4`,p=`vec4f`),a[u].layout.attributes.push({shaderLocation:c,offset:d,format:f}),(e.name===`position`||e.name===`normal`)&&(p=`vec3f`),e.name===`uv`&&(p=`vec2f`),e.name===`color`&&(p=t.itemSize===4?`vec4f`:`vec3f`),e.name===`instanceColor`&&(p=`vec3f`),n.attributes[e.name]&&(p=n.attributes[e.name]),o.push({name:e.name,wgsl:p,location:c,instanced:i}),c++}return{key:o.map(e=>`${e.name}:${e.wgsl}`).join(`,`)+`|`+a.map(e=>`${e.layout.arrayStride}/${e.layout.stepMode}/${e.layout.attributes.map(e=>e.format+`@`+e.offset).join(`;`)}`).join(`,`),layout:o,buffers:a}}_pipeline(t,n,r){t.__pkFrame!==e.frame&&(t.__pk=t.pipelineKey()+`|`+ae.version,t.__pkFrame=e.frame);let i=r.passKey,a=n.pipelines&&n.pipelines.get(i);if(a&&a.materialKey===t.__pk)return a.p;let o=`${t.__pk}|${n.key}|${i}`,s=this.pipelines.get(o);return s||=this._createPipeline(t,n,r,o),n.pipelines&&n.pipelines.set(i,{materialKey:t.__pk,p:s}),s}_createPipeline(t,n,r,i){if(!this.precompiling||this.syncPipelines){let e=this._buildPipeline(t,n,r);return this.pipelines.set(i,e),this.stats.pipelines=this.pipelines.size,e}let a=Object.assign(Object.create(Object.getPrototypeOf(t)),t),o=t.allDefines();a.allDefines=()=>({...o});let s={handle:{pipeline:null},bindings:null,label:t.name+` `+r.kind};this.pipelines.set(i,s),this.stats.pipelines=this.pipelines.size;let c=new Promise((e,t)=>this.pipelineJobs.push({material:a,vl:n,pass:{...r},p:s,resolve:e,reject:t}));return e._pending.add(c),c.then(()=>e._pending.delete(c),()=>e._pending.delete(c)),this.pipelinePump||(this.pipelinePump=!0,setTimeout(()=>this._pumpPipelines(),0)),s}_pumpPipelines(){let e=performance.now();do{let e=this.pipelineJobs.shift();try{Object.assign(e.p,this._buildPipeline(e.material,e.vl,e.pass)),e.resolve()}catch(t){e.p.handle.failed=!0,e.reject(t)}}while(this.pipelineJobs.length&&performance.now()-e<4);this.pipelineJobs.length?setTimeout(()=>this._pumpPipelines(),0):this.pipelinePump=!1}_buildPipeline(e,t,n){let r=ge(e,t.layout,n),i=d({modules:r.modules,bindings:r.bindings,code:r.code,defines:r.defines,stage:`render`,label:e.name}),o=g(i.code,e.name);this._ensureDrawBuffer();let s=[i.group0.layout,i.bindings.layout,this.drawLayout],c=a(e.blending),l=[];n.kind===`main`?l=[{format:n.colorFormats[0],blend:e.transparent||n.late?c:void 0,writeMask:e.colorWrite?GPUColorWrite.ALL:0},{format:n.colorFormats[1],blend:n.late?a(`premultiplied`):void 0,writeMask:e.colorWrite?GPUColorWrite.ALL:0},{format:n.colorFormats[2],blend:a(`normal`),writeMask:e.colorWrite?GPUColorWrite.ALL:0}]:n.kind===`color`&&(l=n.colorFormats.map(t=>({format:t,blend:c,writeMask:e.colorWrite?GPUColorWrite.ALL:0})));let u=e.side,f=n.cullOverride||(u===`double`?`none`:u===`back`?`front`:`back`),p=e.depthTest?e.depthCompare||n.depthCompare:`always`,m={label:e.name+` `+n.kind,vertex:{module:o,entryPoint:`vs`,buffers:t.buffers.map(e=>e.layout)},primitive:{topology:e.topology,cullMode:f,frontFace:`ccw`}};return r.hasFragment&&(m.fragment={module:o,entryPoint:`fs`,targets:l}),n.depthFormat&&(m.depthStencil={format:n.depthFormat,depthWriteEnabled:e.depthWrite,depthCompare:p,depthBias:n.kind===`depth`?n.depthBias||0:e.depthBias,depthBiasSlopeScale:n.kind===`depth`?n.depthBiasSlopeScale||0:e.depthBiasSlopeScale}),{handle:this._sharedPipeline(m,s),bindings:i.bindings,label:m.label}}_sharedPipeline(t,n){let r=e=>(this.pipelineObjects.has(e)||this.pipelineObjects.set(e,++this.nextPipelineObject),this.pipelineObjects.get(e)),{label:i,layout:a,vertex:o,fragment:s,...c}=t,l=JSON.stringify({...c,layouts:n.map(r),vertex:{...o,module:r(o.module)},fragment:s?{...s,module:r(s.module)}:null}),u=this.sharedPipelines.get(l);return u||(u=e.renderPipeline({...t,layout:e.device.createPipelineLayout({bindGroupLayouts:n})}),this.sharedPipelines.set(l,u)),u}prepareScene(t){this.reuseSceneMatrices&&this.sceneFrames.get(t)===e.frame||(t.updateMatrixWorld(),this.sceneFrames.set(t,e.frame))}collect(e,{camera:t,layerMask:n=4294967295,filter:r=null,kind:i=`main`,cull:a=!0,updateMatrices:o=!0}){let s=[],c=[];t&&(t.updateMatrixWorld(),B.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse.copy(t.matrixWorld).invert()),z.setFromProjectionMatrix(B,t.reversedDepth!==!1),V.setFromMatrixPosition(t.matrixWorld));let l=this.precompiling,u=e=>{if(e.visible||l){e.isMesh&&e.material&&e.geometry&&(e.layers.mask&n)!==0&&(!r||r(e))&&(i!==`depth`||e.castShadow)&&(l||!a||!t||e.frustumCulled===!1||this._inFrustum(e))&&(e.onBeforeRender&&e.onBeforeRender(null,null,t,e.geometry,e.material,null),(e.visible||l)&&this._addItems(e,s,c));for(let t of e.children)u(t)}};return o&&this.prepareScene(e),u(e),s.sort((e,t)=>e.renderOrder-t.renderOrder||e.pipeKey-t.pipeKey||e.z-t.z),c.sort((e,t)=>e.renderOrder-t.renderOrder||t.z-e.z),{opaque:s,transparent:c}}_inFrustum(e){let t=null;return e.isInstancedMesh?(!e.boundingSphere&&e.computeBoundingSphere&&e.computeBoundingSphere(),t=e.boundingSphere):(e.geometry.boundingSphere||e.geometry.computeBoundingSphere(),t=e.geometry.boundingSphere),!t||t.radius<0||!Number.isFinite(t.radius)||(R.copy(t).applyMatrix4(e.matrixWorld),z.intersectsSphere(R))}_addItems(e,t,n){let r=e.geometry,i=Array.isArray(e.material)?e.material:null,a=_e.setFromMatrixPosition(e.matrixWorld).distanceToSquared(V),o=(i,o,s)=>{if(!i||!i.visible&&!this.precompiling)return;let c={object:e,geometry:r,material:i,start:o,count:s,z:a,renderOrder:e.renderOrder||0,pipeKey:i.id};(i.transparent?n:t).push(c)},s=r.drawRange||{start:0,count:1/0};if(i&&r.groups&&r.groups.length)for(let e of r.groups){let t=Math.max(e.start,s.start),n=Math.min(e.start+e.count,s.start+s.count);n>t&&o(i[e.materialIndex],t,n-t)}else o(i?i[0]:e.material,s.start,s.count)}render(t,n){this._beginFrame();let r=performance.now(),i=this.stats.draws,a=this.stats.triangles;n={kind:`main`,late:!1,colorFormats:[],depthFormat:null,depthCompare:`greater-equal`,frameBlock:b,layerMask:4294967295,...n},!n.timestampWrites&&this.profiler?.enabled&&(n.timestampWrites=this.profiler.pass(n.label||n.kind)),n.passKey=`${n.kind}.${+!!n.late}.${n.colorFormats.join(`,`)}.${n.depthFormat}.${n.depthCompare}.${n.cullOverride||``}.${n.defines?JSON.stringify(n.defines):``}`;let o=n.items||this.collect(t,n),s=performance.now(),c=e.getEncoder(),l=(n.colorViews||[]).map((e,t)=>{let r=n.clearColors?n.clearColors[t]:null;return{view:e,loadOp:r?`clear`:`load`,storeOp:`store`,clearValue:r||[0,0,0,0]}}),u={label:n.label||n.kind,colorAttachments:l};n.depthView&&(u.depthStencilAttachment={view:n.depthView,depthLoadOp:n.clearDepth===null||n.clearDepth===void 0?`load`:`clear`,depthStoreOp:`store`,depthClearValue:n.clearDepth??0}),n.timestampWrites&&(u.timestampWrites=n.timestampWrites);let d=c.beginRenderPass(u);n.viewport&&d.setViewport(...n.viewport),d.setBindGroup(0,f(n.frameBlock,`render`).getBindGroup()),this.drawItems(d,o.opaque,n),n.betweenLists&&n.betweenLists(d),this.drawItems(d,o.transparent,n),n.after&&n.after(d),d.end(),this.passStats.length<32&&this.passStats.push({name:n.label||n.kind,ms:performance.now()-r,collectMs:s-r,draws:this.stats.draws-i,triangles:this.stats.triangles-a})}drawItems(t,n,r){let i=null,a=null,o=++ve;for(let s of n){let{object:n,geometry:c,material:l}=s;if(!c.attributes.position&&!c.vertexCount&&!c.indirect)continue;let u,d;if(this.precompiling){try{u=this._cachedLayout(n,c,l),d=this._pipeline(l,u,r)}catch{continue}continue}let f=n.isInstancedMesh?n.count:c.instanceCount??1;if(f===0||s.count<=0)continue;u=this._cachedLayout(n,c,l),d=this._pipeline(l,u,r);let p=d.handle.pipeline||(this.syncPipelines?e.ready(d.handle):null);if(!p)continue;d!==i&&(t.setPipeline(p),i=d);let m=d.bindings.getBindGroup(o);m!==a&&(t.setBindGroup(1,m),a=m),t.setBindGroup(2,this.drawBindGroup,[this._slot(n)*U]);for(let e=0;e<u.buffers.length;e++)t.setVertexBuffer(e,this._attributeBuffer(c,u.buffers[e].attr));let h=this._indexBuffer(c);if(c.indirect){let e=c.indirect.buffer.getGPU?c.indirect.buffer.getGPU():c.indirect.buffer,n=c.indirect.offsets||[c.indirect.offset||0];h&&t.setIndexBuffer(h.buffer,h.format);for(let r of n)h?t.drawIndexedIndirect(e,r):t.drawIndirect(e,r),this.stats.draws++;continue}if(h){let e=Math.min(s.count,c.index.count-s.start);if(e<=0)continue;t.setIndexBuffer(h.buffer,h.format),t.drawIndexed(e,f===1/0?1:f,s.start,0,0),this.stats.triangles+=e/3*f}else{let e=c.attributes.position?c.attributes.position.count:c.vertexCount,n=Math.min(s.count,e-s.start);if(n<=0)continue;t.draw(n,f,s.start,0),this.stats.triangles+=n/3*f}this.stats.draws++}}};function G(e){return Math.ceil(e/4)*4}function K(t,n){if(n.byteLength%4==0){e.queue.writeBuffer(t,0,n.buffer,n.byteOffset,n.byteLength);return}let r=new Uint8Array(G(n.byteLength));r.set(new Uint8Array(n.buffer,n.byteOffset,n.byteLength)),e.queue.writeBuffer(t,0,r)}var q=new WeakMap;function ye(e){let t=e.isInterleavedBufferAttribute?e.data:e;if(!J(e).converted)return t.array;let n=q.get(t);if(n&&n.version===t.version)return n.array;let r=e.count,i=e.itemSize,a=new Float32Array(r*i),o=e.normalized?be(t.array):1;for(let e=0;e<r*i;e++)a[e]=t.array[e]/o;return q.set(t,{version:t.version,array:a}),a}function be(e){return e instanceof Uint8Array?255:e instanceof Int8Array?127:e instanceof Uint16Array?65535:e instanceof Int16Array?32767:1}function J(e){let t=(e.isInterleavedBufferAttribute?e.data:e).array,n=e.itemSize,r=e.normalized,i=e=>n===1?e:`vec${n}${e===`f32`?`f`:e===`u32`?`u`:`i`}`;if(t instanceof Float32Array)return{format:n===1?`float32`:`float32x${n}`,wgsl:i(`f32`),bytesPerComponent:4,itemSize:n};if(t instanceof Uint32Array)return{format:n===1?`uint32`:`uint32x${n}`,wgsl:i(`u32`),bytesPerComponent:4,itemSize:n};if(t instanceof Int32Array)return{format:n===1?`sint32`:`sint32x${n}`,wgsl:i(`i32`),bytesPerComponent:4,itemSize:n};let a={Uint8Array:[`uint8`,`unorm8`,1],Int8Array:[`sint8`,`snorm8`,1],Uint16Array:[`uint16`,`unorm16`,2],Int16Array:[`sint16`,`snorm16`,2]}[t.constructor.name];return a&&(n===2||n===4)&&!e.isInterleavedBufferAttribute?{format:(r?a[1]:a[0])+`x`+n,wgsl:i(r?`f32`:t instanceof Uint8Array||t instanceof Uint16Array?`u32`:`i32`),bytesPerComponent:a[2],itemSize:n}:{format:n===1?`float32`:`float32x${n}`,wgsl:i(`f32`),bytesPerComponent:4,itemSize:n,converted:!0}}var xe=class{constructor(e){this.container=e,this.renderScale=1,this.clock=new oe,this.frame=0,this.onResize=[]}async init(){let t=document.createElement(`canvas`);t.tabIndex=0,this.container.appendChild(t),this.canvas=t,this.domElement=t,await e.init({canvas:t}),this.meshRenderer=new W,this.meshRenderer.syncPipelines=!1,this.meshRenderer.reuseSceneMatrices=!0,this.camera=new ee(62,window.innerWidth/window.innerHeight,.06,6e4),this.scene=new w,window.addEventListener(`resize`,()=>this.resize()),this.resize()}setRenderScale(e){this.renderScale=e,this.resize()}get width(){return this.canvas.width}get height(){return this.canvas.height}resize(){let e=window.innerWidth,t=window.innerHeight,n=this.renderScale;this.canvas.width=Math.max(1,Math.floor(e*n)),this.canvas.height=Math.max(1,Math.floor(t*n)),this.canvas.style.width=e+`px`,this.canvas.style.height=t+`px`,this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),b.fields.outputResolution.value.set(this.canvas.width,this.canvas.height);for(let n of this.onResize)n(e,t)}currentTexture(){return e.context.getCurrentTexture()}start(e){let t=n=>{this.clock.update(n);let r=this.clock.getDelta();r>.1&&(r=.1),this.frame++,e(r,this.clock.getElapsed()),this._raf=requestAnimationFrame(t)};this._raf=requestAnimationFrame(t)}stop(){cancelAnimationFrame(this._raf)}},Se=class{constructor({label:t=`kernel`,modules:n=[],bindings:r={},code:i,workgroupSize:a=[64,1,1],defines:o={},entryPoint:s=`main`}){this.label=t,this.workgroupSize=a;let[c,l=1,u=1]=a,f=i.replace(/\bWG_X\b/g,c).replace(/\bWG_Y\b/g,l).replace(/\bWG_Z\b/g,u),p=d({modules:n,bindings:r,code:f,defines:o,stage:`compute`,label:t});this.source=p.code,this.bindings=p.bindings,this.group0=p.group0;let m=g(p.code,t);this.handle=e.computePipeline({label:t,layout:e.device.createPipelineLayout({bindGroupLayouts:[p.group0.layout,p.bindings.layout]}),compute:{module:m,entryPoint:s}}),this.timestampWrites=null}get pipeline(){return e.ready(this.handle)}dispatch(t,{pass:n=null,indirect:r=null}={}){let[i,a=1,o=1]=Array.isArray(t)?t:[t];if(!r&&(i===0||a===0||o===0))return;let s=t=>{t.setPipeline(e.ready(this.handle)),t.setBindGroup(0,this.group0.getBindGroup()),t.setBindGroup(1,this.bindings.getBindGroup()),r?t.dispatchWorkgroupsIndirect(r.buffer.getGPU?r.buffer.getGPU():r.buffer,r.offset||0):t.dispatchWorkgroups(i,a,o)};n?s(n):e.computePass(this.label,s,this.timestampWrites||void 0)}groups(e,t=1,n=1){let[r,i=1,a=1]=this.workgroupSize;return[Math.ceil(e/r),Math.ceil(t/i),Math.ceil(n/a)]}},Ce=e=>`
	let sj = v.skinIndex;
	let sw = v.skinWeight;
	let sk = skinJoints[ sj.x ] * sw.x + skinJoints[ sj.y ] * sw.y + skinJoints[ sj.z ] * sw.z + skinJoints[ sj.w ] * sw.w;
	let skp = skinJoints[ sj.x + ${e}u ] * sw.x + skinJoints[ sj.y + ${e}u ] * sw.y + skinJoints[ sj.z + ${e}u ] * sw.z + skinJoints[ sj.w + ${e}u ] * sw.w;
	let lp = vec4f( v.position, 1.0 );
	let lm = v.model * sk;
	v.useWorld = true;
	v.worldPos = ( lm * lp ).xyz;
	v.worldNormal = cofactor3( lm ) * v.normal;
	v.prevWorldPos = ( v.prevModel * skp * lp ).xyz;
`;function we({name:e,joints:t,jointBuffer:n,textures:i={},alphaMode:a=`OPAQUE`,alphaCutoff:o=.5,doubleSided:s=!1,surface:c=``,uniforms:l={},color:u=null,roughness:d=1,metalness:f=1,defines:p={},modules:m=[]}){let h={};i.albedo&&(h.chAlbedo=i.albedo),i.normal&&(h.chNormal=i.normal),i.orm&&(h.chOrm=i.orm);let g=`
#if HAS_ALBEDO
	let ca = textureSample( chAlbedo, smpAnisoRepeat, in.uv );
	s.albedo *= ca.rgb;
	s.alpha *= ca.a;
#endif
#if HAS_ORM
	let orm = textureSample( chOrm, smpAnisoRepeat, in.uv );
	s.roughness *= orm.g;
	s.metalness *= orm.b;
#endif
#if HAS_NORMAL
	let nm = textureSample( chNormal, smpAnisoRepeat, in.uv ).xyz * 2.0 - 1.0;
	s.normal = perturbNormalByMap( in.P, in.N, in.uv, nm );
#endif
${c}
`;return new r({name:e,modules:m,attributes:{skinIndex:`vec4u`,skinWeight:`vec4f`},storage:{skinJoints:{storage:n,access:`read`}},textures:h,uniforms:l,color:u||void 0,roughness:d,metalness:f,vertex:Ce(t),surface:g,side:s?`double`:`front`,alphaTest:a===`MASK`||a===`BLEND`?o:0,defines:{HAS_ALBEDO:+!!h.chAlbedo,HAS_ORM:+!!h.chOrm,HAS_NORMAL:+!!h.chNormal,...p}})}function Te(e,t,n,r,i){let a=r[0],o=r[1],s=r[2],c=r[3],l=a+a,u=o+o,d=s+s,f=a*l,p=a*u,m=a*d,h=o*u,g=o*d,_=s*d,v=c*l,y=c*u,b=c*d,x=i[0],S=i[1],C=i[2];e[t]=(1-(h+_))*x,e[t+1]=(p+b)*x,e[t+2]=(m-y)*x,e[t+3]=0,e[t+4]=(p-b)*S,e[t+5]=(1-(f+_))*S,e[t+6]=(g+v)*S,e[t+7]=0,e[t+8]=(m+y)*C,e[t+9]=(g-v)*C,e[t+10]=(1-(f+h))*C,e[t+11]=0,e[t+12]=n[0],e[t+13]=n[1],e[t+14]=n[2],e[t+15]=1}function Ee(e,t,n,r,i,a){for(let o=0;o<4;o++){let s=i[a+o*4],c=i[a+o*4+1],l=i[a+o*4+2],u=i[a+o*4+3];for(let i=0;i<4;i++)e[t+o*4+i]=n[r+i]*s+n[r+4+i]*c+n[r+8+i]*l+n[r+12+i]*u}}function De(e,t,n){let r=e.times,i=e.values,a=e.path===`rotation`?4:3,o=r.length;if(o===1||t<=r[0]){for(let e=0;e<a;e++)n[e]=i[e];return}if(t>=r[o-1]){for(let e=0;e<a;e++)n[e]=i[(o-1)*a+e];return}let s=e._k||0;for(r[s]>t&&(s=0);s<o-2&&r[s+1]<=t;)s++;e._k=s;let c=e.step?0:(t-r[s])/(r[s+1]-r[s]),l=s*a,u=(s+1)*a;if(a===4){let e=i[l]*i[u]+i[l+1]*i[u+1]+i[l+2]*i[u+2]+i[l+3]*i[u+3]<0?-c:c,t=i[l]*(1-c)+i[u]*e,r=i[l+1]*(1-c)+i[u+1]*e,a=i[l+2]*(1-c)+i[u+2]*e,o=i[l+3]*(1-c)+i[u+3]*e,s=1/Math.hypot(t,r,a,o);n[0]=t*s,n[1]=r*s,n[2]=a*s,n[3]=o*s}else for(let e=0;e<3;e++)n[e]=i[l+e]+(i[u+e]-i[l+e])*c}var Oe=new WeakMap,ke=class n{static async create(e,{materials:t=null,textureSize:r=null}={}){let i=new n(e);return await i._buildMeshes(t),i}constructor(e){this.gltf=e;let t=e.skins[0];if(!t)throw Error(`SkinnedModel: no skin`);this.skin=t;let n=e.nodes.length;this.nodeCount=n,this.joints=t.joints.length,this.rest=e.nodes.map(e=>({t:Float32Array.from(e.t),r:Float32Array.from(e.r),s:Float32Array.from(e.s)})),this.local=e.nodes.map(e=>({t:Float32Array.from(e.t),r:Float32Array.from(e.r),s:Float32Array.from(e.s)})),this.world=new Float32Array(n*16),this._localM=new Float32Array(16),this.order=[],this.parent=new Int32Array(n).fill(-1);let r=t=>{this.order.push(t);for(let n of e.nodes[t].children)this.parent[n]=t,r(n)};for(let t of e.roots)r(t);this.jointData=new Float32Array(this.joints*32),this.jointBuffer=new O({label:`skinJoints`,count:this.joints*2,type:`mat4x4f`}),this._first=!0,this.clips=new Map;for(let t of e.animations)this.clips.set(t.name,t);this.layers=[],this._acc=e.nodes.map(()=>({t:new Float32Array(3),r:new Float32Array(4),s:new Float32Array(3),wt:0,wr:0,ws:0})),this._tmp=new Float32Array(4),this.group=new C,this.group.name=`SkinnedModel`,this.meshes=[],this.materials=[],this.onClipEnd=null,this.onPose=null,this._pose()}async _buildMeshes(n){let r=this.gltf,a=Oe.get(r);(!a||a.device!==e.device)&&(a={device:e.device,textures:new Map},Oe.set(r,a));let o=a.textures,s=async(e,n)=>{if(!e)return null;let a=r.textures[e.index].source,s=a+(n?`s`:`l`);if(!o.has(s)){let e=(async()=>{let e=r.images[a],o=await i(e.bytes,e.mimeType),s=new k({label:`char`+a,width:o.width,height:o.height,format:n?`rgba8unorm-srgb`:`rgba8unorm`,data:o.data,mips:!0,usage:[`sample`,`copyDst`],sampler:`anisoRepeat`});return s.getGPU(),t(s),s})();o.set(s,e),e.catch(()=>{o.get(s)===e&&o.delete(s)})}return o.get(s)},c=r.nodes.findIndex(e=>e.mesh!==void 0&&e.skin!==void 0),l=r.meshes[r.nodes[c].mesh],u=new Map;for(let e of l){let t=new S,i=e.attributes;t.setAttribute(`position`,new E(i.POSITION.array,3)),i.NORMAL&&t.setAttribute(`normal`,new E(i.NORMAL.array,3)),i.TEXCOORD_0&&t.setAttribute(`uv`,new E(Ae(i.TEXCOORD_0),2)),t.setAttribute(`skinIndex`,new E(Uint32Array.from(i.JOINTS_0.array),4)),t.setAttribute(`skinWeight`,new E(je(Ae(i.WEIGHTS_0)),4)),e.indices&&t.setIndex(new E(e.indices instanceof Uint32Array||e.indices instanceof Uint16Array?e.indices:Uint32Array.from(e.indices),1)),t.computeBoundingSphere();let a=u.get(e.material);if(!a){let t=r.materials[e.material]||{},i=t.pbrMetallicRoughness||{},o={gltfMaterial:t,name:t.name||`material`,textures:{albedo:await s(i.baseColorTexture,!0),orm:await s(i.metallicRoughnessTexture,!1),normal:await s(t.normalTexture,!1)},alphaMode:t.alphaMode||`OPAQUE`},c=n&&n(o)||{};a=we({name:`skinned-`+o.name,joints:this.joints,jointBuffer:this.jointBuffer,textures:o.textures,alphaMode:o.alphaMode,alphaCutoff:t.alphaCutoff??.5,doubleSided:!!t.doubleSided,roughness:i.roughnessFactor??1,metalness:i.metallicFactor??1,...c}),u.set(e.material,a),this.materials.push(a)}let o=new T(t,a);o.name=`skinned:`+(r.materials[e.material]?.name||``),o.frustumCulled=!1,o.castShadow=!0,o.receiveShadow=!0,this.group.add(o),this.meshes.push(o)}}clipNames(){return[...this.clips.keys()]}clipDuration(e){let t=this.clips.get(e);return t?t.duration:0}play(e,{fade:t=.4,loop:n=!0,speed:r=1,from:i=0}={}){let a=this.clips.get(e);if(!a)throw Error(`SkinnedModel: no clip `+e);let o=this.layers.find(e=>e.clip===a&&e.target===1);if(o)return o;let s={clip:a,time:i,weight:+!this.layers.length,target:1,fade:Math.max(t,.001),loop:n,speed:r,ended:!1};for(let e of this.layers)e.target=0,e.fade=s.fade;return this.layers.push(s),s}get current(){let e=this.layers.find(e=>e.target===1);return e?e.clip.name:null}hold(){if(this._held)return;let e=this.joints,t=this.jointData;t.copyWithin(e*16,0,e*16),this.jointBuffer.write(t),this._held=!0}update(e){e===0&&(this._first=!0),this._held=!1;for(let t of this.layers){t.time+=e*t.speed;let n=t.clip.duration;t.time>=n&&(t.loop&&n>0?t.time%=n:(t.time=n,t.ended||(t.ended=!0,t.target===1&&this.onClipEnd&&this.onClipEnd(t.clip.name))));let r=e/t.fade;t.weight=t.target>t.weight?Math.min(t.target,t.weight+r):Math.max(t.target,t.weight-r)}this.layers=this.layers.filter(e=>e.target>0||e.weight>1e-4);let t=0;for(let e of this.layers)t+=e.weight;if(t>1e-4)for(let e of this.layers)e.weight/=t;this._pose()}nodeIndex(e){return this.gltf.nodes.findIndex(t=>t.name===e)}_pose(){let e=this.nodeCount,t=this._acc,n=this._tmp;for(let n=0;n<e;n++){let e=t[n];e.wt=e.wr=e.ws=0,e.t.fill(0),e.r.fill(0),e.s.fill(0)}for(let e of this.layers)if(!(e.weight<=0))for(let r of e.clip.channels){let i=t[r.node];if(De(r,e.time,n),r.path===`rotation`){let t=i.r[0]*n[0]+i.r[1]*n[1]+i.r[2]*n[2]+i.r[3]*n[3]<0?-e.weight:e.weight;for(let e=0;e<4;e++)i.r[e]+=n[e]*t;i.wr+=e.weight}else if(r.path===`translation`){for(let t=0;t<3;t++)i.t[t]+=n[t]*e.weight;i.wt+=e.weight}else{for(let t=0;t<3;t++)i.s[t]+=n[t]*e.weight;i.ws+=e.weight}}for(let n=0;n<e;n++){let e=t[n],r=this.local[n],i=this.rest[n];for(let t=0;t<3;t++)r.t[t]=e.t[t]+i.t[t]*(1-Math.min(e.wt,1)),r.s[t]=e.s[t]+i.s[t]*(1-Math.min(e.ws,1));if(e.wr>0){let t=1-Math.min(e.wr,1),n=e.r[0]*i.r[0]+e.r[1]*i.r[1]+e.r[2]*i.r[2]+e.r[3]*i.r[3]<0?-t:t,a=e.r[0]+i.r[0]*n,o=e.r[1]+i.r[1]*n,s=e.r[2]+i.r[2]*n,c=e.r[3]+i.r[3]*n,l=1/Math.hypot(a,o,s,c);r.r[0]=a*l,r.r[1]=o*l,r.r[2]=s*l,r.r[3]=c*l}else r.r.set(i.r)}this.onPose&&this.onPose(this.local);let r=this.world,i=this._localM;for(let e of this.order){let t=this.local[e];Te(i,0,t.t,t.r,t.s);let n=this.parent[e];n<0?r.set(i,e*16):Ee(r,e*16,r,n*16,i,0)}let a=this.joints,o=this.jointData,s=this.skin.inverseBindMatrices;this._first||o.copyWithin(a*16,0,a*16);for(let e=0;e<a;e++)Ee(o,e*16,r,this.skin.joints[e]*16,s,e*16);this._first&&=(o.copyWithin(a*16,0,a*16),!1),this.jointBuffer.write(o)}nodeWorld(e,t){let n=this.gltf.nodes.findIndex(t=>t.name===e);if(n<0)return null;let r=this.world;return t.set(r[n*16+12],r[n*16+13],r[n*16+14])}dispose(){this.jointBuffer.destroy();for(let e of this.meshes)e.geometry.dispose&&e.geometry.dispose()}};function Ae(e){if(e.array instanceof Float32Array)return e.array;let t=e.normalized?1/(e.array instanceof Uint8Array?255:e.array instanceof Uint16Array?65535:1):1;return Float32Array.from(e.array,e=>e*t)}function je(e){for(let t=0;t<e.length;t+=4){let n=e[t]+e[t+1]+e[t+2]+e[t+3];if(n>0)for(let r=0;r<4;r++)e[t+r]/=n;else e[t]=1}return e}var Y={DROPLET:0,MIST:1,LIGAMENT:2,SPRAY:3,SHEET:4},X={tau:[3,.35,5,1.8,2.5],grav:[v,.3,v,8.5,v],turb:[0,.5,0,.3,.1],grow:[0,.22,0,.3,.7],dies:[1,0,1,1,1],deposit:[1,0,3,4,2],stretch:[1/40,0,1/40,1/30,1/60],alpha:[.55,.06,.8,.66,.22],fadeIn:[.02,.2,.02,.12,.02],fadeOut:[.8,.45,.8,.7,.5]},Me=e=>{let t=String(e);return/[.e]/.test(t)?t:t+`.0`},Z=(e,t)=>`sprayByKind( ${e}, ${t.map(Me).join(`, `)} )`,Ne=32,Q=new _({name:`sprayCommon`,deps:[D],code:`
const SPRAY_DROPLET: f32 = 0.0;
const SPRAY_MIST: f32 = 1.0;
const SPRAY_LIGAMENT: f32 = 2.0;
const SPRAY_SPRAY: f32 = 3.0;
const SPRAY_SHEET: f32 = 4.0;

// PCG hash of a uint -> [0, 1)
fn sprayHash( seed: u32 ) -> f32 {
	let state = seed * 747796405u + 2891336453u;
	let word = ( ( state >> ( ( state >> 28u ) + 4u ) ) ^ state ) * 277803737u;
	return f32( ( word >> 22u ) ^ word ) * ( 1.0 / 4294967296.0 );
}

// select a per-kind constant
fn sprayByKind( kind: f32, a: f32, b: f32, c: f32, d: f32, e: f32 ) -> f32 {
	return select( select( select( select( e, d, kind < 3.5 ), c, kind < 2.5 ), b, kind < 1.5 ), a, kind < 0.5 );
}

// Henyey-Greenstein phase (1/sr)
fn sprayPhaseHG( cosT: f32, g: f32 ) -> f32 {
	let g2 = g * g;
	return ( ( 1.0 - g2 ) / ( 4.0 * PI ) ) / pow( max( 1.0 + g2 - 2.0 * g * cosT, 1e-4 ), 1.5 );
}
`}),Pe=class{constructor(e,{query:t,terrain:n,sceneCopy:r,clouds:i=null,gpuCapacity:a=32768,cpuCapacity:l=8192}){this.renderer=e,this.query=t,this.terrain=n,this.clouds=i,this.shoreSim=null,this.waveShadow=null,this.NG=a,this.NC=l,this.N=a+l;let u=this.N;this.pos=new O({label:`sprayPos`,count:u,type:`vec4f`}),this.vel=new O({label:`sprayVel`,count:u,type:`vec4f`}),this.info=new O({label:`sprayInfo`,count:u,type:`vec4f`}),this.head=new O({label:`sprayHead`,count:1,type:`u32`}),this.reqData=new Float32Array(512),this.reqBuffer=new O({label:`sprayReq`,count:128,type:`vec4f`}),this.nReq=0,this.nReqParticles=0,this.cpuHead=0,this._frame=0,this.simParams=new p(`SprayParams`,{frameSeed:[`u32`,0],cpuStart:[`u32`,0],cpuCount:[`u32`,0],reqCount:[`u32`,0],bodyMat:[`mat4x4f`,new o],bodyInv:[`mat4x4f`,new o],bodyVel:[`vec3f`,new s],bodyOn:[`f32`,0],bodyHull:[`vec4f`,new c(0,0,1,0)],bodyHullWL:[`vec4f`,new c(0,1,0,0)],bodySheer:[`vec4f`,new c(0,0,-1,0)],bodyBoxMin:[`vec3f`,new s],bodyBoxMax:[`vec3f`,new s]},{label:`spray params`});let d=this.simParams.fields;this.cpuStart=d.cpuStart,this.cpuCount=d.cpuCount,this.reqCount=d.reqCount,this.frameSeed=d.frameSeed,this.body={on:d.bodyOn,mat:d.bodyMat,inv:d.bodyInv,vel:d.bodyVel,hull:d.bodyHull,hullWL:d.bodyHullWL,sheer:d.bodySheer,boxMin:d.bodyBoxMin,boxMax:d.bodyBoxMax},this.module=new _({name:`spray`,deps:[Q],uniforms:this.simParams,uniformName:`sprayParams`,bindings:{sprayPos:{storage:this.pos,access:`read_write`},sprayVel:{storage:this.vel,access:`read_write`},sprayInfo:{storage:this.info,access:`read_write`},sprayHead:{storage:this.head,access:`read_write`,wgslType:`array<atomic<u32>>`}},code:`
const SPRAY_NG: u32 = ${this.NG}u;
const SPRAY_NC: u32 = ${this.NC}u;
const SPRAY_N: u32 = ${this.N}u;

// Reserve n ring slots of the GPU part; returns the base (pass it to spraySlot)
fn sprayReserve( n: u32 ) -> u32 { return atomicAdd( &sprayHead[ 0 ], n ); }
fn spraySlot( base: u32, i: u32 ) -> u32 { return ( base + i ) & ( SPRAY_NG - 1u ); }

fn sprayWrite( slot: u32, p: vec3f, v: vec3f, size: f32, kind: f32, life: f32, seed: f32 ) {
	sprayPos[ slot ] = vec4f( p, 0.0 );
	sprayVel[ slot ] = vec4f( v, size );
	sprayInfo[ slot ] = vec4f( kind, life, p.y, seed );
}

fn sprayRand( a: u32, b: u32 ) -> f32 {
	return sprayHash( a + b * 1664525u + sprayParams.frameSeed * 2654435761u );
}
`}),this.updateKernel=null,this._buildMesh(r)}emit(e,t,n,r=.04,i=Y.DROPLET,a={}){if(this.nReq>=Ne||n<=0||(n=Math.min(Math.round(n),this.NC-this.nReqParticles),n<=0))return;let{spread:o=.6,jitter:s=.05,life:c=i===Y.MIST?2.5:1.6,to:l=null,sizeJitter:u=.5}=a,d=l||e,f=this.reqData,p=this.nReq*16;this.nReqParticles+=n,f[p]=e.x,f[p+1]=e.y,f[p+2]=e.z,f[p+3]=this.nReqParticles,f[p+4]=d.x,f[p+5]=d.y,f[p+6]=d.z,f[p+7]=r,f[p+8]=t.x,f[p+9]=t.y,f[p+10]=t.z,f[p+11]=i,f[p+12]=o,f[p+13]=s,f[p+14]=c,f[p+15]=u,this.nReq++}emitAlongPoints(e,t,n,r=.04,i=Y.DROPLET,a={}){let o=Object.assign(this._segOpts||={},a);for(let a=0;a+1<e.length;a++)o.to=e[a+1],this.emit(e[a],Array.isArray(t)?t[a]:t,n,r,i,o);o.to=null}setBodyShape({zAft:e,zShoulder:t,zStem:n,halfBeam:r,wlShoulder:i,wlStem:a,wlHalfBeam:o,ySheerAft:s,ySheerStem:c,yBottom:l,boxMin:u,boxMax:d}){let f=this.body;f.hull.value.set(e,t,n,r),f.hullWL.value.set(i,a,o,0),f.sheer.value.set(s,c,l,0),f.boxMin.value.copy(u),f.boxMax.value.copy(d)}setBody(e,t){let n=this.body;n.on.value=+!!e,e&&(n.mat.value.copy(e),n.inv.value.copy(e).invert(),n.vel.value.copy(t))}_hooks(){if(this._hookModule)return this._hookModule;let e=[],t=``;return this.clouds&&this.clouds.module?(e.push(this.clouds.module),t+=`fn sprayCloudShadow( xz: vec2f ) -> f32 { return cloudsShadow( xz ); }
`):t+=`fn sprayCloudShadow( xz: vec2f ) -> f32 { return 1.0; }
`,this.waveShadow?(e.push(this.waveShadow.module||this.waveShadow),t+=`fn sprayWaveShadow( p: vec3f, tag: f32 ) -> f32 { return breakersSprayShadow( p, tag ); }
`):t+=`fn sprayWaveShadow( p: vec3f, tag: f32 ) -> f32 { return 1.0; }
`,this._hookModule=new _({name:`sprayHooks`,deps:e,code:t}),this._hookModule}_buildUpdate(){let e=this.NG,t=this.NC,n=this.shoreSim,r=n&&n.depositModule,i=[this.module,this.query.module,this.terrain.module];r&&i.push(r),this.updateKernel=new Se({label:`Spray Update`,modules:i,bindings:{sprayReq:{storage:this.reqBuffer,access:`read`}},workgroupSize:[64,1,1],code:`
// Push a particle out of the body (hull or box) through the nearest face; the velocity into it
// (relative to the body) is removed and the rest damped (the water runs off as a film); drops
// that hit it die soon after.
fn sprayCollideBody( p: ptr<function, vec3f>, v: ptr<function, vec3f>, age: f32, life: ptr<function, f32>, isMist: bool ) {
	if ( sprayParams.bodyOn < 0.5 ) { return; }
	var q = ( sprayParams.bodyInv * vec4f( *p, 1.0 ) ).xyz;
	let H = sprayParams.bodyHull; let W = sprayParams.bodyHullWL; let S = sprayParams.bodySheer;
	// hull: the outline at this height (waterline -> sheer), half breadth at q.z (elliptic bow)
	let sheer = mix( S.x, S.y, sat( ( q.z - H.x ) / max( H.z - H.x, 0.01 ) ) );
	let fh = sat( q.y / max( sheer, 0.1 ) );
	let zSh = mix( W.x, H.y, fh ); let zSt = mix( W.y, H.z, fh ); let HB = mix( W.z, H.w, fh );
	let bowL = max( zSt - zSh, 0.01 );
	let e = sat( ( q.z - zSh ) / bowL );
	let c = sqrt( max( 1.0 - e * e, 0.02 ) );
	let hb = HB * c;
	let inHull = q.z > H.x && q.z < zSt && abs( q.x ) < hb && q.y < sheer && q.y > S.z;
	let b0 = sprayParams.bodyBoxMin; let b1 = sprayParams.bodyBoxMax;
	let inBox = q.x > b0.x && q.x < b1.x && q.y > b0.y && q.y < b1.y && q.z > b0.z && q.z < b1.z;
	if ( inHull || inBox ) {
		var n = vec3f( 0.0, 1.0, 0.0 );
		if ( inHull ) {
			let sx = select( - 1.0, 1.0, q.x > 0.0 );
			if ( hb - abs( q.x ) < sheer - q.y ) {
				// through the side; on the bow the side faces forward too (- d hb / dz)
				n = normalize( vec3f( sx, 0.0, HB * e / ( c * bowL ) ) );
				q.x = sx * ( hb + 0.02 );
			} else {
				q.y = sheer + 0.02;
			}
		} else {
			let dx = min( q.x - b0.x, b1.x - q.x );
			let dz = min( q.z - b0.z, b1.z - q.z );
			let dy = b1.y - q.y;
			if ( dy < dx && dy < dz ) {
				q.y = b1.y + 0.02;
			} else if ( dx < dz ) {
				let right = q.x > ( b0.x + b1.x ) * 0.5;
				n = vec3f( select( - 1.0, 1.0, right ), 0.0, 0.0 );
				q.x = select( b0.x - 0.02, b1.x + 0.02, right );
			} else {
				let front = q.z > ( b0.z + b1.z ) * 0.5;
				n = vec3f( 0.0, 0.0, select( - 1.0, 1.0, front ) );
				q.z = select( b0.z - 0.02, b1.z + 0.02, front );
			}
		}
		let nw = normalize( ( sprayParams.bodyMat * vec4f( n, 0.0 ) ).xyz );
		var vr = *v - sprayParams.bodyVel;
		let vn = dot( vr, nw );
		if ( vn < 0.0 ) { vr -= nw * vn; }
		*v = sprayParams.bodyVel + vr * 0.5;
		*p = ( sprayParams.bodyMat * vec4f( q, 1.0 ) ).xyz;
		// water that hits it wets it and runs off (gone); mist flows around it and settles
		*life = min( *life, select( age, age + 0.25, isMist ) );
	}
}

@compute @workgroup_size( WG_X, 1, 1 )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let i = gid.x;
	if ( i >= SPRAY_N ) { return; }

	// ---- CPU-owned slots: spawn from this frame's requests
	if ( i >= ${e}u ) {
		let k = ( i - ${e}u + ${t}u - sprayParams.cpuStart ) % ${t}u;
		if ( k < sprayParams.cpuCount ) {
			var r = 0u;
			for ( var j = 0u; j < sprayParams.reqCount; j++ ) {
				r = j;
				if ( f32( k ) < sprayReq[ j * 4u ].w ) { break; }
			}
			let r0 = sprayReq[ r * 4u ];
			let r1 = sprayReq[ r * 4u + 1u ];
			let r2 = sprayReq[ r * 4u + 2u ];
			let r3 = sprayReq[ r * 4u + 3u ];
			let h0 = sprayRand( i, 11u ); let h1 = sprayRand( i, 12u ); let h2 = sprayRand( i, 13u );
			let h3 = sprayRand( i, 14u ); let h4 = sprayRand( i, 15u ); let h5 = sprayRand( i, 16u );
			let h6 = sprayRand( i, 17u );
			let along = mix( r0.xyz, r1.xyz, h0 );
			let jit = vec3f( h1 - 0.5, h2 - 0.5, h3 - 0.5 ) * ( r3.y * 2.0 );
			let vj = vec3f( h4 - 0.5, h5 - 0.5, h6 - 0.5 ) * ( r3.x * 2.0 );
			let size = r1.w * ( 1.0 + ( h2 - 0.5 ) * r3.w );
			let life = r3.z * ( h3 * 0.5 + 0.75 );
			sprayWrite( i, along + jit, r2.xyz + vj, size, r2.w, life, h5 );
		}
	}

	// ---- integrate live particles
	let P = sprayPos[ i ];
	let Vv = sprayVel[ i ];
	let info = sprayInfo[ i ];
	if ( info.y > 0.0 ) {
		let dt = frame.dt;
		var p = P.xyz;
		var v = Vv.xyz;
		let age = P.w + dt;
		let kind = info.x;

		// wind near the surface (~70% of the 10 m wind), gusty
		let gust = sin( frame.time * 0.7 + p.x * 0.05 ) * 0.25 + 0.85;
		let wind = vec3f( frame.windDir.x, 0.0, frame.windDir.y ) * ( frame.windSpeed * 0.7 * gust );
		// drag toward the wind: small drops follow the air, mist drifts with it
		// mist first keeps moving with the air the wave pushes ahead of it, then joins the wind
		let isMist = kind > 0.5 && kind < 1.5;
		let tau = ${Z(`kind`,X.tau)} * select( 1.0, exp( age * - 1.2 ) * 4.0 + 1.0, isMist );
		let grav = ${Z(`kind`,X.grav)};
		let turb = vec3f(
			sin( age * 2.1 + fract( info.w ) * 40.0 ),
			sin( age * 1.7 + fract( info.w ) * 17.0 ) * 0.5,
			cos( age * 1.9 + fract( info.w ) * 29.0 ) ) * ${Z(`kind`,X.turb)};
		v += ( ( wind - v ) / tau + turb ) * dt;
		v.y -= grav * dt;
		p += v * dt;

		var life = info.y;
		sprayCollideBody( &p, &v, age, &life, isMist );

		// water surface and ground below
		let hw = waterQueryHeightAtXZ( p.xz );
		let ground = terrainHeightAt( p.xz );
		let top = max( hw, ground );

		// drops die in the water / on the sand; mist and foam skim over it
		if ( p.y < top && v.y < 0.0 && age > 0.04 ) {
			if ( ${Z(`kind`,X.dies)} > 0.5 ) {
				life = 0.0;
${r?`				// fell into the water (not onto the sand): its bubbles add to the foam there
				if ( hw > ground + 0.02 ) {
					shoreSimDepositAt( p.xz, u32( ${Z(`kind`,X.deposit)} ) );
				}
`:``}			} else {
				p.y = top + 0.02;
				v.y = max( v.y, 0.0 );
				v = vec3f( v.x * 0.95, v.y, v.z * 0.95 );
			}
		}

		if ( age > life ) { life = 0.0; }

		// mist and spray clouds grow as they dilute
		let size = Vv.w * ( 1.0 + dt * ${Z(`kind`,X.grow)} );
		sprayPos[ i ] = vec4f( p, age );
		sprayVel[ i ] = vec4f( v, size );
		sprayInfo[ i ] = vec4f( info.x, life, hw, info.w );
	}
}
`})}update(){this.updateKernel||this._buildUpdate();let e=this.nReqParticles;this.cpuStart.value=this.cpuHead,this.cpuCount.value=e,this.reqCount.value=this.nReq,this.cpuHead=(this.cpuHead+e)%this.NC,this.nReq>0&&this.reqBuffer.write(this.reqData.subarray(0,this.nReq*16)),this.frameSeed.value=++this._frame>>>0,this.updateKernel.dispatch(Math.ceil(this.N/64)),this.nReq=0,this.nReqParticles=0}_buildMesh(e){let t=new te;t.setAttribute(`position`,new E(new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),3)),t.setIndex([0,1,2,0,2,3]),t.boundingSphere=new l(new s,1e7),t.instanceCount=this.N;let i=Fe(),a=Ie(),o=new r({name:`Spray`,lit:!1,transparent:!0,depthWrite:!1,depthTest:!0,side:`double`,blending:`premultiplied`,modules:[Q],uniforms:{intensity:[`f32`,1],maxDistance:[`f32`,320]},storage:{sprayPosR:this.pos,sprayVelR:this.vel,sprayInfoR:this.info},textures:{sprayPuff:i,sprayDots:a,spraySceneDepth:{texture:()=>e.depthTexture}},varyings:{vUV:`vec2f`,vCol:`vec4f`,vMisc:`vec4f`,vFwd:`vec4f`},vertex:`
	let posA = sprayPosR[ v.instance ];
	let velA = sprayVelR[ v.instance ];
	let info = sprayInfoR[ v.instance ];
	let p = posA.xyz;
	let age = posA.w;
	let vel = velA.xyz;
	let kind = info.x;
	let life = info.y;
	let isDrop = kind < 0.5;
	let isLig = kind > 1.5 && kind < 2.5;
	let isMist = kind > 0.5 && kind < 1.5;
	let water = isDrop || isLig; // clear water: drops and ligaments
	let alive = life > 0.0 && age < life;

	let toCam = frame.cameraPos - p;
	let dist = max( length( toCam ), 0.05 );
	let Vd = toCam / dist;

	// pixel footprint at this distance: drops are drawn at least ~1.3 px wide
	let p11 = frame.proj[ 1 ][ 1 ];
	let pixel = dist * 2.0 / ( p11 * frame.resolution.y );
	let r0 = velA.w; // radius (m)
	// dense spray is thrown out of the splash as a compact mass and spreads (grows from ~half size)
	let tAge = age / max( life, 1e-3 );
	let r = select( r0, r0 * mix( 0.45, 1.0, smoothstep( 0.0, 0.25, tAge ) ), kind > 2.5 && kind < 3.5 );
	let size = max( r, pixel * 1.3 );

	// motion blur along the velocity projected on the view plane; ligaments are elongated anyway
	let vPerp = vel - Vd * dot( vel, Vd );
	let speed = length( vPerp );
	let stretchLen = speed * ${Z(`kind`,X.stretch)};
	let elong = select( 0.0, r * 2.0, isLig );
	let up = select( vec3f( 0.0, 1.0, 0.0 ), vPerp / max( speed, 1e-3 ), speed > 1e-3 );
	// clouds: random rotation that slowly turns
	let rot = fract( info.w ) * 6.283 + age * ( fract( info.w ) - 0.5 );
	let camRight = normalize( cross( vec3f( 0.0, 1.0, 0.0 ), Vd ) + vec3f( 1e-5, 0.0, 0.0 ) );
	let camUp = cross( Vd, camRight );
	let mRight = camRight * cos( rot ) + camUp * sin( rot );
	let mUp = camUp * cos( rot ) - camRight * sin( rot );
	// torn sheets (dense spray) are drawn along their motion too, tilted a little at random and
	// stretched by their speed: fibrous, streaked silhouettes instead of round puffs
	let isSheet = kind > 2.5;
	let isClear = kind > 3.5; // clear sheet (bow sheet)
	let side = normalize( cross( Vd, up ) );
	let tilt = ( fract( info.w * 7.31 ) - 0.5 ) * 0.7;
	let sUp = up * cos( tilt ) + side * sin( tilt );
	let sSide = side * cos( tilt ) - up * sin( tilt );
	// mist streams with the air: drawn along its motion, stretched by its speed (wisps, not discs)
	let alongMotion = isSheet || ( isMist && speed > 0.3 );
	let axisY = select( select( mUp, sUp, alongMotion ), up, water );
	let axisX = select( select( mRight, sSide, alongMotion ), side, water );
	let sheetLen = select( 0.0, size * clamp( speed * 0.08, 0.0, 0.8 ), isSheet );
	let mistLen = select( 0.0, size * clamp( ( speed - 0.3 ) * 0.35, 0.0, 1.4 ), isMist );
	let halfY = size + stretchLen * 0.5 + elong + sheetLen + mistLen;
	let halfX = select( size, size * 1.05, isSheet );
	let corner = v.position.xy;
	let world = p + axisX * ( corner.x * halfX ) + axisY * ( corner.y * halfY );

	// coverage that conserves the water's cross-section: the drop's projected area (and the time it
	// spends on each pixel of its streak) spread over the drawn footprint. For the gaussian
	// footprint exp( -k d^2 ) the peak is k r (r + elong) / ( halfX halfY ). Clouds: lost to the clamp.
	let kShape = select( 3.5, 4.5, isLig );
	let cover = select( sat( r / size ), min( r * ( r + elong ) * kShape / ( halfX * halfY ), 1.0 ), water );

	// ---- lighting (per particle)
	let L = frame.sunDir;
	let cosT = dot( - Vd, L ); // 1 = looking toward the sun through the particle
	let cosA = dot( Vd, L );
	let sunVis = sprayCloudShadow( p.xz ) * sprayWaveShadow( p, info.w );
	let sun = frame.sunColor * sunVis;
	// clear water (drop, ligament): the bright sky it refracts and reflects, a strong forward lobe
	// (diffraction + refraction) when backlit, a small glint from any side
	let cWater = frame.skyIrradiance * 0.9 + sun * ( sprayPhaseHG( cosT, 0.85 ) * 1.2 + 0.12 );
	// dense spray: multiply scattered, white from any side (a diffuse sphere: its far side is in its
	// own shadow), plus a forward lobe
	let lambert = ( sqrt( max( 1.0 - cosA * cosA, 0.0 ) ) + ( PI - acos( clamp( cosA, -1.0, 1.0 ) ) ) * cosA ) / PI;
	// (the forward lobe is passed on separately: thin, torn parts glow with it, thick parts shade it)
	let cSpray = sun * ( ( lambert * 0.65 + 0.35 ) / PI ) + frame.skyIrradiance * 1.15;
	let fSpray = sun * ( sprayPhaseHG( cosT, 0.6 ) * 0.9 );
	// mist: a thin veil of fine drops, strongly forward scattering, tinted by the sky
	let cMist = sun * ( 0.25 / PI ) + frame.skyIrradiance * 0.9;
	let fMist = sun * sprayPhaseHG( cosT, 0.75 );
	// clear sheet: thin water, the sky it shows and a little sun off its surface; the sun shining
	// through it (forward lobe) is passed on: the thin torn parts glow when backlit
	let cClear = frame.skyIrradiance * 0.95 + sun * 0.05;
	let fClear = sun * ( sprayPhaseHG( cosT, 0.8 ) * 1.1 );
	let col = select( select( select( cSpray, cClear, isClear ), cMist, isMist ), cWater, water );
	o.vFwd = vec4f( select( select( select( fSpray, fClear, isClear ), fMist, isMist ), vec3f( 0.0 ), water ), halfX / pixel );

	// opacity over the particle's life
	let t = age / max( life, 1e-3 );
	let fadeIn = smoothstep( 0.0, ${Z(`kind`,X.fadeIn)}, t );
	let fadeOut = 1.0 - smoothstep( ${Z(`kind`,X.fadeOut)}, 1.0, t );
	let baseA = ${Z(`kind`,X.alpha)};
	// far: fade out; very near the eye: sheets and mist would fill the screen (and cost a lot of overdraw)
	let distFade = smoothstep( mat.maxDistance, mat.maxDistance * 0.55, dist ) * select( smoothstep( 0.6, 3.0, dist ), 1.0, water );
	let a = baseA * fadeIn * fadeOut * cover * distFade * mat.intensity;

	o.vUV = corner;
	o.vCol = vec4f( col, a );
	// x: kind + 0.45 * life fraction (the kind tests below have 0.5 of margin)
	o.vMisc = vec4f( kind + sat( t ) * 0.45, info.z, size, fract( info.w ) );

	// dead particles collapse off-screen
	v.useWorld = true;
	v.worldPos = select( vec3f( 0.0, -1e5, 0.0 ), world, alive && a > 1e-4 );
	v.worldNormal = Vd;
`,output:`
	let uv = in.vs.vUV;
	let vMisc = in.vs.vMisc;
	let kind = vMisc.x;
	let isDrop = kind < 0.5;
	let isLig = kind > 1.5 && kind < 2.5;
	let isSheet = kind > 2.5;
	let isClear = kind > 3.5;
	let t = sat( fract( kind ) / 0.45 ); // life fraction
	let r2 = dot( uv, uv );
	let sd = vec2f( vMisc.w, vMisc.w * 1.7 );
	// drop: gaussian streak; ligament: a slightly sharper, beaded blob
	let drop = max( exp( r2 * - 3.5 ) - 0.03, 0.0 );
	let lig = max( exp( r2 * - 4.5 ) * ( sin( uv.y * 5.0 + vMisc.w * 40.0 ) * 0.2 + 0.9 ) - 0.03, 0.0 );
	// torn sheet: noise streaked along the motion (uv.y), eroded from its edges inward and more and
	// more as it ages, so it tears into strands and fragments instead of shrinking. Thick parts are
	// dense white water, the torn edges thin and translucent.
	let env = sat( 1.0 - r2 );
	let fib = textureSample( sprayPuff, smpLinearRepeat, vec2f( uv.x * 0.5, uv.y * 0.26 ) + sd ).x;
	let fine = textureSample( sprayPuff, smpLinearRepeat, vec2f( uv.x * 1.2, uv.y * 0.6 ) + sd * 2.3 ).x;
	let field = fib * 0.6 + fine * 0.4 + ( env - 0.55 ) * 0.75 - smoothstep( 0.8, 1.0, r2 );
	// a torn sheet only a few pixels across can't show its tears: a solid white dot, and a cluster of
	// them reads as cauliflower puffs. Small on screen, it is drawn thinner and more torn: a far
	// splash-up is a ragged, see-through burst
	let farK = smoothstep( 14.0, 3.0, in.vs.vFwd.w ) * select( 0.0, 1.0, isSheet && ! isClear );
	let erode = mix( 0.26, 0.7, t ) + farK * 0.16;
	let dens = sat( ( field - erode ) * 3.0 );
	// torn edges are thin, translucent water: soft and see-through, the core dense white
	let torn = smoothstep( erode - 0.04, erode + 0.2, field ) * ( dens * 0.45 + 0.55 );
	// ... which breaks up into a cluster of drops: many small dots in a ragged envelope that thins
	// out as it ages (sub-pixel drops average out through the mipmaps: never a solid blob)
	let dots = textureSample( sprayDots, smpLinearRepeat, uv * vec2f( 0.5, 0.32 ) + sd * 3.7 ).x;
	let swarm = dots * smoothstep( 0.25, 0.55, fib + env * 0.45 - t * 0.2 ) * ( 1.0 - t * 0.5 );
	let sheet = max( torn * ( 1.0 - smoothstep( 0.15, 0.6, t ) ), swarm );
	// mist: a soft veil of low-frequency noise that drifts and thins, never a disc
	let m1 = textureSample( sprayPuff, smpLinearRepeat, uv * 0.2 + sd ).x;
	let m2 = textureSample( sprayPuff, smpLinearRepeat, uv * 0.55 + sd * 3.1 ).x;
	let veil = smoothstep( 0.28, 0.8, m1 * 0.7 + m2 * 0.3 + env * 0.3 - 0.12 ) * sqrt( env ) * ( 1.0 - t * 0.4 );
	let shape = select( select( select( veil, sheet, isSheet ), lig, isLig ), drop, isDrop );
	// self-shadowing inside thick sheets; the forward-scattered sun lights up the thin parts
	let shade = select( 1.0, 1.0 - dens * 0.15, isSheet && ! isClear );
	let glow = select( select( 1.0, 1.0 - dens * 0.6, isSheet ), 1.0 - dens * 0.3, isClear );

	// soft intersections: opaque scene depth and the water surface under the particle
	// (depth via exact texel loads; reversed-Z, view z negative in front of the camera)
	let dsz = vec2f( textureDimensions( spraySceneDepth ) );
	let q = vec2i( clamp( in.pixel * frame.invResolution, vec2f( 0.0 ), vec2f( 0.9999 ) ) * dsz );
	let sceneZ = - viewDepth( textureLoad( spraySceneDepth, q, 0 ) );
	let posViewZ = ( frame.view * vec4f( in.P, 1.0 ) ).z;
	let soft = vMisc.z * 1.5 + 0.03;
	let fadeScene = sat( ( posViewZ - sceneZ ) / soft );
	let fadeWater = sat( ( in.P.y - vMisc.y ) / ( soft * 0.6 ) + 0.15 );
	let aOut = in.vs.vCol.w * shape * fadeScene * fadeWater * ( 1.0 - farK * 0.4 );
	if ( aOut < 0.002 ) { discard; }
	r.color = vec4f( ( in.vs.vCol.rgb * shade + in.vs.vFwd.xyz * glow ) * aOut, aOut );
`}),c=o.pipelineKey;o.pipelineKey=()=>(this._matHooked||(this._matHooked=!0,o.modules=[Q,this._hooks()]),c.call(o)),this.material=o,this.params={intensity:o.uniforms.intensity,maxDistance:o.uniforms.maxDistance};let u=this.mesh=new T(t,o);u.count=this.N,u.frustumCulled=!1,u.castShadow=!1,u.receiveShadow=!1,u.renderOrder=20,u.layers.set(n.TRANSPARENT),u.name=`Spray`}};function $(e,n,r){let i=new k({label:r,width:n,height:n,format:`rgba8unorm`,mips:!0,usage:[`sample`,`copyDst`,`render`],data:e,sampler:`linearRepeat`});return i.getGPU(),t(i),i}function Fe(e=64){let t=new Uint8Array(e*e*4),n=(e,t,n)=>{let r=Math.sin(e%n*127.1+t%n*311.7+n*17.3)*43758.5453;return r-Math.floor(r)},r=(e,t,r)=>{let i=Math.floor(e),a=Math.floor(t),o=e-i,s=t-a,c=o*o*(3-2*o),l=s*s*(3-2*s),u=n(i,a,r),d=n(i+1,a,r),f=n(i,a+1,r),p=n(i+1,a+1,r);return(u*(1-c)+d*c)*(1-l)+(f*(1-c)+p*c)*l};for(let n=0;n<e;n++)for(let i=0;i<e;i++){let a=0,o=.5,s=0;for(let t=4;t<=32;t*=2)a+=r(i/e*t,n/e*t,t)*o,s+=o,o*=.55;let c=Math.max(0,Math.min(1,(a/s-.2)*1.6)),l=(n*e+i)*4;t[l]=t[l+1]=t[l+2]=Math.round(c*255),t[l+3]=255}return $(t,e,`sprayPuff`)}function Ie(e=128,t=150){let n=new Uint8Array(e*e*4),r=12345,i=()=>(r=r*1664525+1013904223>>>0)/4294967296,a=new Float32Array(e*e);for(let n=0;n<t;n++){let t=i()*e,n=i()*e,r=Math.min(.9*(1-i()*.97)**-.55,6),o=Math.ceil(r+1.5);for(let i=-o;i<=o;i++)for(let s=-o;s<=o;s++){let o=((Math.floor(t)+s)%e+e)%e,c=((Math.floor(n)+i)%e+e)%e,l=Math.hypot(Math.floor(t)+s+.5-t,Math.floor(n)+i+.5-n),u=Math.max(0,Math.min(1,r+.5-l));a[c*e+o]=Math.max(a[c*e+o],u)}}for(let t=0;t<e*e;t++){let e=Math.round(a[t]*255);n[t*4]=n[t*4+1]=n[t*4+2]=e,n[t*4+3]=255}return $(n,e,`sprayDots`)}export{xe as a,Se as i,Pe as n,W as o,ke as r,ue as s,Y as t};