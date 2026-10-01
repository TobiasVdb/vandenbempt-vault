import{t as e}from"./GPU-Cbt4zL1q.js";import{C as t,D as n,E as r,S as i,T as a,_ as o,f as s,g as c,o as l,x as u,y as d}from"./Frame-B8W73s6s.js";import{C as f,E as p,M as m,S as h,T as g,i as _,j as v,o as y}from"./Noise-B2O-jz5F.js";import{n as b}from"./Texture-CEZp7lup.js";import{l as x}from"./GLTF-Cc2JsPXX.js";var S={0:`front`,1:`back`,2:`double`,front:`front`,back:`back`,double:`double`};function ee(e){let t={...e};return t.side!==void 0&&(t.side=S[t.side]||`front`),t}var C=class extends x{constructor(e={},t=null){let n=ee(e),r={...n.uniforms||{}};r.envMapIntensity=[`f32`,n.envMapIntensity??1],r.emissiveIntensity=[`f32`,n.emissiveIntensity??1],t&&Object.assign(r,t),super({...n,uniforms:r}),this.isSceneMaterial=!0,this.isMeshStandardMaterial=!0}get side(){return this._side}set side(e){let t=S[e]||`front`;t!==this._side&&this._side!==void 0&&this.version++,this._side=t}get emissiveIntensity(){return this.uniforms.emissiveIntensity.value}set emissiveIntensity(e){this.uniforms.emissiveIntensity.value=e}get envMapIntensity(){return this.uniforms.envMapIntensity.value}set envMapIntensity(e){this.uniforms.envMapIntensity.value=e}get surface(){return this._prelude()+(this._surface||``)}set surface(e){this._surface=e}_prelude(){return`	s.emissive = s.emissive * mat.emissiveIntensity;
	s.envIntensity = mat.envMapIntensity;
`}},te=class extends C{constructor(e={}){let t=e.clearcoat??0,n=e.sheen??0;super(e,{clearcoat:[`f32`,t],clearcoatRoughness:[`f32`,e.clearcoatRoughness??0],specularIntensity:[`f32`,e.specularIntensity??1],sheen:[`f32`,n],sheenColor:[`vec3f`,null],sheenRoughness:[`f32`,e.sheenRoughness??1],ior:[`f32`,e.ior??1.5]}),this.isMeshPhysicalMaterial=!0,e.sheenColor===void 0?this.uniforms.sheenColor.value=ne(0):this.uniforms.sheenColor.value=ne(e.sheenColor),t>0&&(this.defines.CLEARCOAT=1),n>0&&(this.defines.SHEEN=1)}get clearcoat(){return this.uniforms.clearcoat.value}set clearcoat(e){e>0!=!!this.defines.CLEARCOAT&&this.setDefine(`CLEARCOAT`,+(e>0)),this.uniforms.clearcoat.value=e}get clearcoatRoughness(){return this.uniforms.clearcoatRoughness.value}set clearcoatRoughness(e){this.uniforms.clearcoatRoughness.value=e}get specularIntensity(){return this.uniforms.specularIntensity.value}set specularIntensity(e){this.uniforms.specularIntensity.value=e}get sheen(){return this.uniforms.sheen.value}set sheen(e){e>0!=!!this.defines.SHEEN&&this.setDefine(`SHEEN`,+(e>0)),this.uniforms.sheen.value=e}get sheenColor(){return this.uniforms.sheenColor.value}get sheenRoughness(){return this.uniforms.sheenRoughness.value}set sheenRoughness(e){this.uniforms.sheenRoughness.value=e}get ior(){return this.uniforms.ior.value}set ior(e){this.uniforms.ior.value=e}_prelude(){return super._prelude()+`	s.clearcoat = mat.clearcoat;
	s.clearcoatRoughness = mat.clearcoatRoughness;
	s.specularIntensity = mat.specularIntensity;
	s.sheenColor = mat.sheenColor * mat.sheen;
	s.sheenRoughness = mat.sheenRoughness;
	s.ior = mat.ior;
`}};function ne(e){return e&&e.isColor?e.clone():new d().set(e)}var re=(e={})=>new C(e),ie=(e={})=>new te(e),ae=new t,oe=new u,w=new n,se=new i(0,0,0,`YXZ`),T=new r,ce=new r(1,1,1),E=new r,D=new r,O=new r,le=new r,ue=new r(1,0,0),de=new r(0,1,0),fe=1e3,pe=2e3,me={wood:1,hard:1,stone:2,thatch:1,roofMetal:.84,roofMetalSwap:1.68},he=(e,t)=>t>0?Math.max(1,Math.round(e/t))*t/e:1,k=class{constructor(e,t,n,r){this.p=e instanceof Float32Array?e:new Float32Array(e),this.n=t instanceof Float32Array?t:new Float32Array(t),this.uv=n instanceof Float32Array?n:new Float32Array(n),this.idx=r}get vertexCount(){return this.p.length/3}},ge=new Map;function A(e,t){let n=ge.get(e);return n===void 0&&(n=t(),ge.set(e,n)),n}function _e(e,t,n,r=-1,i=0){return A(`b${e.toFixed(4)},${t.toFixed(4)},${n.toFixed(4)},${r},${i}`,()=>{let a=[e,t,n],o=r;o<0&&(o=e>=t&&e>=n?0:t>=n?1:2);let s=[],c=[],l=[],u=[],d=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let e=0;e<3;e++)for(let t=0;t<2;t++){let n=t===0?1:-1;if(i&1<<e*2+t)continue;let r=(e+1)%3,f=(e+2)%3,p=r,m=f;o===f&&(p=f,m=r);let h=s.length/3,g=e===o?fe:0;for(let[t,i]of d){let o=[0,0,0];o[e]=n*a[e]/2,o[r]=t*a[r]/2,o[f]=i*a[f]/2,s.push(o[0],o[1],o[2]);let u=[0,0,0];u[e]=n,c.push(u[0],u[1],u[2]),l.push(o[p]+a[p]/2+g,o[m]+a[m]/2)}n>0?u.push(h,h+1,h+2,h,h+2,h+3):u.push(h,h+2,h+1,h,h+3,h+2)}return new k(s,c,l,u)})}function j(e,t,n){let r=[],i=[],a=[],o=[];for(let o=0;o<=t;o++)for(let t=0;t<=e;t++){let e=n(t,o);r.push(e.p[0],e.p[1],e.p[2]),i.push(e.n[0],e.n[1],e.n[2]),a.push(e.uv[0],e.uv[1])}let s=e+1;for(let n=0;n<t;n++)for(let t=0;t<e;t++){let e=n*s+t,a=e+1,c=e+s,l=c+1;E.fromArray(r,e*3),D.fromArray(r,a*3),O.fromArray(r,l*3),le.fromArray(r,c*3);let u=D.clone().sub(E),d=O.clone().sub(E),f=le.clone().sub(E),p=u.clone().cross(d).add(d.clone().cross(f)),m=i[e*3]+i[a*3]+i[c*3]+i[l*3],h=i[e*3+1]+i[a*3+1]+i[c*3+1]+i[l*3+1],g=i[e*3+2]+i[a*3+2]+i[c*3+2]+i[l*3+2];p.x*m+p.y*h+p.z*g>=0?o.push(e,a,l,e,l,c):o.push(e,l,a,e,c,l)}return new k(r,i,a,o)}function ve(e,t,n,r=8,i=!0,a=!1,o=!1,s=0){return A(`c${e.toFixed(4)},${t.toFixed(4)},${n.toFixed(4)},${r},${i},${a},${o},${s}`,()=>{let c=[],l=[],u=[],d=[],f=(t-e)/n,p=Math.hypot(1,f),m=(e+t)/2,h=he(Math.PI*2*m,s);for(let i=0;i<=r;i++){let a=i/r*Math.PI*2,s=Math.cos(a),d=Math.sin(a);for(let r=0;r<2;r++){let i=r?e:t,g=r?n:0;c.push(s*i,g,d*i),l.push(s/p,f/p,d/p);let _=g,v=a*m*h;o?u.push(v,_):u.push(_,v)}}for(let e=0;e<r;e++){let t=e*2,n=t+1,r=t+2,i=t+3;d.push(t,n,r,n,i,r)}let g=(e,t,n)=>{if(t<=0)return;let i=c.length/3;c.push(0,e,0),l.push(0,n?1:-1,0),u.push(pe,0);for(let i=0;i<=r;i++){let a=i/r*Math.PI*2;c.push(Math.cos(a)*t,e,Math.sin(a)*t),l.push(0,n?1:-1,0),u.push(Math.cos(a)*t+pe,Math.sin(a)*t)}for(let e=0;e<r;e++)n?d.push(i,i+2+e,i+1+e):d.push(i,i+1+e,i+2+e)};return i&&g(n,e,!0),a&&g(0,t,!1),new k(c,l,u,d)})}function ye(e,t=12,n=null,r=0){return A(`l`+e.map(e=>e[0].toFixed(3)+`:`+e[1].toFixed(3)).join(`,`)+`|`+t+`|`+n+`|`+r,()=>{let i=e.length,a=n??Math.max(...e.map(e=>e[0])),o=a*he(Math.PI*2*a,r),s=[],c=t=>{let n=e[t+1][0]-e[t][0],r=e[t+1][1]-e[t][1],i=Math.hypot(n,r)||1;return[r/i,-n/i]},l=(t,n)=>t>=0&&n<i&&e[t][0]===e[n][0]&&e[t][1]===e[n][1];for(let e=0;e<i;e++){let t=0,n=0;if(l(e,e+1)){if(e>0){let r=c(e-1);t=r[0],n=r[1]}}else if(l(e-1,e)){if(e<i-1){let r=c(e);t=r[0],n=r[1]}}else{if(e<i-1){let r=c(e);t+=r[0],n+=r[1]}if(e>0){let r=c(e-1);t+=r[0],n+=r[1]}}let r=Math.hypot(t,n)||1;s.push([t/r,n/r])}let u=[0];for(let t=1;t<i;t++)u.push(u[t-1]+Math.hypot(e[t][0]-e[t-1][0],e[t][1]-e[t-1][1]));return j(i-1,t,(n,r)=>{let i=r/t*Math.PI*2,a=Math.cos(i),c=Math.sin(i),[l,d]=e[n],[f,p]=s[n];return{p:[a*l,d,c*l],n:[a*f,p,c*f],uv:[u[n],i*o]}})})}function be(e,t,n=6,r=16,i=Math.PI*2){return A(`t${e.toFixed(4)},${t.toFixed(4)},${n},${r},${i.toFixed(3)}`,()=>j(r,n,(a,o)=>{let s=a/r*i,c=o/n*Math.PI*2,l=Math.cos(s),u=Math.sin(s),d=Math.cos(c),f=Math.sin(c);return{p:[(e+t*d)*l,t*f,(e+t*d)*u],n:[d*l,f,d*u],uv:[s*e,c*t]}}))}function xe(e,t,n=5){let i=e.length,a=[],o=[],s=[];for(let t=0;t<i;t++){let n=e[Math.max(0,t-1)],r=e[Math.min(i-1,t+1)];a.push(r.clone().sub(n).normalize())}let c=Math.abs(a[0].y)<.9?new r(0,1,0):new r(1,0,0);c=c.sub(a[0].clone().multiplyScalar(c.dot(a[0]))).normalize(),o.push(c),s.push(a[0].clone().cross(c));for(let e=1;e<i;e++){let t=o[e-1],n=t.clone().sub(a[e].clone().multiplyScalar(t.dot(a[e])));n.lengthSq()<1e-8&&n.copy(t),n.normalize(),o.push(n),s.push(a[e].clone().cross(n))}let l=[0];for(let t=1;t<i;t++)l.push(l[t-1]+e[t].distanceTo(e[t-1]));return j(n,i-1,(r,i)=>{let a=r/n*Math.PI*2,c=Math.cos(a),u=Math.sin(a),d=o[i].x*c+s[i].x*u,f=o[i].y*c+s[i].y*u,p=o[i].z*c+s[i].z*u,m=e[i];return{p:[m.x+d*t,m.y+f*t,m.z+p*t],n:[d,f,p],uv:[l[i],a*t]}})}function Se(e,t,n=1,r=1,i=!1){return A(`p${e.toFixed(3)},${t.toFixed(3)},${n},${r},${i}`,()=>j(n,r,(a,o)=>{let s=(a/n-.5)*e,c=i?-o/r*t:(o/r-.5)*t;return{p:[s,c,0],n:[0,0,1],uv:[s+e/2,i?t+c:c+t/2]}}))}function Ce(e,t){return A(`q${e.toFixed(3)},${t.toFixed(3)}`,()=>new k([-e/2,-t/2,0,e/2,-t/2,0,e/2,t/2,0,-e/2,t/2,0],[0,0,1,0,0,1,0,0,1,0,0,1],[0,0,1,0,1,1,0,1],[0,1,2,0,2,3]))}function we(e,t,n=null,i=null){let a=e.length,o=new r;for(let t=0;t<a;t++){let n=e[t],r=e[(t+1)%a];o.x+=(n.y-r.y)*(n.z+r.z),o.y+=(n.z-r.z)*(n.x+r.x),o.z+=(n.x-r.x)*(n.y+r.y)}o.normalize(),i&&o.dot(i)<0&&(e=e.slice().reverse(),o.negate());let s=n?n.clone():e[1].clone().sub(e[0]);s.sub(o.clone().multiplyScalar(s.dot(o))).normalize();let c=o.clone().cross(s),l=o.clone().multiplyScalar(-t),u=[],d=[],f=[],p=[],m=1/0,h=1/0;for(let t of e)m=Math.min(m,t.dot(s)),h=Math.min(h,t.dot(c));let g=s.clone().multiplyScalar(m).add(c.clone().multiplyScalar(h)),_=0;for(let t of e)u.push(t.x,t.y,t.z),d.push(o.x,o.y,o.z),T.copy(t).sub(g),f.push(T.dot(s),T.dot(c));for(let e=1;e<a-1;e++)p.push(_,_+e,_+e+1);if(t>0){_=u.length/3;for(let t of e)u.push(t.x+l.x,t.y+l.y,t.z+l.z),d.push(-o.x,-o.y,-o.z),T.copy(t).sub(g),f.push(T.dot(s),T.dot(c));for(let e=1;e<a-1;e++)p.push(_,_+e+1,_+e)}if(t>0)for(let n=0;n<a;n++){let r=e[n],i=e[(n+1)%a],s=i.clone().sub(r),c=s.length(),m=s.clone().cross(o).normalize();_=u.length/3,u.push(r.x,r.y,r.z,i.x,i.y,i.z,i.x+l.x,i.y+l.y,i.z+l.z,r.x+l.x,r.y+l.y,r.z+l.z);for(let e=0;e<4;e++)d.push(m.x,m.y,m.z);f.push(0,0,0,c,t,c,t,0),p.push(_,_+2,_+1,_,_+3,_+2)}let v=new k(u,d,f,p);return Te(v),v}function Te(e){let{p:t,n,idx:r}=e;for(let e=0;e<r.length;e+=3){let i=r[e],a=r[e+1],o=r[e+2];E.fromArray(t,i*3),D.fromArray(t,a*3),O.fromArray(t,o*3),D.sub(E),O.sub(E),D.cross(O);let s=n[i*3]+n[a*3]+n[o*3],c=n[i*3+1]+n[a*3+1]+n[o*3+1],l=n[i*3+2]+n[a*3+2]+n[o*3+2];D.x*s+D.y*c+D.z*l<0&&(r[e+1]=o,r[e+2]=a)}return e}var Ee=class{constructor(){this.pos=[],this.nrm=[],this.uv=[],this.tint=[],this.data=[],this.idx=[],this.vcount=0}get triangles(){return this.idx.length/3}add(e,t,n,r){oe.getNormalMatrix(t);let i=t.elements,a=oe.elements,o=e.p,s=e.n,c=e.uv,l=this.vcount,u=typeof n==`function`,d=typeof r==`function`,f=o.length/3;for(let e=0;e<f;e++){let t=o[e*3],l=o[e*3+1],f=o[e*3+2];this.pos.push(i[0]*t+i[4]*l+i[8]*f+i[12],i[1]*t+i[5]*l+i[9]*f+i[13],i[2]*t+i[6]*l+i[10]*f+i[14]);let p=s[e*3],m=s[e*3+1],h=s[e*3+2],g=a[0]*p+a[3]*m+a[6]*h,_=a[1]*p+a[4]*m+a[7]*h,v=a[2]*p+a[5]*m+a[8]*h,y=Math.hypot(g,_,v)||1;this.nrm.push(g/y,_/y,v/y),this.uv.push(c[e*2],c[e*2+1]);let b=u?n(t,l,f,e):n;this.tint.push(b[0],b[1],b[2]);let x=d?r(t,l,f,e):r;this.data.push(x[0],x[1],x[2],x[3])}let p=t.determinant()<0,m=e.idx;for(let e=0;e<m.length;e+=3)p?this.idx.push(l+m[e],l+m[e+2],l+m[e+1]):this.idx.push(l+m[e],l+m[e+1],l+m[e+2]);this.vcount+=f}addBatch(e,t,n=null,r=0){oe.getNormalMatrix(t);let i=t.elements,a=oe.elements,o=this.vcount,s=e.pos,c=e.nrm,l=e.vcount;for(let t=0;t<l;t++){let o=s[t*3],l=s[t*3+1],u=s[t*3+2];this.pos.push(i[0]*o+i[4]*l+i[8]*u+i[12],i[1]*o+i[5]*l+i[9]*u+i[13],i[2]*o+i[6]*l+i[10]*u+i[14]);let d=c[t*3],f=c[t*3+1],p=c[t*3+2],m=a[0]*d+a[3]*f+a[6]*p,h=a[1]*d+a[4]*f+a[7]*p,g=a[2]*d+a[5]*f+a[8]*p,_=Math.hypot(m,h,g)||1;this.nrm.push(m/_,h/_,g/_),this.uv.push(e.uv[t*2],e.uv[t*2+1]);let v=e.tint;n?this.tint.push(v[t*3]*n[0],v[t*3+1]*n[1],v[t*3+2]*n[2]):this.tint.push(v[t*3],v[t*3+1],v[t*3+2]);let y=e.data;this.data.push(y[t*4]+r,y[t*4+1],y[t*4+2],y[t*4+3])}let u=t.determinant()<0,d=e.idx;for(let e=0;e<d.length;e+=3)u?this.idx.push(o+d[e],o+d[e+2],o+d[e+1]):this.idx.push(o+d[e],o+d[e+1],o+d[e+2]);this.vcount+=l}append(e,t=null){let n=this.vcount;for(let t=0;t<e.pos.length;t++)this.pos.push(e.pos[t]);for(let t=0;t<e.nrm.length;t++)this.nrm.push(e.nrm[t]);for(let t=0;t<e.uv.length;t++)this.uv.push(e.uv[t]);for(let t=0;t<e.tint.length;t++)this.tint.push(e.tint[t]);for(let n=0;n<e.vcount;n++){let r=[e.data[n*4],e.data[n*4+1],e.data[n*4+2],e.data[n*4+3]],i=t?t(r):r;this.data.push(i[0],i[1],i[2],i[3])}for(let t=0;t<e.idx.length;t++)this.idx.push(n+e.idx[t]);this.vcount+=e.vcount}build(){let e=new f;e.setAttribute(`position`,new p(this.pos,3)),e.setAttribute(`normal`,new p(this.nrm,3)),e.setAttribute(`uv`,new p(this.uv,2)),e.setAttribute(`tint`,new p(this.tint,3)),e.setAttribute(`vdata`,new p(this.data,4));let t=this.vcount>65535?m:v;return e.setIndex(new t(this.idx,1)),e.computeBoundingBox(),e.computeBoundingSphere(),e}},De=(e,t)=>{let n=Array.isArray(e)?e:[0,0,0,0];return[n[0],t,n[2],n[3]]},Oe=e=>e==null?[1,1,1]:Array.isArray(e)||typeof e==`function`?e:[e.r,e.g,e.b];function M(e=0,n=0,r=0,i=0,a=0,o=0,s=new t){return se.set(a,i,o,`YXZ`),w.setFromEuler(se),T.set(e,n,r),s.compose(T,w,ce)}function N(e,n,r,i){return se.set(i.rx||0,i.ry||0,i.rz||0,`YXZ`),w.setFromEuler(se),T.set(e,n,r),le.set(i.sx??1,i.sy??1,i.sz??1),new t().compose(T,w,le)}var ke=class{constructor(){this.batches={},this.frame=new t,this.stack=[]}batch(e){return this.batches[e]||(this.batches[e]=new Ee)}push(e){return this.stack.push(this.frame),this.frame=this.frame.clone().multiply(e),this}pushAt(e,t,n,r=0,i=0,a=0){return this.push(M(e,t,n,r,i,a))}pop(){return this.frame=this.stack.pop(),this}toWorld(e,t,n,i=new r){return i.set(e,t,n).applyMatrix4(this.frame)}add(e,t,n,r,i){ae.multiplyMatrices(this.frame,n),this.batch(e).add(t,ae,Oe(r),i||[0,0,0,0])}box(e,t,n,r,i,a,o,s={}){let c=_e(i,a,o,s.grain??-1,s.skip??0);this.add(e,c,N(t,n,r,s),s.tint,s.data)}cyl(e,t,n,r,i,a,o,s={}){let c=s.swapUV??!1,l=me[e===`roofMetal`&&c?`roofMetalSwap`:e]??0,u=ve(i,a,o,s.segs??8,s.capTop??!0,s.capBot??!1,c,l);this.add(e,u,N(t,n,r,s),s.tint,s.data)}lathe(e,t,n,r,i,a={}){let o=ye(i,a.segs??12,a.rRef??null,me[e]??0);this.add(e,o,N(t,n,r,a),a.tint,a.data)}torus(e,t,n,r,i,a,o={}){let s=be(i,a,o.radial??6,o.tubular??16,o.arc??Math.PI*2);this.add(e,s,N(t,n,r,o),o.tint,e===`rope`?De(o.data,a):o.data)}part(e,t,n,r,i,a={}){this.add(e,t,N(n,r,i,a),a.tint,a.data)}beam(e,n,r,i,a,o={}){E.set(r[0]-n[0],r[1]-n[1],r[2]-n[2]);let s=E.length();if(s<1e-5)return;E.divideScalar(s);let c=Math.abs(E.y)>.98?ue:de;if(O.crossVectors(E,c).normalize(),D.crossVectors(O,E).normalize(),o.roll){let e=Math.cos(o.roll),t=Math.sin(o.roll),n=D.clone(),r=O.clone();D.copy(n).multiplyScalar(e).addScaledVector(r,t),O.copy(r).multiplyScalar(e).addScaledVector(n,-t)}let l=new t().makeBasis(E,D,O);l.setPosition((n[0]+r[0])/2,(n[1]+r[1])/2,(n[2]+r[2])/2);let u=_e(s+(o.extend||0),a,i,0,o.skip??0);this.add(e,u,l,o.tint,o.data)}rod(e,n,r,i,a=i,o={}){E.set(r[0]-n[0],r[1]-n[1],r[2]-n[2]);let s=E.length();if(s<1e-5)return;E.divideScalar(s),w.setFromUnitVectors(de,E);let c=new t().compose(T.set(n[0],n[1],n[2]),w,ce),l=ve(a,i,s,o.segs??6,o.capTop??!0,o.capBot??!1,!1,me[e]??0);this.add(e,l,c,o.tint,o.data)}tube(e,n,r,i={}){let a=xe(n,r,i.radial??5);this.add(e,a,new t,i.tint,e===`rope`?De(i.data,r):i.data)}slab(e,n,r,i={}){let a=we(n,r,i.uDir||null,i.up||null);this.add(e,a,new t,i.tint,i.data)}get triangles(){let e=0;for(let t in this.batches)e+=this.batches[t].triangles;return e}};function P(e,t,n,i=8){let a=[];for(let o=0;o<=i;o++){let s=o/i;a.push(new r(e[0]+(t[0]-e[0])*s,e[1]+(t[1]-e[1])*s-n*4*s*(1-s),e[2]+(t[2]-e[2])*s))}return a}var Ae=.73,je=new class{constructor(){this.list=[],this._sink=null}add(e,t,n,i,{h:a=.45,width:o=0,fwd:s=0,text:c=`Sit down`,tag:l=null}={}){let u=Math.sin(i),d=Math.cos(i),f=Math.max(1,Math.floor(o/.6)),p=f>1?Math.min(.65,o/f):0;for(let o=0;o<f;o++){let m=(o-(f-1)/2)*p,h={position:new r(e+u*s+d*m,t,n+d*s-u*m),yaw:i+Math.PI,face:{x:u,z:d},eye:a+Ae,text:c,tag:l};this.list.push(h),this._sink&&this._sink(h)}}addIn(e,t,n,r,i=0,a={}){let o=e.toWorld(t,n,r),s=e.frame.elements;this.add(o.x,o.y,o.z,Math.atan2(-s[2],s[0])+i,a)}bind(e){this._sink=e;for(let t of this.list)e(t)}};function Me(e){return e.split(/[^A-Za-z0-9]+/).filter(Boolean).map((e,t)=>t===0?e[0].toLowerCase()+e.slice(1):e[0].toUpperCase()+e.slice(1)).join(``)}var Ne=class{constructor(e,t,{maxInstances:n,dynamic:r=!1,fade:i=!1}){this.name=e,this.kinds=t;let a=t.length;this.maxInstances=n,this.dynamic=r;let o=this.prefix=Me(e),s=0,c=0;for(let e of t)s+=e.geometry.attributes.position.count,c+=e.geometry.index.count;let u=new Float32Array(s*3),d=new Float32Array(s*3),p=new Float32Array(s*4),m=new Float32Array(s),h=new Uint32Array(c);this.firstIndex=new Uint32Array(a),this.indexCount=new Uint32Array(a),this.baseVertex=new Uint32Array(a);let _=0,v=0;t.forEach((e,t)=>{let n=e.geometry,r=n.attributes.position.count;u.set(n.attributes.position.array,_*3),d.set(n.attributes.normal.array,_*3),n.attributes.aData&&p.set(n.attributes.aData.array,_*4),m.fill(t,_,_+r),h.set(n.index.array,v),this.firstIndex[t]=v,this.indexCount[t]=n.index.count,this.baseVertex[t]=_,e.triangles=n.index.count/3,e.vertices=r,_+=r,v+=n.index.count});let y=new f;y.setAttribute(`position`,new g(u,3)),y.setAttribute(`normal`,new g(d,3)),y.setAttribute(`aData`,new g(p,4)),y.setAttribute(`aKind`,new g(m,1)),y.setIndex(new g(h,1)),this.vertexCount=s,this.data=new Float32Array(n*16),this.instanceBuffer=new b({label:e+`.instances`,count:n*4,type:`vec4f`});let x=this;this.dataAttr={set needsUpdate(e){e&&x.upload()}};let S=n*2;this.list=new Uint32Array(S),this.listBuffer=new b({label:e+`.list`,count:S,type:`u32`}),this.baseArray=new Uint32Array(Math.max(a,4)),this.baseBuffer=new b({label:e+`.base`,count:this.baseArray.length,type:`u32`}),this.commands=new Uint32Array(a*5),this.indirectBuffer=new b({label:e+`.indirect`,count:a*5,type:`u32`,usage:[`indirect`]}),this.offsetPool=[[],[]],this.mainOffsets=[],this.shadowOffsets=[],y.indirect={buffer:this.indirectBuffer,offsets:this.mainOffsets},this.geometry=y,this.pairKind=new Uint16Array(S),this.pairId=new Uint32Array(S),this.pairs=0,this.counts=new Uint32Array(a),this.cursor=new Uint32Array(a),this.visibleInstances=0,this.visibleTriangles=0,this.shadowTriangles=0,this.mesh=null,this.fadeMesh=null,this.fadeOffsets=[],this.fadeInstances=0;let ee={[o+`Instances`]:{storage:this.instanceBuffer,access:`read`},[o+`List`]:{storage:this.listBuffer,access:`read`},[o+`Base`]:{storage:this.baseBuffer,access:`read`}},C=`
fn ${o}RecordIndex( kind: u32, instance: u32 ) -> u32 { return ${o}List[ ${o}Base[ kind ] + instance ]; }
fn ${o}Record( index: u32, k: u32 ) -> vec4f { return ${o}Instances[ index * 4u + k ]; }
`;if(i){this.fadeList=new Uint32Array(S),this.fadeListBuffer=new b({label:e+`.fadeList`,count:S,type:`u32`}),this.fadeBaseArray=new Uint32Array(Math.max(a,4)),this.fadeBaseBuffer=new b({label:e+`.fadeBase`,count:this.fadeBaseArray.length,type:`u32`}),this.fadeCommands=new Uint32Array(a*5),this.fadeIndirectBuffer=new b({label:e+`.fadeIndirect`,count:a*5,type:`u32`,usage:[`indirect`]});let t=new f;for(let e in y.attributes)t.setAttribute(e,y.attributes[e]);t.setIndex(y.index),t.indirect={buffer:this.fadeIndirectBuffer,offsets:this.fadeOffsets},this.fadeGeometry=t,this.fadeKind=new Uint16Array(S),this.fadeVal=new Uint32Array(S),this.fadePairs=0,this.fadeCounts=new Uint32Array(a),this.fadeCursor=new Uint32Array(a),this.fadePool=[],ee[o+`FadeList`]={storage:this.fadeListBuffer,access:`read`},ee[o+`FadeBase`]={storage:this.fadeBaseBuffer,access:`read`},C+=`
struct ${o}FadeInfo { index: u32, fade: f32, outgoing: f32 };
// fade channel: the instance record index, its fade (0..1) and whether this draw is the
// outgoing level (1) or the incoming one (0)
fn ${o}FadeEntry( kind: u32, instance: u32 ) -> ${o}FadeInfo {
	let e = ${o}FadeList[ ${o}FadeBase[ kind ] + instance ];
	return ${o}FadeInfo( e & 0xffffffu, f32( ( e >> 24u ) & 127u ) / 127.0, f32( e >> 31u ) );
}
`}this.module=new l({name:`batch-`+o,bindings:ee,code:C})}fadeEntry(){return`${this.prefix}FadeEntry( u32( v.aKind ), v.instance )`}addFade(e,t,n,r){let i=this.fadePairs++;this.fadeKind[i]=e;let a=Math.round(Math.min(1,Math.max(0,n))*127);this.fadeVal[i]=(t&16777215|a<<24|(r?2147483648:0))>>>0,this.fadeCounts[e]++}createFadeMesh(e){let t=new h(this.fadeGeometry,e);t.name=this.name+`.fade`,t.frustumCulled=!1,t.castShadow=!1,t.receiveShadow=!0,t.matrixAutoUpdate=!1;let n=this.fadeGeometry;return t.onBeforeRender=()=>{n.indirect.offsets=this.fadeOffsets},this.fadeMesh=t,t}recordIndex(){return`${this.prefix}RecordIndex( u32( v.aKind ), v.instance )`}record(e){return[0,1,2,3].map(t=>`${this.prefix}Record( ${e}, ${t}u )`)}createMesh(e,{castShadow:t=!1,receiveShadow:n=!0}={}){let r=new h(this.geometry,e);r.name=this.name,r.frustumCulled=!1,r.castShadow=t,r.receiveShadow=n,r.matrixAutoUpdate=!1;let i=this.geometry;return r.onBeforeRender=(e,t,n)=>{let r=n&&(n.isOrthographicCamera||n.reversedDepth===!1);i.indirect.offsets=r?this.shadowOffsets:this.mainOffsets},this.mesh=r,r}upload(){this.instanceBuffer.write(this.data)}begin(){this.pairs=0,this.counts.fill(0),this.fadeList&&(this.fadePairs=0,this.fadeCounts.fill(0))}add(e,t){let n=this.pairs++;this.pairKind[n]=e,this.pairId[n]=t,this.counts[e]++}offsets(e,t){let n=this.offsetPool[e];return n[t]||(n[t]=Array(t).fill(0))}commit(){let e=this.kinds.length,t=this.commands,n=this.baseArray,r=this.counts,i=this.cursor,a=0,o=0,s=0,c=0,l=0;for(let c=0;c<e;c++){let e=r[c];n[c]=a,i[c]=a;let l=c*5;t[l]=this.indexCount[c],t[l+1]=e,t[l+2]=this.firstIndex[c],t[l+3]=this.baseVertex[c],t[l+4]=0,e>0&&(this.kinds[c].shadow&&s++,this.kinds[c].shadowOnly||o++),a+=e}let u=this.list,d=this.pairKind,f=this.pairId;for(let e=0;e<this.pairs;e++)u[i[d[e]]++]=f[e];let p=this.offsets(0,o),m=this.offsets(1,s),h=0,g=0;for(let t=0;t<e;t++){let e=r[t];if(e===0)continue;let n=this.kinds[t];n.shadowOnly||(p[h++]=t*20,c+=e*n.triangles),n.shadow&&(m[g++]=t*20,l+=e*n.triangles)}this.mainOffsets=p,this.shadowOffsets=m,this.geometry.indirect.offsets=p,this.fadeList&&this.commitFade(),this.visibleInstances=a,this.visibleTriangles=c,this.shadowTriangles=l,a>0&&this.listBuffer.write(u.subarray(0,a)),this.baseBuffer.write(n),this.indirectBuffer.write(t)}commitFade(){let e=this.kinds.length,t=this.fadeCommands,n=this.fadeBaseArray,r=this.fadeCounts,i=this.fadeCursor,a=0,o=0;for(let s=0;s<e;s++){let e=r[s];n[s]=a,i[s]=a;let c=s*5;t[c]=this.indexCount[s],t[c+1]=e,t[c+2]=this.firstIndex[s],t[c+3]=this.baseVertex[s],t[c+4]=0,e>0&&!this.kinds[s].shadowOnly&&o++,a+=e}let s=this.fadeList,c=this.fadeKind,l=this.fadeVal;for(let e=0;e<this.fadePairs;e++)s[i[c[e]]++]=l[e];let u=this.fadePool[o]||(this.fadePool[o]=Array(o).fill(0)),d=0,f=0;for(let t=0;t<e;t++)r[t]===0||this.kinds[t].shadowOnly||(u[d++]=t*20,f+=r[t]*this.kinds[t].triangles);this.fadeOffsets=u,this.fadeGeometry.indirect.offsets=u,this.fadeInstances=a,this.visibleTriangles+=f,a>0&&this.fadeListBuffer.write(s.subarray(0,a)),this.fadeBaseBuffer.write(n),this.fadeIndirectBuffer.write(t),this.fadeMesh&&(this.fadeMesh.visible=o>0)}dispose(){this.geometry.dispose(),this.fadeGeometry&&this.fadeGeometry.dispose();for(let e of[this.instanceBuffer,this.listBuffer,this.baseBuffer,this.indirectBuffer,this.fadeListBuffer,this.fadeBaseBuffer,this.fadeIndirectBuffer])e&&e.destroy();this.mesh&&this.mesh.removeFromParent()}},F={silverside:0,chromis:1,grunt:2,yellowtail:3,tang:4,sergeant:5,wrasse:6,parrot:7,angel:8,barracuda:9,redSnapper:10,grouper:11,tuna:12,mahi:13,mullet:14,needlefish:15,jack:16,tarpon:17,stingray:18,eagleRay:19,turtle:20},I=(e,t,n,r,i,a=.16)=>({from:e,to:t,rays:n,spiny:!0,h:r,rake:i,notch:a}),L=(e,t,n,r,i,a=.015)=>({from:e,to:t,rays:n,spiny:!1,h:r,rake:i,notch:a}),R={silverside:{pattern:F.silverside,body:.83,sec:2,top:[[0,.003],[.03,.016],[.1,.035],[.25,.058],[.45,.068],[.65,.056],[.85,.034],[1,.026]],bot:[[0,.003],[.03,.014],[.1,.032],[.25,.055],[.45,.064],[.65,.05],[.85,.03],[1,.024]],wid:[[0,.003],[.05,.016],[.2,.032],[.4,.036],[.7,.026],[1,.013]],mouth:{corner:.07,y:.004,tip:.006,protrude:0},eye:{u:.1,y:.014,r:.03},opercle:.22,scales:.02,scaleVis:.35,lateral:.05,arch:.1,dorsal:[I(.47,.53,5,[[0,.035],[1,.02]],[.5,.7],.125),L(.63,.74,9,[[0,.04],[1,.02]],[.6,.9])],anal:[L(.58,.78,12,[[0,.035],[1,.018]],[.6,.9])],pectoral:{u:.2,y:.02,len:.1,base:.018,rays:10,shape:`pointed`,spread:.4},pelvic:{u:.45,len:.05,rays:5},caudal:{shape:`forked`,len:.17,span:.1,fork:.5,rays:13},iris:14211264,irid:.8,metal:.65},chromis:{pattern:F.chromis,body:.76,sec:2.1,top:[[0,.005],[.03,.03],[.08,.07],[.16,.12],[.28,.158],[.42,.168],[.56,.153],[.7,.118],[.84,.074],[1,.05]],bot:[[0,.005],[.03,.024],[.08,.054],[.16,.09],[.28,.123],[.42,.133],[.56,.123],[.7,.098],[.84,.064],[1,.045]],wid:[[0,.005],[.05,.03],[.15,.05],[.3,.058],[.5,.053],[.7,.04],[.9,.024],[1,.02]],mouth:{corner:.06,y:0,tip:.004,protrude:0},eye:{u:.15,y:.05,r:.033},opercle:.27,scales:.028,scaleVis:.6,lateral:.55,arch:.15,dorsal:[I(.3,.6,12,[[0,.05],[.3,.075],[1,.07]],[.35,.5]),L(.6,.87,11,[[0,.08],[.5,.085],[1,.035]],[.6,1.1])],anal:[I(.56,.62,2,[[0,.04],[1,.06]],[.4,.5],.1),L(.62,.86,11,[[0,.08],[.4,.085],[1,.035]],[.6,1.1])],pectoral:{u:.3,y:-.01,len:.17,base:.035,rays:17,shape:`pointed`,spread:.45},pelvic:{u:.33,len:.12,rays:6},caudal:{shape:`forked`,len:.24,span:.19,fork:.35,rays:17},iris:4876952,irid:.15,metal:.15},grunt:{pattern:F.grunt,body:.81,sec:2.2,top:[[0,.005],[.03,.026],[.08,.055],[.16,.093],[.28,.13],[.42,.143],[.56,.135],[.7,.105],[.84,.068],[1,.048]],bot:[[0,.005],[.03,.02],[.08,.042],[.16,.072],[.28,.1],[.42,.11],[.56,.103],[.7,.083],[.84,.058],[1,.045]],wid:[[0,.005],[.05,.028],[.15,.05],[.3,.06],[.5,.056],[.7,.042],[.9,.026],[1,.021]],mouth:{corner:.1,y:-.012,tip:-.006,protrude:0},eye:{u:.14,y:.048,r:.026},opercle:.28,scales:.02,scaleVis:.5,lateral:.45,arch:.15,dorsal:[I(.31,.6,12,[[0,.05],[.25,.085],[1,.045]],[.3,.55],.175),L(.6,.84,15,[[0,.055],[.5,.06],[1,.03]],[.6,.95])],anal:[I(.62,.67,3,[[0,.03],[1,.055]],[.4,.5],.1),L(.67,.84,8,[[0,.065],[1,.03]],[.6,.9])],pectoral:{u:.31,y:-.02,len:.16,base:.03,rays:16,shape:`pointed`,spread:.4},pelvic:{u:.34,len:.1,rays:6},caudal:{shape:`forked`,len:.19,span:.14,fork:.55,rays:17},iris:13148224,irid:.25,metal:.25},yellowtail:{pattern:F.yellowtail,body:.77,sec:2.1,top:[[0,.004],[.03,.02],[.08,.045],[.16,.074],[.28,.099],[.42,.108],[.56,.099],[.7,.077],[.85,.051],[1,.037]],bot:[[0,.004],[.03,.016],[.08,.035],[.16,.058],[.28,.079],[.42,.089],[.56,.082],[.7,.063],[.85,.044],[1,.034]],wid:[[0,.004],[.05,.02],[.14,.036],[.28,.047],[.45,.047],[.65,.038],[.85,.026],[1,.017]],mouth:{corner:.1,y:-.008,tip:-.003,protrude:.003},eye:{u:.12,y:.038,r:.022},opercle:.26,scales:.016,scaleVis:.45,lateral:.42,arch:.12,dorsal:[I(.33,.6,10,[[0,.04],[.3,.06],[1,.04]],[.35,.55],.15),L(.6,.83,13,[[0,.045],[1,.025]],[.6,.95])],anal:[I(.62,.66,3,[[0,.025],[1,.04]],[.4,.5],.1),L(.66,.82,9,[[0,.05],[1,.025]],[.6,.9])],pectoral:{u:.3,y:-.015,len:.15,base:.025,rays:15,shape:`pointed`,spread:.4},pelvic:{u:.34,len:.09,rays:6},caudal:{shape:`forked`,len:.23,span:.165,fork:.36,rays:17},iris:14198832,irid:.35,metal:.3},tang:{pattern:F.tang,body:.8,sec:2,top:[[0,.006],[.03,.04],[.08,.1],[.16,.16],[.28,.21],[.42,.232],[.56,.22],[.7,.17],[.84,.095],[1,.042]],bot:[[0,.006],[.03,.035],[.08,.085],[.16,.14],[.28,.19],[.42,.215],[.56,.205],[.7,.16],[.84,.09],[1,.04]],wid:[[0,.005],[.05,.025],[.15,.04],[.3,.046],[.5,.043],[.7,.033],[.9,.02],[1,.015]],mouth:{corner:.04,y:.006,tip:.006,protrude:0},eye:{u:.17,y:.085,r:.026},opercle:.27,scales:0,scaleVis:0,lateral:.75,arch:.1,dorsal:[I(.22,.4,9,[[0,.04],[1,.07]],[.4,.5],.125),L(.4,.9,26,[[0,.07],[.6,.085],[1,.045]],[.55,.95])],anal:[I(.45,.52,3,[[0,.03],[1,.06]],[.4,.5],.1),L(.52,.9,24,[[0,.07],[.6,.08],[1,.045]],[.55,.95])],pectoral:{u:.3,y:0,len:.15,base:.03,rays:16,shape:`pointed`,spread:.45},pelvic:{u:.3,len:.07,rays:5},caudal:{shape:`lunate`,len:.2,span:.19,fork:.55,rays:16},iris:2767480,irid:.1,metal:.05},sergeant:{pattern:F.sergeant,body:.79,sec:2.1,top:[[0,.005],[.03,.032],[.08,.075],[.16,.13],[.28,.175],[.42,.19],[.56,.176],[.7,.138],[.84,.085],[1,.055]],bot:[[0,.005],[.03,.026],[.08,.06],[.16,.103],[.28,.143],[.42,.155],[.56,.143],[.7,.113],[.84,.073],[1,.05]],wid:[[0,.005],[.05,.03],[.15,.05],[.3,.057],[.5,.052],[.7,.04],[.9,.024],[1,.02]],mouth:{corner:.06,y:-.004,tip:0,protrude:0},eye:{u:.15,y:.055,r:.03},opercle:.28,scales:.026,scaleVis:.55,lateral:.6,arch:.15,dorsal:[I(.3,.6,13,[[0,.05],[.3,.07],[1,.065]],[.35,.5]),L(.6,.86,13,[[0,.075],[.5,.08],[1,.035]],[.6,1])],anal:[I(.56,.62,2,[[0,.04],[1,.06]],[.4,.5],.1),L(.62,.85,12,[[0,.075],[.5,.078],[1,.035]],[.6,1])],pectoral:{u:.3,y:-.01,len:.16,base:.035,rays:18,shape:`rounded`,spread:.45},pelvic:{u:.33,len:.11,rays:6},caudal:{shape:`forked`,len:.21,span:.17,fork:.6,rays:17},iris:12628064,irid:.1,metal:.15},wrasse:{pattern:F.wrasse,body:.84,sec:2,top:[[0,.004],[.03,.02],[.08,.042],[.18,.07],[.32,.088],[.5,.09],[.68,.075],[.85,.05],[1,.042]],bot:[[0,.004],[.03,.018],[.08,.038],[.18,.063],[.32,.08],[.5,.082],[.68,.068],[.85,.046],[1,.04]],wid:[[0,.004],[.05,.022],[.15,.038],[.3,.045],[.5,.043],[.7,.034],[.9,.022],[1,.018]],mouth:{corner:.07,y:-.004,tip:0,protrude:0},eye:{u:.13,y:.03,r:.02},opercle:.25,scales:.02,scaleVis:.35,lateral:.55,arch:.25,dorsal:[I(.28,.5,8,[[0,.03],[1,.035]],[.5,.6],.075),L(.5,.85,13,[[0,.038],[1,.03]],[.6,.8])],anal:[L(.56,.84,14,[[0,.03],[1,.028]],[.6,.8])],pectoral:{u:.24,y:0,len:.12,base:.024,rays:13,shape:`rounded`,spread:.5},pelvic:{u:.28,len:.06,rays:5},caudal:{shape:`truncate`,len:.16,span:.1,fork:.88,rays:13},iris:13658688,irid:.15,metal:.1},parrot:{pattern:F.parrot,body:.82,sec:2.2,top:[[0,.012],[.02,.035],[.06,.068],[.12,.098],[.22,.128],[.36,.143],[.5,.14],[.64,.118],[.78,.088],[.9,.066],[1,.058]],bot:[[0,.012],[.02,.03],[.06,.055],[.12,.083],[.22,.108],[.36,.123],[.5,.12],[.64,.103],[.78,.078],[.9,.06],[1,.055]],wid:[[0,.01],[.04,.038],[.12,.062],[.25,.077],[.45,.075],[.65,.06],[.85,.04],[1,.029]],mouth:{corner:.06,y:-.018,tip:-.012,protrude:0},eye:{u:.13,y:.052,r:.018},opercle:.27,scales:.034,scaleVis:.75,lateral:.55,arch:.3,dorsal:[I(.28,.55,9,[[0,.035],[1,.04]],[.5,.6],.075),L(.55,.84,10,[[0,.045],[1,.035]],[.6,.8])],anal:[I(.6,.64,2,[[0,.025],[1,.035]],[.5,.6],.075),L(.64,.83,9,[[0,.04],[1,.032]],[.6,.8])],pectoral:{u:.26,y:0,len:.13,base:.03,rays:13,shape:`rounded`,spread:.5},pelvic:{u:.3,len:.07,rays:5},caudal:{shape:`lunate`,len:.18,span:.14,fork:.62,rays:15},iris:13668400,irid:.1,metal:.05},angel:{pattern:F.angel,body:.82,sec:2,top:[[0,.006],[.03,.045],[.08,.11],[.16,.18],[.28,.24],[.42,.262],[.56,.25],[.7,.205],[.84,.13],[1,.06]],bot:[[0,.006],[.03,.04],[.08,.1],[.16,.165],[.28,.225],[.42,.25],[.56,.24],[.7,.198],[.84,.125],[1,.058]],wid:[[0,.005],[.05,.025],[.15,.04],[.3,.046],[.5,.043],[.7,.034],[.9,.02],[1,.016]],mouth:{corner:.05,y:.004,tip:.006,protrude:0},eye:{u:.18,y:.075,r:.026},opercle:.3,scales:.03,scaleVis:.9,lateral:.7,arch:.1,dorsal:[I(.34,.5,9,[[0,.035],[1,.07]],[.4,.55],.1),L(.5,.95,20,[[0,.09],[.7,.16],[.85,.2],[1,.06]],[.7,1.2])],anal:[I(.5,.58,3,[[0,.03],[1,.06]],[.4,.55],.1),L(.58,.95,18,[[0,.09],[.7,.15],[.85,.19],[1,.06]],[.7,1.2])],pectoral:{u:.33,y:0,len:.15,base:.035,rays:18,shape:`rounded`,spread:.4},pelvic:{u:.32,len:.14,rays:6},caudal:{shape:`rounded`,len:.18,span:.14,fork:1,rays:17},iris:13672480,irid:.05,metal:.05},barracuda:{pattern:F.barracuda,body:.87,sec:2,top:[[0,.002],[.03,.012],[.08,.025],[.16,.041],[.28,.057],[.42,.064],[.58,.063],[.72,.054],[.85,.04],[.95,.03],[1,.028]],bot:[[0,.002],[.03,.014],[.08,.028],[.16,.044],[.28,.057],[.42,.063],[.58,.061],[.72,.051],[.85,.038],[.95,.028],[1,.026]],wid:[[0,.002],[.04,.014],[.12,.028],[.25,.039],[.45,.044],[.65,.039],[.85,.028],[1,.018]],mouth:{corner:.14,y:-.006,tip:-.002,protrude:.012},eye:{u:.12,y:.018,r:.012},opercle:.24,scales:.008,scaleVis:.25,lateral:.2,arch:.05,dorsal:[I(.44,.5,5,[[0,.055],[1,.03]],[.35,.6],.1),L(.74,.8,9,[[0,.05],[1,.02]],[.55,.9])],anal:[L(.75,.81,9,[[0,.045],[1,.02]],[.55,.9])],pectoral:{u:.3,y:-.015,len:.08,base:.016,rays:12,shape:`pointed`,spread:.35},pelvic:{u:.47,len:.05,rays:6},caudal:{shape:`forked`,len:.13,span:.1,fork:.55,rays:17},iris:12107952,irid:.5,metal:.55},redSnapper:{pattern:F.redSnapper,body:.82,sec:2.15,top:[[0,.004],[.02,.02],[.06,.045],[.12,.075],[.2,.11],[.3,.145],[.42,.162],[.55,.155],[.68,.125],[.8,.09],[.9,.062],[1,.05]],bot:[[0,.004],[.02,.018],[.06,.035],[.12,.06],[.2,.09],[.3,.115],[.42,.132],[.55,.128],[.68,.1],[.8,.07],[.9,.054],[1,.048]],wid:[[0,.004],[.03,.02],[.1,.042],[.2,.058],[.35,.066],[.5,.062],[.65,.05],[.8,.034],[.92,.024],[1,.02]],mouth:{corner:.11,y:-.012,tip:-.004,protrude:.004},eye:{u:.135,y:.058,r:.022},opercle:.29,scales:.018,scaleVis:.7,lateral:.45,arch:.15,dorsal:[I(.34,.62,10,[[0,.045],[.3,.085],[1,.065]],[.3,.5],.175),L(.62,.86,14,[[0,.075],[.4,.078],[1,.035]],[.6,.95])],anal:[I(.64,.68,3,[[0,.03],[1,.05]],[.4,.5],.1),L(.68,.84,8,[[0,.075],[1,.035]],[.6,.9])],pectoral:{u:.34,y:-.02,len:.19,base:.034,rays:16,shape:`pointed`,spread:.35},pelvic:{u:.38,len:.11,rays:6},caudal:{shape:`forked`,len:.18,span:.13,fork:.78,rays:17},iris:13119520,irid:.3,metal:.25},grouper:{pattern:F.grouper,body:.84,sec:2.2,top:[[0,.006],[.03,.03],[.08,.06],[.15,.094],[.25,.128],[.38,.148],[.52,.146],[.66,.126],[.8,.094],[.92,.07],[1,.06]],bot:[[0,.006],[.03,.03],[.08,.06],[.15,.09],[.25,.12],[.38,.137],[.52,.134],[.66,.11],[.8,.08],[.92,.063],[1,.058]],wid:[[0,.006],[.04,.035],[.12,.064],[.25,.079],[.4,.081],[.6,.07],[.8,.05],[1,.03]],mouth:{corner:.16,y:-.022,tip:-.01,protrude:.008},eye:{u:.14,y:.07,r:.019},opercle:.33,scales:.011,scaleVis:.4,lateral:.55,arch:.2,dorsal:[I(.3,.6,11,[[0,.04],[.3,.07],[1,.055]],[.3,.45],.21),L(.6,.85,17,[[0,.065],[.5,.075],[1,.03]],[.55,.9])],anal:[I(.64,.68,3,[[0,.025],[1,.04]],[.4,.5],.125),L(.68,.84,8,[[0,.065],[.5,.07],[1,.035]],[.55,.9])],pectoral:{u:.33,y:-.02,len:.16,base:.04,rays:17,shape:`rounded`,spread:.4},pelvic:{u:.35,len:.12,rays:6},caudal:{shape:`rounded`,len:.16,span:.11,fork:1,rays:15},iris:10127968,irid:.05,metal:0},tuna:{pattern:F.tuna,body:.84,sec:2,top:[[0,.003],[.03,.02],[.08,.045],[.15,.075],[.26,.105],[.38,.118],[.5,.115],[.62,.095],[.74,.065],[.86,.035],[.95,.02],[1,.018]],bot:[[0,.003],[.03,.018],[.08,.04],[.15,.065],[.26,.092],[.38,.105],[.5,.102],[.62,.085],[.74,.058],[.86,.032],[.95,.018],[1,.016]],wid:[[0,.003],[.04,.025],[.12,.055],[.25,.08],[.4,.088],[.55,.08],[.7,.058],[.85,.035],[.95,.03],[1,.02]],mouth:{corner:.085,y:-.008,tip:-.003,protrude:.003},eye:{u:.1,y:.03,r:.022},opercle:.26,scales:0,scaleVis:0,lateral:.3,arch:.2,dorsal:[I(.3,.47,13,[[0,.07],[.3,.06],[1,.015]],[.45,.8],.1),L(.52,.6,12,[[0,.1],[.5,.05],[1,.015]],[.75,1.1])],anal:[L(.56,.63,12,[[0,.09],[.5,.045],[1,.012]],[.75,1.1])],pectoral:{u:.3,y:0,len:.2,base:.03,rays:12,shape:`falcate`,spread:.3},pelvic:{u:.32,len:.06,rays:5},caudal:{shape:`lunate`,len:.16,span:.25,fork:.25,rays:19},finlets:{from:.64,to:.95,dorsal:8,ventral:7},iris:12623936,irid:.9,metal:.55},mahi:{pattern:F.mahi,body:.83,sec:2,top:[[0,.016],[.005,.075],[.013,.12],[.03,.148],[.07,.16],[.18,.154],[.32,.134],[.48,.112],[.64,.088],[.8,.06],[.92,.036],[1,.026]],bot:[[0,.01],[.03,.045],[.08,.072],[.15,.09],[.3,.096],[.45,.09],[.6,.078],[.75,.06],[.9,.035],[1,.022]],wid:[[0,.008],[.04,.034],[.15,.05],[.3,.052],[.5,.045],[.7,.035],[.9,.02],[1,.015]],mouth:{corner:.075,y:-.03,tip:-.02,protrude:.004},eye:{u:.085,y:.012,r:.017},opercle:.22,scales:.007,scaleVis:.2,lateral:.25,arch:.25,dorsal:[L(.07,.97,44,[[0,.075],[.08,.105],[.3,.08],[.8,.055],[1,.03]],[.35,.9])],anal:[L(.5,.97,24,[[0,.055],[.2,.06],[1,.03]],[.5,.9])],pectoral:{u:.2,y:-.02,len:.11,base:.022,rays:16,shape:`pointed`,spread:.4},pelvic:{u:.22,len:.08,rays:6},caudal:{shape:`forked`,len:.17,span:.17,fork:.3,rays:17},iris:9079376,irid:.6,metal:.25},mullet:{pattern:F.mullet,body:.82,sec:2.15,top:[[0,.008],[.03,.03],[.08,.055],[.16,.08],[.28,.1],[.42,.107],[.56,.1],[.7,.082],[.84,.058],[1,.044]],bot:[[0,.008],[.03,.028],[.08,.05],[.16,.072],[.28,.088],[.42,.093],[.56,.086],[.7,.07],[.84,.05],[1,.04]],wid:[[0,.008],[.04,.036],[.12,.06],[.25,.072],[.42,.072],[.6,.06],[.8,.04],[1,.024]],mouth:{corner:.055,y:-.004,tip:0,protrude:0},eye:{u:.1,y:.024,r:.02},opercle:.25,scales:.024,scaleVis:.6,lateral:.3,arch:0,dorsal:[I(.44,.52,4,[[0,.06],[1,.035]],[.35,.6],.125),L(.66,.74,9,[[0,.06],[1,.025]],[.55,.9])],anal:[L(.62,.72,11,[[0,.055],[1,.025]],[.55,.9])],pectoral:{u:.27,y:.03,len:.13,base:.022,rays:16,shape:`pointed`,spread:.45},pelvic:{u:.4,len:.08,rays:6},caudal:{shape:`forked`,len:.18,span:.13,fork:.6,rays:15},iris:13154448,irid:.5,metal:.55},needlefish:{pattern:F.needlefish,body:.9,sec:2,top:[[0,.0015],[.1,.0035],[.17,.007],[.22,.017],[.28,.026],[.4,.032],[.6,.034],[.78,.03],[.9,.02],[1,.014]],bot:[[0,.0015],[.1,.0035],[.17,.007],[.22,.016],[.28,.024],[.4,.03],[.6,.032],[.78,.028],[.9,.019],[1,.013]],wid:[[0,.0015],[.1,.003],[.18,.008],[.24,.02],[.4,.026],[.7,.024],[.9,.016],[1,.012]],mouth:{corner:.2,y:0,tip:0,protrude:.006},eye:{u:.235,y:.008,r:.012},opercle:.3,scales:0,scaleVis:0,lateral:-.7,arch:0,dorsal:[L(.76,.9,14,[[0,.04],[.2,.035],[1,.018]],[.6,.95])],anal:[L(.73,.89,18,[[0,.04],[.2,.035],[1,.018]],[.6,.95])],pectoral:{u:.33,y:.006,len:.06,base:.01,rays:12,shape:`pointed`,spread:.35},pelvic:{u:.62,len:.04,rays:6},caudal:{shape:`forked`,len:.1,span:.06,fork:.75,rays:15},iris:13686984,irid:.6,metal:.55},jack:{pattern:F.jack,body:.78,sec:2,top:[[0,.004],[.03,.024],[.08,.055],[.16,.088],[.28,.114],[.42,.12],[.56,.107],[.7,.078],[.84,.042],[.94,.024],[1,.02]],bot:[[0,.004],[.03,.02],[.08,.046],[.16,.074],[.28,.098],[.42,.105],[.56,.094],[.7,.068],[.84,.037],[.94,.022],[1,.019]],wid:[[0,.004],[.05,.022],[.15,.04],[.3,.048],[.5,.044],[.7,.032],[.88,.02],[1,.016]],mouth:{corner:.09,y:-.006,tip:-.002,protrude:.002},eye:{u:.12,y:.03,r:.024},opercle:.26,scales:.008,scaleVis:.2,lateral:.35,arch:.45,dorsal:[I(.34,.46,8,[[0,.045],[.3,.05],[1,.02]],[.4,.7],.15),L(.47,.84,27,[[0,.075],[.15,.06],[1,.025]],[.55,1.05])],anal:[I(.54,.57,2,[[0,.02],[1,.03]],[.5,.6],.15),L(.58,.84,24,[[0,.065],[.15,.05],[1,.022]],[.55,1.05])],pectoral:{u:.29,y:0,len:.2,base:.024,rays:19,shape:`falcate`,spread:.35},pelvic:{u:.31,len:.07,rays:6},caudal:{shape:`forked`,len:.22,span:.19,fork:.25,rays:17},iris:13156512,irid:.7,metal:.5},tarpon:{pattern:F.tarpon,body:.8,sec:2.05,top:[[0,.004],[.03,.02],[.08,.045],[.16,.075],[.28,.1],[.42,.11],[.56,.102],[.7,.08],[.84,.052],[1,.036]],bot:[[0,.004],[.03,.022],[.08,.05],[.16,.078],[.28,.098],[.42,.105],[.56,.098],[.7,.077],[.84,.05],[1,.034]],wid:[[0,.004],[.05,.025],[.15,.044],[.3,.052],[.5,.05],[.7,.04],[.88,.026],[1,.018]],mouth:{corner:.13,y:.004,tip:.018,protrude:.014},eye:{u:.09,y:.028,r:.022},opercle:.22,scales:.05,scaleVis:1,lateral:.05,arch:.05,dorsal:[L(.45,.56,13,[[0,.07],[.6,.06],[.93,.05],[1,.2]],[.45,.95])],anal:[L(.64,.78,20,[[0,.07],[.3,.05],[1,.02]],[.5,.95])],pectoral:{u:.24,y:-.06,len:.13,base:.02,rays:13,shape:`pointed`,spread:.5},pelvic:{u:.43,len:.08,rays:9},caudal:{shape:`forked`,len:.2,span:.17,fork:.35,rays:19},iris:12632240,irid:.3,metal:.8},stingray:{pattern:F.stingray,body:1,eye:{u:.3,y:.05,r:.012},opercle:.4,mouth:{corner:.1,y:-.03,tip:-.03},lateral:0,arch:0,scales:0,scaleVis:0,iris:6316096,irid:0,metal:0},eagleRay:{pattern:F.eagleRay,body:1,eye:{u:.2,y:.05,r:.014},opercle:.3,mouth:{corner:.1,y:-.03,tip:-.03},lateral:0,arch:0,scales:0,scaleVis:0,iris:4210752,irid:0,metal:0},turtle:{pattern:F.turtle,body:1,eye:{u:.1,y:.04,r:.013},opercle:.2,mouth:{corner:.05,y:0,tip:0},lateral:0,arch:0,scales:0,scaleVis:0,iris:3153936,irid:0,metal:0}},Pe={silverside:{back:7178874,flank:12897486,belly:15133418,fin:11056302,edge:10003616,rough:.3},chromis:{back:1522296,flank:2581688,belly:5605572,fin:2974384,edge:791588,rough:.4},grunt:{back:11045420,flank:14466106,belly:15130032,fin:14199856,edge:13146660,rough:.4},yellowtail:{back:5663378,flank:10397374,belly:15722212,fin:14468726,edge:14860352,rough:.35},tang:{back:1190252,flank:2245280,belly:2771624,fin:2375574,edge:6988508,rough:.45},sergeant:{back:12889148,flank:13028028,belly:15132380,fin:11184792,edge:9079424,rough:.4},wrasse:{back:13941790,flank:14994492,belly:15658708,fin:14469782,edge:13152368,rough:.4},parrot:{back:1927756,flank:3054202,belly:7126172,fin:3971706,edge:13400666,rough:.4},angel:{back:921106,flank:1184278,belly:1447450,fin:921106,edge:2892816,rough:.45},barracuda:{back:3556940,flank:11844800,belly:15133420,fin:5923940,edge:2896948,rough:.3},redSnapper:{back:12073532,flank:14183018,belly:15649988,fin:13384756,edge:12069924,rough:.33},grouper:{back:8020552,flank:11836540,belly:14208180,fin:7232064,edge:3944484,rough:.4},tuna:{back:923176,flank:6714506,belly:14080734,fin:1975856,edge:1448482,rough:.28},mahi:{back:1203306,flank:13481258,belly:15721114,fin:2907292,edge:1854620,rough:.3},mullet:{back:4741206,flank:11844798,belly:15133418,fin:8686732,edge:7107700,rough:.33},needlefish:{back:3569260,flank:11848908,belly:15659762,fin:7771790,edge:4613740,rough:.3},jack:{back:5666444,flank:12372176,belly:15133934,fin:8819868,edge:3949644,rough:.3},tarpon:{back:3558492,flank:13949660,belly:15659250,fin:8819868,edge:5002844,rough:.28},stingray:{back:7102540,flank:8023126,belly:14210768,fin:4997686,edge:9075814,rough:.5},eagleRay:{back:1316894,flank:1843240,belly:14738146,fin:1053720,edge:2764342,rough:.35},turtle:{back:4076064,flank:8808506,belly:13154436,fin:4866616,edge:10130048,rough:.45}},z={BODY:0,DORSAL1:1,DORSAL2:2,ANAL:3,CAUDAL:4,PECTORAL:5,PELVIC:6,FINLET:7,EYE:8,MOUTH:9,FLESH:10,ICE:11,LEAF:12,SHELL:13,FILLET:14,DISC:15,WHIP:16,CARAPACE:17,SKIN:18,FLIPPER:19},Fe=Math.PI*2,Ie=(e,t)=>{if(t<=e[0][0])return e[0][1];for(let n=1;n<e.length;n++)if(t<=e[n][0]){let r=e[n-1],i=e[n],a=(t-r[0])/(i[0]-r[0]),o=a*a*(3-2*a);return r[1]+(i[1]-r[1])*(.5*a+.5*o)}return e[e.length-1][1]},B=(e,t,n)=>e+(t-e)*n,V=(e,t,n)=>Math.max(t,Math.min(n,e)),Le=(e,t,n)=>{let r=V((n-e)/(t-e),0,1);return r*r*(3-2*r)},Re=class{constructor(){this.pos=[],this.dat=[],this.idx=[],this.seams=[]}v(e,t,n,r,i,a,o){return this.pos.push(e,t,n),this.dat.push(r,i,a,o),this.pos.length/3-1}tri(e,t,n){this.idx.push(e,t,n)}quad(e,t,n,r){this.idx.push(e,t,r,t,n,r)}build(){let e=new f;e.setAttribute(`position`,new p(this.pos,3)),e.setAttribute(`aData`,new p(this.dat,4)),e.setIndex(this.idx),e.computeVertexNormals();let t=e.attributes.normal.array;for(let[e,n]of this.seams){let r=t[e*3]+t[n*3],i=t[e*3+1]+t[n*3+1],a=t[e*3+2]+t[n*3+2],o=Math.hypot(r,i,a)||1;r/=o,i/=o,a/=o,t[e*3]=t[n*3]=r,t[e*3+1]=t[n*3+1]=i,t[e*3+2]=t[n*3+2]=a}return e.computeBoundingSphere(),e}};function H(e,t){return{T:Ie(e.top,t),B:Ie(e.bot,t),W:Ie(e.wid,t),e:2/e.sec}}function ze(e,t,n){let r=Math.sin(t),i=Math.cos(t);return n[0]=e.W*Math.sign(r)*Math.abs(r)**+e.e,n[1]=(i>=0?e.T:e.B)*Math.sign(i)*Math.abs(i)**+e.e,n}function Be(e,t){let n=[0,0],r=[0,0];ze(e,0,n);let i=0;for(let a=1;a<=24;a++)ze(e,t*a/24,r),i+=Math.hypot(r[0]-n[0],r[1]-n[1]),n[0]=r[0],n[1]=r[1];return i}function Ve(e,t){let n=t>=0?e.T:e.B,r=Math.min(1,Math.abs(t)/Math.max(n,1e-4)),i=2/e.e;return e.W*Math.max(0,1-r**+i)**(1/i)}function He(e,t){let n=e.e,r=t>=0?V(t/Math.max(e.T,1e-4),0,.97)**(1/n):-(V(-t/Math.max(e.B,1e-4),0,.97)**(1/n));return Math.acos(r)}function Ue(e,t,n,r){let i=[34,16,7,4][t],a=[];for(let e=0;e<=i;e++){let t=e/i;a.push(.6*t**1.55+.4*t)}a[0]=[.006,.014,.03,.05][t],t<2&&(e=>{let t=1,n=1/0;for(let r=1;r<a.length-1;r++){let i=Math.abs(a[r]-e);i<n&&(n=i,t=r)}a[t]=e})(e.mouth.corner);let o=a.filter(e=>e>=n-1e-6&&e<=r+1e-6);return o[0]>n+1e-4&&n>0&&o.unshift(n),o[o.length-1]<r-1e-4&&o.push(r),o}function We(e,t,n){let r=n.lod,i=t.body,a=e=>.5-e*i,o=n.u0??0,s=n.u1??1,c=[26,14,7,5][r],l=Ue(t,r,o,s),u=n.mouth&&o===0,d=t.mouth,f=d.corner,p=e=>B(d.tip,d.y,Math.min(1,e/f)),m=H(t,f),h=He(m,d.y),g=V(Math.round(c*h/Math.PI),3,c-3),_=c-g,v=e=>u?1-Le(f*.8,f*1.3,e):0,y=[],b=[0,0];for(let n of l){let r=H(t,n),o=n<f?He(r,p(n)):He(r,d.y*(r.T+r.B)/(m.T+m.B)),s=a(n),c={u:n,upper:[],lower:[]},l=v(n),u=Be(r,Math.PI);for(let t=0;t<=g;t++){let a=-o+2*o*t/g;ze(r,a,b);let l=Be(r,Math.abs(a)),u=b[1]>=0?b[1]/Math.max(r.T,1e-4):b[1]/Math.max(r.B,1e-4);c.upper.push(e.v(b[0],b[1],s,n*i,z.BODY,l,u))}for(let t=0;t<=_;t++){let a=o+(Fe-2*o)*t/_;ze(r,a,b);let d=a>Math.PI?Fe-a:a,p=Math.min(u,Be(r,d)),m=b[1]>=0?b[1]/Math.max(r.T,1e-4):b[1]/Math.max(r.B,1e-4),h=(t===0||t===_)&&n>=f?0:l;c.lower.push(e.v(b[0],b[1],s,n*i,z.BODY+.9*h,p,m))}e.seams.push([c.upper[g],c.lower[0]],[c.upper[0],c.lower[_]]),c.c=r,c.z=s,c.phiM=o,c.wj=l,c.jawFwd=0,y.push(c)}for(let t=0;t<y.length-1;t++){let n=y[t],r=y[t+1];for(let t=0;t<g;t++)e.quad(n.upper[t],n.upper[t+1],r.upper[t+1],r.upper[t]);for(let t=0;t<_;t++)e.quad(n.lower[t],n.lower[t+1],r.lower[t+1],r.lower[t])}let x=y[0],S=y[y.length-1];if(o===0){let t=.5,n=p(0),r=Math.min(x.c.T,x.c.B)*.3,a=e.v(0,n+r*.5,t,0,z.BODY,0,0),o=e.v(0,n-r*.5,t+(u?d.protrude:0),0,z.BODY+.9*!!u,0,0);for(let t=0;t<g;t++)e.tri(a,x.upper[t+1],x.upper[t]);for(let t=0;t<_;t++)e.tri(o,x.lower[t+1],x.lower[t]);if(u||(e.tri(a,x.upper[0],o),e.tri(a,o,x.upper[g])),u){let t=[],n=[],r=y.filter(e=>e.u<=f+1e-6),s=e=>Math.min(1,e/f);for(let a of r){let r=.45*(1-s(a.u)),o=p(a.u),c=a.upper[g],l=a.upper[0],u=e.pos[c*3],d=e.pos[l*3],f=e.pos[c*3+1],m=a.c.T,h=a.c.B,_=s(a.u);t.push([e.v(u*.97,f,a.z,a.u*i,z.MOUTH,_,0),e.v(0,o+r*(m-o)*.8,a.z-.004,a.u*i,z.MOUTH,_,0),e.v(d*.97,f,a.z,a.u*i,z.MOUTH,_,0)]);let v=a.wj,y=a.z+a.jawFwd;n.push([e.v(u*.97,f,y,a.u*i,z.MOUTH+.9*v,_,0),e.v(0,o-r*(o+h)*.8,y-.004,a.u*i,z.MOUTH+.9*v,_,0),e.v(d*.97,f,y,a.u*i,z.MOUTH+.9*v,_,0)])}for(let r=0;r<t.length-1;r++){let i=t[r],a=t[r+1];e.quad(i[0],i[1],a[1],a[0]),e.quad(i[1],i[2],a[2],a[1]);let o=n[r],s=n[r+1];e.quad(o[1],o[0],s[0],s[1]),e.quad(o[2],o[1],s[1],s[2])}let c=t[0],l=n[0];e.tri(a,c[1],c[0]),e.tri(a,c[2],c[1]),e.tri(o,l[0],l[1]),e.tri(o,l[1],l[2])}}else Ge(e,x,g,_,i,!0);if(s>=1){let t=e.v(0,0,S.z-.004,i,z.BODY,0,0);for(let n=0;n<g;n++)e.tri(t,S.upper[n],S.upper[n+1]);for(let n=0;n<_;n++)e.tri(t,S.lower[n],S.lower[n+1])}else Ge(e,S,g,_,i,!1);return y}function Ge(e,t,n,r,i,a){let o=[...t.upper,...t.lower.slice(1,r)].map(n=>{let r=e.pos[n*3],a=e.pos[n*3+1];return e.v(r,a,t.z,t.u*i,z.FLESH,r,a)}),s=e.v(0,(t.c.T-t.c.B)*.3,t.z,t.u*i,z.FLESH,0,(t.c.T-t.c.B)*.3);for(let t=0;t<o.length;t++){let n=o[t],r=o[(t+1)%o.length];a?e.tri(s,r,n):e.tri(s,n,r)}}function Ke(e,t,n,r,i,a,o){let s=[];for(let e=0;e<n.length;e++)if(s.push({...n[e],dip:0,id:a[e]}),e<n.length-1){let t=n[e],i=n[e+1],o=(e,t)=>[(e[0]+t[0])/2,(e[1]+t[1])/2,(e[2]+t[2])/2];s.push({b:o(t.b,i.b),t:o(t.t,i.t),ub:(t.ub+i.ub)/2,ut:(t.ut+i.ut)/2,dip:r,id:(a[e]+a[e+1])/2})}for(let n of[!1,!0]){let r=[];for(let n of s){let a=[],o=1-n.dip;for(let r=0;r<=i;r++){let s=r/i*o;a.push(e.v(B(n.b[0],n.t[0],s),B(n.b[1],n.t[1],s),B(n.b[2],n.t[2],s),B(n.ub,n.ut,s),t,s,n.id))}r.push(a)}for(let t=0;t<r.length-1;t++)for(let a=0;a<i;a++){let i=r[t][a],s=r[t+1][a],c=r[t+1][a+1],l=r[t][a+1];n===o?e.quad(i,s,c,l):e.quad(s,i,l,c)}}}function qe(e,t){if(e<=t)return[...Array(e).keys()];let n=[];for(let r=0;r<t;r++)n.push(Math.round(r*(e-1)/(t-1)));return n}function Je(e,t,n,r,i){let a=t.body,o=e=>.5-e*a,s=i.pose===`dead`,c=[3,1,1,1][i.lod];n.forEach((n,l)=>{let u=r>0?n.spiny?z.DORSAL1:z.DORSAL2:z.ANAL,d=qe(n.rays,[40,7,3,2][i.lod]),f=s?n.spiny?.42:.22:0;Ke(e,u,d.map(e=>{let i=n.rays>1?e/(n.rays-1):0,c=B(n.from,n.to,i),l=H(t,c),u=r>0?l.T*.9:-l.B*.9,d=Ie(n.h,i)+(r>0?l.T:l.B)*.1,p=B(n.rake[0],n.rake[1],i);p=B(p,1.45,f),d*=s?n.rays>30?.85:.95:1;let m=[0,u+r*d*Math.cos(p),o(c)-d*Math.sin(p)];return{b:[0,u,o(c)],t:m,ub:c*a,ut:c*a+d*Math.sin(p)}}),i.lod>=2?0:n.notch,c,d.map(e=>e+l*40),r<0)})}function Ye(e,t,n){let r=t.caudal,i=t.body,a=.5-i+.014,o=H(t,1),s=Math.min(o.T,o.B)*.9,c=n.pose===`dead`,l=r.rays,u=qe(l,[40,9,5,3][n.lod]),d=r.span*(c?.93:1),f=u.map(e=>{let t=-1+2*e/(l-1),n=Math.abs(t),o,c;return r.shape===`rounded`?(o=d*t*.95,c=r.len*(1-.3*t*t)):r.shape===`truncate`?(o=d*t,c=r.len*(1-.05*t*t)*B(r.fork,1,n)):r.shape===`lunate`?(o=d*t*(.75+.25*n),c=r.len*(r.fork+(1-r.fork)*n**1.8)):(o=d*t,c=r.len*(r.fork+(1-r.fork)*n**1.3)),{b:[0,s*t,a],t:[0,o,a-.014-c],ub:i-.014,ut:i+c}});Ke(e,z.CAUDAL,f,n.lod>=2?0:.05,[3,1,1,1][n.lod],u,!1)}function Xe(e,t,n,r,i){let a=t.body,o=e=>.5-e*a,s=i.pose===`dead`,c=H(t,n.u),l=n.rays,u=qe(l,[24,5,3,2][i.lod]),d=[2,1,1,1][i.lod],f=r===z.PELVIC;for(let p of[1,-1]){let m=u.map(e=>{let t=l>1?e/(l-1):0,r,i,u,d,m;if(f)r=-c.B*.88,i=p*(c.W*.22+t*c.W*.12),u=B(-.35,-.75,t),d=n.len*(1-.45*t),m=s?.14:.35;else{r=n.y+n.base*(.5-t),i=p*Ve(c,r)*.94;let e=n.shape;u=e===`falcate`?B(.05,-.55,t):e===`pointed`?B(.1,-.85,t):B(.25,-1.1,t),d=n.len*(e===`falcate`?1-.85*t**.55:e===`pointed`?1-.62*t**.9:.62+.38*Math.sin(Math.PI*(.15+.85*t))),m=s?.16:n.spread,s&&(u=u*.6-.08)}let h=[p*Math.sin(m)*Math.cos(u),Math.sin(u),-Math.cos(m)*Math.cos(u)],g=o(n.u);return{b:[i,r,g],t:[i+h[0]*d,r+h[1]*d,g+h[2]*d],ub:n.u*a,ut:n.u*a-h[2]*d}}),h=e.pos.length/3;Ke(e,r,m,i.lod>=2?0:.035,d,u,p<0);for(let n=h;n<e.pos.length/3;n++){let r=e.pos[n*3],i=e.pos[n*3+1],o=e.pos[n*3+2],s=Ve(H(t,V((.5-o)/a,0,1)),i)+.004;Math.abs(r)<s&&(e.pos[n*3]=p*s)}}}function Ze(e,t,n){let r=t.finlets,i=t.body,a=e=>.5-e*i;for(let[n,o]of[[r.dorsal,1],[r.ventral,-1]])for(let s=0;s<n;s++){let c=B(r.from,r.to,(s+.5)/n),l=H(t,c),u=o>0?l.T*.85:-l.B*.85,d=(r.to-r.from)/n*.75,f=.006+(o>0?l.T:l.B)*.12;for(let t of[!1,!0]){let n=e.v(0,u,a(c),c*i,z.FINLET,0,0),r=e.v(0,u,a(c+d),(c+d)*i,z.FINLET,0,1),s=e.v(0,u+o*f,a(c+d*1.6),(c+d*1.6)*i,z.FINLET,1,.5);o>0===t?e.tri(n,r,s):e.tri(n,s,r)}}}function Qe(e,t,n){let i=t.eye,a=t.body,o=i.u,s=.5-o*a,c=H(t,o),l=i.r,u=n.lod===0?18:10,d=n.lod===0?5:2,f=.34*l;for(let t of[1,-1]){let n=Ve(c,i.y),p=new r(t,.06,.22).normalize(),m=new r(0,1,0).addScaledVector(p,-p.y).normalize(),h=new r().crossVectors(p,m),g=new r(t*(n-l*.12),i.y,s),_=[];for(let n=0;n<=d;n++){let r=n/d,i=[],s=n===0?1:u;for(let n=0;n<s;n++){let s=n/u*Fe,c=Math.cos(s)*r,d=Math.sin(s)*r,_=f*(1-r*r)+l*.12,v=g.x+m.x*d*l+h.x*c*l+p.x*_,y=g.y+m.y*d*l+h.y*c*l+p.y*_,b=g.z+m.z*d*l+h.z*c*l+p.z*_;i.push(e.v(v,y,b,o*a,z.EYE,c*t,d))}_.push(i)}for(let n=0;n<d;n++)for(let r=0;r<u;r++){let i=(r+1)%u;if(n===0)t>0?e.tri(_[0][0],_[1][r],_[1][i]):e.tri(_[0][0],_[1][i],_[1][r]);else{let a=_[n][r],o=_[n][i],s=_[n+1][i],c=_[n+1][r];t>0?e.quad(a,c,s,o):e.quad(a,o,s,c)}}}}function $e(e,t={}){let n={lod:0,pose:`swim`,...t},r=n.lod;n.mouth=n.mouth??(r<2&&n.pose===`dead`);let i=new Re,a=n.u0??0,o=n.u1??1;We(i,e,n);let s=e=>e>=a&&e<=o;return n.fins!==!1&&(Je(i,e,(e=>r<3?e:e.slice(-1))(e.dorsal.filter(e=>s(e.from))),1,n),r<3&&Je(i,e,e.anal.filter(e=>s(e.from)),-1,n),o>=1&&Ye(i,e,n),s(e.pectoral.u)&&r<3&&Xe(i,e,e.pectoral,z.PECTORAL,n),e.pelvic&&s(e.pelvic.u)&&r<2&&Xe(i,e,e.pelvic,z.PELVIC,n),e.finlets&&r<2&&o>=1&&Ze(i,e,n)),(n.eyes??r===0)&&s(e.eye.u)&&Qe(i,e,n),i.build()}function et(e,{lod:t=0}={}){let n=new Re,r=e.body,i=e=>.5-e*r,a=e.opercle+.02,o=[16,7][t],s=[8,4][t],c=(H(e,a).T+H(e,a).B)*.8,l=t=>{let n=(t-a)/(1-a),r=H(e,t);return Math.max((r.T+r.B)*.55,c*(1-.72*n**1.1)*(1-.15*(1-n)*(1-n)))},u=(t,n)=>{let r=H(e,t);return Math.max(.004,r.W*.5*(1-.75*n*n))},d=(e,t)=>.012*t*t*(1-.5*e),f=[],p=[];for(let e=0;e<=o;e++){let t=B(a,1,(e/o)**.85),c=l(t),m=i(t),h=[],g=[];for(let i=-s;i<=s;i++){let a=Math.abs(i/s),o=i/s*c,l=m-(e===0?.04*a*a:0),f=d(t,a),p=u(t,a);h.push(n.v(o,f+p*.5,l,t*r,z.FILLET,i/s,l)),g.push(n.v(o,f-p*.5,l,t*r,z.BODY,Math.abs(o),1-2*a))}f.push(h),p.push(g)}let m=2*s;for(let e=0;e<o;e++)for(let t=0;t<m;t++)n.quad(f[e][t],f[e][t+1],f[e+1][t+1],f[e+1][t]),n.quad(p[e][t+1],p[e][t],p[e+1][t],p[e+1][t+1]);let h=(e,t,r)=>{for(let i=0;i<e.length-1;i++)r?n.quad(e[i+1],e[i],t[i],t[i+1]):n.quad(e[i],e[i+1],t[i+1],t[i])},g=(e,t)=>e.map(e=>e[t]);h(f[0],p[0],!1),h(g(f,0),g(p,0),!1),h(g(f,m),g(p,m),!0);let _=e.caudal,v=[13,5][t],y=i(1)+.01,b=l(1)*.9,x=[],S=[];for(let e=0;e<v;e++){let t=-1+2*e/(v-1),n=Math.abs(t),i=_.len*(_.shape===`rounded`||_.shape===`truncate`?1-.2*t*t:B(_.fork,1,n**1.3))*.9;x.push({b:[b*t,d(1,n),y],t:[_.span*.8*t,d(1,n)+.004,y-i],ub:r,ut:r+i}),S.push(e)}return Ke(n,z.CAUDAL,x,.08,1,S,!0),n.build()}var tt=new l({name:`lodFade`,code:`
// Bayer 4x4 threshold in (0, 1): bit-interleaved formula of
//   0  8  2 10 / 12  4 14  6 / 3 11  1  9 / 15  7 13  5
fn bayer4( pixel: vec2f ) -> f32 {
	let f = frame.frameIndex;
	// shift the pattern by a different offset every frame (all 16 over 16 frames)
	let p = vec2u( pixel ) + vec2u( f * 3u, ( f >> 2u ) * 1u );
	let x0 = p.x & 1u; let x1 = ( p.x >> 1u ) & 1u;
	let y0 = p.y & 1u; let y1 = ( p.y >> 1u ) & 1u;
	let v = ( ( x0 ^ y0 ) << 3u ) | ( y0 << 2u ) | ( ( x1 ^ y1 ) << 1u ) | y1;
	return ( f32( v ) + 0.5 ) / 16.0;
}

fn lodFadeVisible( pixel: vec2f, fade: f32, outgoing: bool ) -> bool {
	let t = bayer4( pixel );
	return select( ( t < fade ), ( t >= fade ), outgoing );
}
`});function nt(e,t,n){let r=(e-t)/Math.max(n-t,1e-6);return r<=0?0:r>=1?1:r*r*(3-2*r)}var rt=8,it=Object.keys(F).sort((e,t)=>F[e]-F[t]);function at(){let e=[],t=e=>new d(e);for(let n of it){let r=R[n],i=Pe[n],o=t(i.back),s=t(i.flank),c=t(i.belly),l=t(i.fin),u=t(i.edge),d=t(r.iris),f=r.body;e.push(new a(o.r,o.g,o.b,r.metal*.55),new a(s.r,s.g,s.b,r.irid),new a(c.r,c.g,c.b,i.rough),new a(l.r,l.g,l.b,r.mouth.tip),new a(u.r,u.g,u.b,r.scales),new a(d.r,d.g,d.b,r.scaleVis),new a(.5-r.eye.u*f,r.eye.y,r.eye.r,.5-r.opercle*f),new a(r.lateral,r.arch,.5-r.mouth.corner*f,r.mouth.y))}return new s(`FishSkin`,{rows:[`vec4f[${e.length}]`,e]},{label:`fishSkin`})}var ot=null,st=()=>ot||=at(),ct=e=>{let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},U=e=>ct(F[e]),W=e=>ct(z[e]),lt=null;function ut(){return lt||(lt=new l({name:`fish`,deps:[y,tt],uniforms:st(),uniformName:`fishSkin`,code:`
fn fishRotateQ( q: vec4f, v: vec3f ) -> vec3f { return v + cross( q.xyz, cross( q.xyz, v ) + v * q.w ) * 2.0; }
fn fishRow( pattern: f32, k: i32 ) -> vec4f { return fishSkin.rows[ clamp( i32( pattern ), 0, ${it.length-1} ) * ${rt} + k ]; }
fn fishPartOf( d: vec4f ) -> f32 { return floor( d.y + 0.01 ); }
fn fishJawOf( d: vec4f ) -> f32 { return max( fract( d.y + 0.01 ) - 0.01, 0.0 ) / 0.9; }

fn fishHash( p: vec2f ) -> f32 { return fract( sin( dot( p, vec2f( 127.1, 311.7 ) ) ) * 43758.5453 ); }

// value noise 2D (cheap, for blotches and skin variation)
fn fishVnoise( p: vec2f ) -> f32 {
	let i = floor( p ); let f = fract( p );
	let w = f * f * ( 3.0 - f * 2.0 );
	let a = fishHash( i ); let b = fishHash( i + vec2f( 1.0, 0.0 ) ); let c = fishHash( i + vec2f( 0.0, 1.0 ) ); let d = fishHash( i + vec2f( 1.0, 1.0 ) );
	return mix( mix( a, b, w.x ), mix( c, d, w.x ), w.y );
}

// posterior edge of the gill cover (local z) at height fraction h: convex backward, sweeping
// forward under the throat
fn fishOpercleEdge( zOp: f32, h: f32 ) -> f32 { return zOp - 0.028 * ( 1.0 - h * h ) + smoothstep( -0.35, -1.0, h ) * 0.07; }
fn fishOpercleMask( h: f32 ) -> f32 { return smoothstep( -0.98, -0.9, h ) * ( 1.0 - smoothstep( 0.45, 0.62, h ) ); }

fn fishBand( x: f32, center: f32, width: f32, soft: f32 ) -> f32 { return 1.0 - smoothstep( width, width + soft, abs( x - center ) ); }

// Deformation as a function of the phase (evaluated for this and the previous frame):
// fish: travelling body wave (amplitude grows toward the tail) plus the turning bend,
// sculling pectorals; rays: the disc margins undulate (stingray) or flap (eagle ray);
// turtle: the front flippers stroke, the hind ones paddle.
// d = aData, p = rest position, amp = wave amplitude, bend = turning bend at this vertex
fn fishSwimOffset( ph: f32, d: vec4f, p: vec3f, env: f32, amp: f32, bend: f32, eagle: bool ) -> vec3f {
	let u = d.x;
	let part = fishPartOf( d );
	let isDisc = part == ${W(`DISC`)};
	let isFlip = part == ${W(`FLIPPER`)};
	let turtle = part > ${ct(z.WHIP+.5)};
	let side = d.z; // rays: distance from the midline; flippers: along the flipper
	let lat = sin( ph - u * 5.6 ) * env * amp + bend;
	let flap = select( 0.0, sin( ph * 0.7 + 1.3 ) * d.z * 0.035, part == ${W(`PECTORAL`)} );
	let fish = vec3f( lat + flap * sign( p.x ), 0.0, 0.0 );
	let k = select( 8.0, 1.2, eagle );
	let disc = vec3f( 0.0, sin( ph - u * k ) * pow( side, 1.6 ) * amp, 0.0 );
	let front = d.w < 1.5;
	let stroke = vec3f( 0.0, sin( ph ) * select( 0.07, 0.3, front ), cos( ph ) * select( 0.0, 0.14, front ) ) * side;
	return select( select( select( fish, vec3f( 0.0 ), turtle ), stroke, isFlip ), disc, isDisc );
}

// eye colour: pupil, iris with radial streaks, dark rim
fn fishEyeCol( r: f32, ang: f32, irisC: vec3f, cloudy: f32 ) -> vec3f {
	let streak = sin( ang * 26.0 ) * 0.5 + 0.5;
	let irisL = dot( irisC, vec3f( 0.3, 0.59, 0.11 ) );
	let iris = irisC * min( 1.0, 0.36 / max( irisL, 1e-3 ) ) * mix( 0.6, 1.05, streak ) * ( smoothstep( 0.55, 0.72, r ) * 0.45 + 0.5 );
	let ring = smoothstep( 0.8, 0.97, r );
	var e = mix( iris, vec3f( 0.025, 0.025, 0.028 ), ring );
	e = mix( e, vec3f( 0.004, 0.005, 0.007 ), 1.0 - smoothstep( 0.5, 0.56, r ) );
	// cloudy eyes of fish out of the water for a while
	e = mix( e, vec3f( 0.42, 0.44, 0.46 ), cloudy * 0.55 * ( 1.0 - smoothstep( 0.7, 1.0, r ) ) );
	return e;
}
`}),lt)}var dt={vFishLocal:`vec3f`,vFishData:`vec4f`,vFishInfo:`vec4f`,vFishFlags:`vec4f`,vFishFade:`vec2f`};function ft(e,t){let n;n=t?`let fe = ${e.fadeEntry()};\n\tlet ri = fe.index;\n\to.vFishFade = vec2f( fe.fade, fe.outgoing );`:`let ri = ${e.recordIndex()};\n\to.vFishFade = vec2f( 1.0, 0.0 );`;let r=e.record(`ri`);return`
	${n}
	let r0 = ${r[0]}; let q = ${r[1]}; let r2 = ${r[2]}; let r3 = ${r[3]};`}function pt(e,t){return`
	${ft(e,t)}
	let d = v.aData;
	let u = d.x;
	var p = v.position;
	o.vFishLocal = p;
	o.vFishData = d;
	o.vFishInfo = vec4f( floor( r2.w ), fract( r2.w ), r0.w, 0.0 );
	o.vFishFlags = vec4f( 0.0 );
	let pattern = floor( r2.w );
	let env = ( u * u * 0.85 + 0.08 ) * ( smoothstep( 0.0, 0.25, u ) * 0.7 + 0.3 );
	let bend = r2.z * ( u * u );
	let eagle = pattern == ${U(`eagleRay`)};
	let off = fishSwimOffset( r2.x, d, p, env, r2.y, bend, eagle );
	p += off;
	// the fish's own motion since the last frame (position change + swimming wave): motion vectors
	let delta = fishRotateQ( q, off - fishSwimOffset( r2.x - r3.w, d, v.position, env, r2.y, bend, eagle ) ) * r0.w + r3.xyz;
	v.useWorld = true;
	v.worldNormal = fishRotateQ( q, v.normal );
	v.worldPos = fishRotateQ( q, p * r0.w ) + r0.xyz;
	v.prevWorldPos = v.worldPos - delta;`}function mt(e,t){return`
	${ft(e,t)}
	let d = v.aData;
	let pattern = floor( r2.x );
	var p = v.position;
	var n = v.normal;
	o.vFishLocal = p;
	o.vFishData = d;
	o.vFishInfo = vec4f( pattern, fract( r2.x ), r0.w, 0.0 );
	o.vFishFlags = r3;

	// lower jaw: rotates down about the hinge at the corner of the mouth
	let hinge = fishRow( pattern, 7 ).zw;
	let a = r2.w * fishJawOf( d );
	let ca = cos( a ); let sa = sin( a );
	let dy = p.y - hinge.y; let dz = p.z - hinge.x;
	p.y = hinge.y + dy * ca - dz * sa;
	p.z = hinge.x + dy * sa + dz * ca;
	let ny = n.y * ca - n.z * sa; let nz = n.y * sa + n.z * ca;
	n.y = ny;
	n.z = nz;

	// body bent along circular arcs about its middle: sideways (curl), then up / down (sag)
	let k1 = r2.y + select( -1e-4, 1e-4, r2.y >= 0.0 );
	let t1 = k1 * p.z;
	let c1 = cos( t1 ); let s1 = sin( t1 ); let h1 = sin( t1 * 0.5 );
	let x1 = h1 * h1 * 2.0 / k1 + p.x * c1;
	let z1 = s1 / k1 - p.x * s1;
	let nx1 = n.x * c1 + n.z * s1; let nz1 = n.z * c1 - n.x * s1;
	let k2 = r2.z + select( -1e-4, 1e-4, r2.z >= 0.0 );
	let t2 = k2 * z1;
	let c2 = cos( t2 ); let s2 = sin( t2 ); let h2 = sin( t2 * 0.5 );
	let y2 = h2 * h2 * 2.0 / k2 + p.y * c2;
	let z2 = s2 / k2 - p.y * s2;
	let ny2 = n.y * c2 + nz1 * s2; let nz2 = nz1 * c2 - n.y * s2;
	v.useWorld = true;
	v.worldNormal = fishRotateQ( q, vec3f( nx1, ny2, nz2 ) );
	v.worldPos = fishRotateQ( q, vec3f( x1, y2, z2 ) * r0.w ) + r0.xyz;
	v.prevWorldPos = v.worldPos;`}var ht=`
	if ( ! lodFadeVisible( in.pixel, in.vs.vFishFade.x, in.vs.vFishFade.y > 0.5 ) ) { discard; }`,gt=`
	let D = in.vs.vFishData; let Lp = in.vs.vFishLocal; let I = in.vs.vFishInfo;
	let pattern = floor( I.x + 0.5 );
	let part = fishPartOf( D );
	let scaleSize = fishRow( pattern, 4 ).w; let scaleVis = fishRow( pattern, 5 ).w;
	// scale rows: posterior margins are arcs, rows offset by half a scale
	let ss = max( scaleSize, 0.004 );
	// gentle waviness of the scale rows (in scale units: big scales stay in orderly rows)
	let warp = ( sin( Lp.z * 23.0 + D.z * 31.0 ) * 0.35 + sin( Lp.z * 41.0 - D.z * 17.0 ) * 0.25 ) * mix( 1.0, 0.3, smoothstep( 0.015, 0.045, scaleSize ) );
	let sa = ( 0.5 - Lp.z ) / ss + warp; let sb = D.z / ( ss * 0.8 ) + warp * 0.6;
	let rowI = floor( sb );
	let fb = fract( sb ) * 2.0 - 1.0;
	let sf = fract( sa + rowI * 0.5 + fb * fb * 0.32 );
	// pixel footprint (m) against the scale size (m): fade out sub-pixel detail
	let Pv = ( frame.view * vec4f( in.P, 1.0 ) ).xyz;
	let px = length( fwidth( Pv ) );
	let sfade = ( 1.0 - smoothstep( 0.25, 0.7, px / ( ss * I.z ) ) ) * select( 0.0, 1.0, scaleSize > 0.001 );

	// ---- relief
	var bumpH = 0.0;
	{
		let isBody = part == ${W(`BODY`)};
		let L = I.z;
		// scales: each rises toward its free posterior margin
		let sc = smoothstep( 0.0, 0.9, sf ) * ( 1.0 - smoothstep( 0.9, 1.0, sf ) ) * sfade * scaleVis;
		// gill cover: raised in front of its edge
		let eyeOp = fishRow( pattern, 6 );
		let h = D.w;
		let zE = fishOpercleEdge( eyeOp.w, h );
		let onOp = fishOpercleMask( h );
		let op = smoothstep( -0.004, 0.004, Lp.z - zE ) * onOp;
		let grainFade = 1.0 - smoothstep( 0.3, 0.8, px / ( 0.004 * I.z ) );
		let grain = ( fishVnoise( vec2f( Lp.z, D.z ) * 420.0 ) - 0.5 ) * 0.00022 * grainFade;
		let bodyH = sc * 0.0016 + op * 0.0025 + grain;
		// fin rays: ridges
		let isFin = part > 0.5 && part < 7.5;
		let rd = abs( fract( D.w + 0.5 ) - 0.5 );
		let ray = ( 1.0 - smoothstep( 0.0, 0.25, rd ) ) * 0.0004;
		bumpH = select( select( 0.0, ray, isFin ), bodyH, isBody ) * L;
	}
	let dhdx = dpdx( bumpH ); let dhdy = dpdy( bumpH );`;function _t(e,t){return`
	${gt}
	${t?ht:``}
	var rough = 0.4;
	var metal = 0.0;
	var transl = 0.0;
	var coat = 0.0;
	var spec = 0.5;
	let seed = I.y; let L = I.z;
	let pat = pattern;
	let P = part;
	let u = D.x; let h = D.w; let sd = D.z;
	let z = Lp.z; let y = Lp.y;
	let t = D.z; let w = D.w; // fins: along / across the rays
	let isBody = P == ${W(`BODY`)};
	let isFin = P > 0.5 && P < 7.5;
	let bodyK = select( 0.0, 1.0, isBody );
	let r0 = fishRow( pat, 0 ); let r1 = fishRow( pat, 1 ); let r2 = fishRow( pat, 2 ); let r3 = fishRow( pat, 3 );
	let r4 = fishRow( pat, 4 ); let r5 = fishRow( pat, 5 ); let r6 = fishRow( pat, 6 ); let r7 = fishRow( pat, 7 );
	let back = r0.xyz; let flank = r1.xyz; let belly = r2.xyz;
	let finC = r3.xyz; let edgeC = r4.xyz; let irisC = r5.xyz;
	let eye = r6; let lat = r7;
	let flags = in.vs.vFishFlags;
	let n1 = fishVnoise( vec2f( z, y ) * 38.0 + seed * 17.0 );
	let n2 = fishVnoise( vec2f( z, sd ) * 11.0 + seed * 5.0 );
	let fwW = fwidth( w ); let fwH = fwidth( h );

	// ---- counter-shading
	let tBack = smoothstep( 0.2, 0.75, h );
	let tBelly = 1.0 - smoothstep( -0.7, -0.1, h );
	var c = mix( mix( flank, back, tBack ), belly, tBelly );
	let silver = 1.0 - tBack * 0.75; // guanine reflection weight
	metal = r0.w * silver * bodyK;
	rough = r2.w;
	// scales: a thin shadow line under each free margin, the exposed field slightly brighter
	// toward the margin
	let scaleShade = smoothstep( 0.3, 0.9, sf ) * sfade * scaleVis;
	let pocket = smoothstep( 0.88, 0.97, sf ) * ( 1.0 - smoothstep( 0.97, 1.0, sf ) ) * sfade * scaleVis;
	let cellK = ( fishHash( vec2f( floor( sa + floor( sb ) * 0.5 ), floor( sb ) ) ) - 0.5 ) * 0.1 * sfade * scaleVis;
	// (on silvery skin the pocket is a thin line: the mirror-like scale reflects its own light)
	c *= mix( 1.0, 0.96 + scaleShade * 0.07 - pocket * mix( 0.14, 0.06, r0.w ) + cellK, bodyK );
	c *= mix( 1.0, n1 * 0.14 + 0.93, bodyK );
	c *= mix( 1.0, n2 * 0.2 + 0.9, bodyK );
	rough = mix( rough, rough * mix( 0.8, 1.25, n2 ), bodyK );

	// ---- fins: ray-striped membranes, darker and thinner toward the edge
	if ( isFin && P != ${W(`FINLET`)} ) {
		var fin = mix( finC, edgeC, smoothstep( 0.4, 1.0, t ) );
		let rd = abs( fract( w + 0.5 ) - 0.5 );
		let rayW = select( 0.06, 0.1, P == ${W(`DORSAL1`)} );
		let ray = ( 1.0 - smoothstep( rayW, fwW * 1.2 + rayW + 0.04, rd ) ) * ( 1.0 - smoothstep( 0.2, 0.6, fwW ) );
		fin *= mix( 0.9, 1.06, ray );
		// thicker and darker where the fin joins the body, thinnest at the edge
		fin *= smoothstep( 0.0, 0.15, t ) * 0.2 + 0.8;
		c = fin;
		transl = mix( 0.8, 0.55, ray ) * ( smoothstep( 0.0, 0.3, t ) * 0.4 + 0.6 );
		// paired fins: the fin colour, a little lighter toward the edge (thin membrane)
		let paired = P == ${W(`PECTORAL`)} || P == ${W(`PELVIC`)};
		c = select( c, c * mix( 0.85, 1.1, smoothstep( 0.2, 1.0, t ) ), paired );
		transl *= select( 1.0, 0.45, paired );
		rough = 0.4;
	}

	// ---- species markings (body; some on fins)
	if ( pat == ${U(`silverside`)} ) {
		// silver lateral band with a dark upper edge; translucent green back
		let bandK = fishBand( h, 0.02, 0.1, fwH + 0.05 ) * bodyK;
		c = mix( c, vec3f( 0.78, 0.82, 0.84 ), bandK * 0.8 );
		c = mix( c, vec3f( 0.12, 0.2, 0.2 ), fishBand( h, 0.14, 0.015, fwH + 0.02 ) * bodyK * 0.6 );
		metal += bandK * 0.25;
	} else if ( pat == ${U(`chromis`)} ) {
		// dark margins on the tail lobes, azure line from the snout through the eye
		let lobe = select( 0.0, smoothstep( 5.5, 7.5, abs( w - 8.0 ) ), P == ${W(`CAUDAL`)} );
		c = mix( c, vec3f( 0.01, 0.015, 0.03 ), lobe );
		let lineK = fishBand( y - ( z - eye.x ) * 0.35, eye.y + 0.015, 0.004, 0.003 ) * smoothstep( eye.x - 0.02, eye.x + 0.05, z ) * bodyK;
		c = mix( c, vec3f( 0.3, 0.6, 0.95 ), lineK * 0.7 );
	} else if ( pat == ${U(`grunt`)} ) {
		// French grunt: yellow with oblique blue-silver stripes (straight above the lateral
		// line); bluestriped grunt: straight blue stripes. Red mouth.
		let blue = fract( seed * 3.7 ) < 0.4;
		let above = smoothstep( 0.35, 0.45, h );
		let slope = select( mix( 0.45, 0.0, above ), 0.0, blue );
		let sv = sin( ( y - z * slope ) * select( 150.0, 190.0, blue ) );
		let stripe = smoothstep( 0.45, 0.8, sv ) * bodyK * ( 1.0 - tBelly * 0.7 );
		let lineC = select( vec3f( 0.52, 0.6, 0.7 ), vec3f( 0.12, 0.26, 0.55 ), blue );
		c = mix( c, lineC, stripe * select( 0.7, 0.9, blue ) );
	} else if ( pat == ${U(`yellowtail`)} ) {
		// yellow stripe from the snout widening into the yellow tail; yellow spots on the back
		let wS = mix( 0.006, 0.035, smoothstep( 0.1, -0.25, z ) );
		let stripe = fishBand( y - 0.004, 0.0, wS, 0.004 ) * bodyK;
		let qq = vec2f( z, y ) * 70.0;
		let cell = floor( qq );
		let j = ( vec2f( fishHash( cell + 3.1 ), fishHash( cell + 7.7 ) ) - 0.5 ) * 0.5;
		let rr = fishHash( cell + 1.3 ) * 0.14 + 0.1;
		let spots = ( 1.0 - smoothstep( rr, rr + 0.12, length( fract( qq ) - 0.5 - j ) ) ) * step( 0.4, fishHash( cell + seed ) ) * tBack * bodyK;
		c = mix( c, vec3f( 0.85, 0.62, 0.05 ), max( stripe, spots * 0.8 ) );
		c = mix( c, vec3f( 0.86, 0.66, 0.06 ), select( 0.0, 1.0, P == ${W(`CAUDAL`)} ) );
	} else if ( pat == ${U(`tang`)} ) {
		// fine dark wavy lines, pale scalpel at the tail base
		let lines = smoothstep( 0.75, 0.95, sin( y * 170.0 + z * 30.0 + n1 * 3.0 ) ) * 0.3 * bodyK;
		c *= 1.0 - lines;
		let spine = ( 1.0 - smoothstep( 0.01, 0.02, length( vec2f( z + 0.27, y * 1.5 ) ) ) ) * bodyK;
		c = mix( c, vec3f( 0.85, 0.8, 0.55 ), spine );
		c = mix( c, edgeC, select( 0.0, smoothstep( 0.8, 1.0, t ), isFin ) );
	} else if ( pat == ${U(`sergeant`)} ) {
		// five black bars from behind the head to the tail stalk (a faint sixth on the peduncle), a dark
		// spot at the base of the pectoral fin
		let barsP = smoothstep( 0.45, 0.7, sin( ( z - 0.215 ) * 52.0 + 1.57 ) ) * smoothstep( -0.29, -0.24, z ) * ( 1.0 - smoothstep( 0.225, 0.26, z ) );
		let sixth = fishBand( z, -0.33, 0.012, 0.01 ) * 0.4;
		let bars = max( barsP, sixth ) * ( 1.0 - tBelly * 0.8 );
		c = mix( c, vec3f( 0.02, 0.02, 0.03 ), bars * select( select( 0.0, 0.4, isFin ), 0.92, isBody ) );
		let pecSpot = ( 1.0 - smoothstep( 0.012, 0.02, length( vec2f( z - eye.w + 0.03, y + 0.005 ) ) ) ) * bodyK;
		c = mix( c, vec3f( 0.03, 0.035, 0.05 ), pecSpot * 0.8 );
	} else if ( pat == ${U(`wrasse`)} ) {
		// bluehead wrasse: yellow initial phase with a dark midlateral stripe; blue-headed males
		let male = fract( seed * 7.1 ) < 0.15;
		let stripe = fishBand( h, 0.05, 0.1, fwH + 0.04 ) * bodyK * smoothstep( 0.25, 0.1, z );
		let female = mix( c, vec3f( 0.04, 0.04, 0.03 ), stripe * 0.9 );
		let head = smoothstep( 0.12, 0.17, z );
		let collar = fishBand( z, 0.13, 0.012, 0.006 );
		let maleC = mix( mix( vec3f( 0.1, 0.42, 0.28 ), vec3f( 0.05, 0.14, 0.62 ), head ), vec3f( 0.02, 0.02, 0.02 ), collar * bodyK );
		c = select( female, maleC, male );
	} else if ( pat == ${U(`parrot`)} ) {
		// stoplight (terminal phase: green, pink / orange marks, yellow spot on the gill cover)
		// or queen parrotfish (blue-green, orange-pink marks around the mouth)
		let queen = fract( seed * 4.3 ) < 0.4;
		let base = select( vec3f( 0.1, 0.42, 0.26 ), vec3f( 0.06, 0.34, 0.42 ), queen );
		c = mix( c, base * mix( 0.8, 1.1, scaleShade ), bodyK * 0.75 );
		let mark = fishBand( y - ( z - 0.3 ) * 0.4, -0.03, 0.008, 0.008 ) * smoothstep( 0.18, 0.35, z ) * bodyK;
		c = mix( c, select( vec3f( 0.85, 0.45, 0.32 ), vec3f( 0.75, 0.42, 0.28 ), queen ), mark );
		let spot = ( 1.0 - smoothstep( 0.01, 0.02, length( vec2f( z - eye.w - 0.02, y - 0.05 ) ) ) ) * bodyK;
		c = mix( c, vec3f( 0.88, 0.72, 0.12 ), spot * select( 1.0, 0.0, queen ) );
	} else if ( pat == ${U(`angel`)} ) {
		// French angelfish: black, yellow rims on the scales, yellow face and eye ring
		let rims = smoothstep( 0.72, 0.95, sf ) * max( sfade, 0.35 ) * bodyK;
		c = mix( c, vec3f( 0.62, 0.48, 0.06 ), rims * 0.6 );
		let face = smoothstep( 0.4, 0.43, z ) * bodyK;
		c = mix( c, vec3f( 0.55, 0.45, 0.2 ), face * 0.6 );
		let er0 = length( vec2f( z - eye.x, y - eye.y ) ) / eye.z;
		let ringA = smoothstep( 1.05, 1.2, er0 ) * ( 1.0 - smoothstep( 1.45, 1.65, er0 ) ) * bodyK;
		c = mix( c, vec3f( 0.7, 0.52, 0.06 ), ringA * 0.85 );
	} else if ( pat == ${U(`barracuda`)} ) {
		// dark oblique bars on the upper flank, black blotches on the lower rear flank
		let bars = smoothstep( 0.35, 0.8, sin( z * 58.0 + h * 1.5 + n1 ) ) * smoothstep( 0.2, 0.55, h ) * bodyK;
		c *= 1.0 - bars * 0.45;
		let bl = smoothstep( 0.6, 0.78, n2 ) * smoothstep( 0.1, -0.25, z ) * ( 1.0 - smoothstep( -0.3, 0.2, h ) ) * bodyK;
		c = mix( c, vec3f( 0.03, 0.03, 0.035 ), bl * 0.9 );
		c = mix( c, vec3f( 0.75, 0.78, 0.8 ), select( 0.0, smoothstep( 0.85, 1.0, t ) * smoothstep( 5.0, 7.0, abs( w - 8.0 ) ), P == ${W(`CAUDAL`)} ) );
	} else if ( pat == ${U(`redSnapper`)} ) {
		// rose red back fading to a silvery pink belly; rows of scales show as fine oblique lines
		let rows = smoothstep( 0.6, 0.95, sin( y * 210.0 + z * 120.0 ) ) * max( sfade, 0.3 ) * bodyK * 0.15;
		c *= 1.0 - rows;
	} else if ( pat == ${U(`grouper`)} ) {
		// Nassau grouper: dark brown bars, a band from the snout through the eye, a black saddle
		// on the tail stalk, dark spots around the eye
		let zz = 0.5 - z;
		let wob = ( n2 - 0.5 ) * 0.03;
		let bars = smoothstep( 0.2, 0.6, sin( ( zz + wob ) * 34.0 - 1.2 ) ) * smoothstep( 0.3, 0.38, zz ) * smoothstep( 0.86, 0.78, zz ) * ( 1.0 - tBelly * 0.85 );
		let stripe = fishBand( y - eye.y - ( z - eye.x ) * 0.25, 0.0, 0.008, 0.006 ) * smoothstep( eye.x - 0.08, eye.x, z ) * smoothstep( 0.5, 0.45, z );
		let saddle = smoothstep( 0.4, 0.7, h ) * fishBand( zz, 0.8, 0.025, 0.01 );
		let spots = smoothstep( 0.72, 0.85, fishVnoise( vec2f( z, y ) * 160.0 + seed * 3.0 ) ) * smoothstep( eye.x - 0.12, eye.x, z );
		let dark = max( max( bars * 0.85, stripe * 0.85 ), max( saddle, spots * 0.7 ) ) * bodyK;
		c = mix( c, vec3f( 0.13, 0.085, 0.05 ), dark );
		let pale = smoothstep( 0.86, 0.93, fishVnoise( vec2f( z, y ) * 150.0 + 9.0 ) ) * bodyK * 0.2;
		c = mix( c, vec3f( 0.85, 0.8, 0.72 ), pale );
	} else if ( pat == ${U(`tuna`)} ) {
		// blackfin tuna: sharp dark back, bronze band, pale bars on the belly, dusky yellow finlets
		let bronze = fishBand( h, 0.28, 0.05, fwH + 0.06 ) * smoothstep( 0.3, 0.2, z ) * bodyK;
		c = mix( c, vec3f( 0.42, 0.34, 0.14 ), bronze * 0.6 );
		c = mix( c, back, smoothstep( 0.28, 0.4, h ) * bodyK );
		let bars = smoothstep( 0.6, 0.9, sin( z * 95.0 ) ) * smoothstep( 0.0, -0.3, h ) * smoothstep( 0.2, 0.1, z ) * bodyK;
		c = mix( c, vec3f( 0.85, 0.88, 0.9 ), bars * 0.35 );
		c = mix( c, vec3f( 0.55, 0.48, 0.16 ), select( 0.0, 0.85, P == ${W(`FINLET`)} ) );
	} else if ( pat == ${U(`mahi`)} ) {
		// mahi-mahi: blue-green back, golden flanks with scattered blue spots
		let cell = floor( vec2f( z, y ) * 55.0 );
		let jit = vec2f( fishHash( cell + 3.1 ), fishHash( cell + 7.7 ) ) - 0.5;
		let fc = fract( vec2f( z, y ) * 55.0 ) - 0.5 - jit * 0.55;
		let rs = mix( 0.1, 0.24, fishHash( cell + 1.3 ) );
		let spots = ( 1.0 - smoothstep( rs, rs + 0.1, length( fc * vec2f( 1.0, 1.25 ) ) ) ) * step( 0.45, fishHash( cell + seed * 7.0 ) ) * bodyK * ( 1.0 - tBelly );
		c = mix( c, vec3f( 0.08, 0.22, 0.5 ), spots * 0.75 );
		c = mix( c, vec3f( 0.2, 0.5, 0.3 ), smoothstep( 0.0, 0.5, h ) * bodyK * 0.35 );
	} else if ( pat == ${U(`mullet`)} ) {
		// faint dark stripes along the scale rows of the upper flank
		let lines = smoothstep( 0.7, 0.95, sin( sd * 280.0 ) ) * smoothstep( -0.1, 0.3, h ) * bodyK * 0.25;
		c *= 1.0 - lines;
	} else if ( pat == ${U(`needlefish`)} ) {
		// dark blue lateral stripe, dark beak
		let stripe = fishBand( h, 0.0, 0.06, fwH + 0.05 ) * bodyK;
		c = mix( c, vec3f( 0.12, 0.25, 0.45 ), stripe * 0.6 );
		c = mix( c, vec3f( 0.12, 0.16, 0.16 ), smoothstep( 0.32, 0.36, z ) * bodyK * 0.7 );
	} else if ( pat == ${U(`jack`)} ) {
		// bar jack: black stripe along the base of the dorsal fin into the lower tail lobe,
		// electric blue below it
		let top = fishBand( h, 0.82, 0.06, fwH + 0.05 ) * smoothstep( 0.2, 0.05, z ) * bodyK;
		let blue = fishBand( h, 0.68, 0.05, fwH + 0.05 ) * smoothstep( 0.2, 0.05, z ) * bodyK;
		c = mix( c, vec3f( 0.15, 0.45, 0.9 ), blue * 0.5 );
		c = mix( c, vec3f( 0.02, 0.03, 0.05 ), top * 0.85 );
		let lobe = select( 0.0, smoothstep( 7.5, 5.5, w ) * smoothstep( 0.1, 0.3, t ), P == ${W(`CAUDAL`)} );
		c = mix( c, vec3f( 0.02, 0.03, 0.05 ), lobe * 0.8 );
	} else if ( pat == ${U(`tarpon`)} ) {
		// huge scales with dark edges
		let rims = smoothstep( 0.8, 0.97, sf ) * sfade * bodyK;
		c *= 1.0 - rims * 0.35;
	}

	// ---- lateral line (a row of pores along a dark line)
	let hl = lat.x + lat.y * ( 1.0 - smoothstep( 0.12, 0.55, u ) );
	let lineK = fishBand( h, hl, fwH * 0.5 + 0.012, fwH + 0.008 ) * bodyK * smoothstep( 0.18, 0.25, u ) * smoothstep( 0.9, 0.8, u );
	c *= 1.0 - lineK * 0.3;

	// ---- gill cover edge and the preopercle (dark creases); gills show red on dead fish
	let zE = fishOpercleEdge( eye.w, h );
	let dOp = z - zE;
	let onOp = fishOpercleMask( h ) * bodyK;
	let crease = ( 1.0 - smoothstep( 0.0015, 0.004, abs( dOp ) ) ) * onOp;
	c *= 1.0 - crease * 0.45;
	let pre = ( 1.0 - smoothstep( 0.001, 0.003, abs( dOp - 0.04 ) ) ) * onOp * smoothstep( 0.6, 0.2, h );
	c *= 1.0 - pre * 0.2;
	let gill = smoothstep( 0.0, -0.0015, dOp ) * smoothstep( -0.007, -0.003, dOp ) * onOp * smoothstep( 0.0, -0.5, h ) * flags.w;
	c = mix( c, vec3f( 0.3, 0.03, 0.035 ), gill * 0.8 );

	// ---- lips (the mouth line from the snout to the corner), the edge of the upper jaw bone
	// and the nostrils
	let hz = lat.z; let hy = lat.w; let tipY = r3.w;
	let mt = clamp( ( z - hz ) / ( 0.5 - hz ), 0.0, 1.0 );
	let yLip = mix( hy, tipY, mt );
	let lips = ( 1.0 - smoothstep( 0.0015, 0.0035, abs( y - yLip ) ) ) * step( hz - 0.004, z ) * bodyK;
	c *= 1.0 - lips * 0.55;
	let maxZ = hz + 0.006 - ( y - hy ) * 0.35;
	let maxilla = ( 1.0 - smoothstep( 0.001, 0.0025, abs( z - maxZ ) ) ) * smoothstep( hy - 0.002, hy + 0.002, y ) * smoothstep( hy + 0.04, hy + 0.025, y ) * bodyK;
	c *= 1.0 - maxilla * 0.3;
	let nostril = ( 1.0 - smoothstep( 0.1, 0.2, length( vec2f( z - eye.x - eye.z * 1.7, y - eye.y - eye.z * 0.25 ) ) / eye.z ) ) * bodyK;
	c *= 1.0 - nostril * 0.6;

	// ---- painted eye (under the dome where there is one)
	let er = length( vec2f( z - eye.x, y - eye.y ) ) / eye.z;
	let painted = ( 1.0 - smoothstep( 0.95, 1.1, er ) ) * bodyK;
	c = mix( c, fishEyeCol( er, atan2( y - eye.y, z - eye.x ), irisC, flags.x ), painted );
	metal *= 1.0 - painted;

	// ---- eye dome: pupil, iris, glossy cornea
	if ( P == ${W(`EYE`)} ) {
		let r = length( vec2f( t, w ) );
		c = fishEyeCol( r, atan2( w, t ), irisC, flags.x );
		c = mix( c, flank * 0.6, smoothstep( 0.93, 1.0, r ) );
		rough = mix( 0.04, 0.3, flags.x );
		spec = 1.0;
		metal = 0.0;
	} else if ( P == ${W(`MOUTH`)} ) {
		// inside of the mouth: pale pink lips to a dark throat (grunts are red inside)
		let lip = select( vec3f( 0.5, 0.3, 0.3 ), vec3f( 0.6, 0.08, 0.06 ), pat == ${U(`grunt`)} );
		c = mix( lip, vec3f( 0.03, 0.012, 0.012 ), smoothstep( 0.05, 0.85, t ) );
		metal = 0.0;
		rough = 0.35;
	} else if ( P == ${W(`FLESH`)} ) {
		// cut face: muscle rings around the backbone, bone and blood at the centre
		let r = length( vec2f( t, w * 1.2 ) );
		let dark = select( 0.0, 1.0, pat == ${U(`tuna`)} );
		let meat = mix( vec3f( 0.62, 0.36, 0.32 ), vec3f( 0.3, 0.035, 0.035 ), dark );
		let rings = smoothstep( 0.6, 0.95, sin( r * 520.0 + atan2( w, abs( t ) ) * 2.0 ) ) * 0.12;
		var m = meat * ( 1.0 - rings );
		let bone = 1.0 - smoothstep( 0.006, 0.009, length( vec2f( t, w - 0.004 ) ) );
		m = mix( m, vec3f( 0.75, 0.68, 0.58 ), bone );
		m = mix( m, vec3f( 0.3, 0.02, 0.02 ), ( 1.0 - smoothstep( 0.01, 0.03, r ) ) * 0.5 * ( 1.0 - bone ) );
		// skin rim
		c = m;
		metal = 0.0;
		rough = 0.3;
		transl = 0.3;
	} else if ( P == ${W(`FILLET`)} ) {
		// salted, sun dried flesh: pale and translucent at the thin edges, muscle chevrons,
		// salt crystals
		let ax = abs( t );
		let chev = smoothstep( 0.55, 0.9, sin( ( w + ax * 0.35 ) * 160.0 ) ) * 0.1;
		var m = mix( vec3f( 0.36, 0.26, 0.13 ), vec3f( 0.52, 0.42, 0.26 ), smoothstep( 0.35, 1.0, ax ) ) * ( 1.0 - chev );
		let salt = step( 0.94, fishHash( floor( vec2f( t, w ) * 900.0 ) ) );
		m = mix( m, vec3f( 0.8, 0.8, 0.78 ), salt * 0.6 );
		m *= mix( 0.9, 1.05, n1 );
		c = m;
		metal = 0.0;
		rough = 0.6;
		transl = mix( 0.25, 0.8, smoothstep( 0.5, 1.0, ax ) );
	} else if ( P == ${W(`ICE`)} ) {
		// glassy crushed ice: dim albedo (light passes into it), sharp glints
		c = vec3f( 0.3, 0.4, 0.46 ) * mix( 0.8, 1.15, fract( t * 7.3 ) );
		rough = mix( 0.04, 0.2, fract( w * 5.1 ) );
		metal = 0.0;
		transl = 0.9;
		spec = 1.0;
	} else if ( P == ${W(`LEAF`)} ) {
		// banana leaf: glossy green, pale midrib, fine parallel veins
		let ax = abs( t );
		let veins = smoothstep( 0.6, 0.95, sin( w * 420.0 + ax * 60.0 ) ) * 0.12;
		var lc = mix( vec3f( 0.025, 0.08, 0.015 ), vec3f( 0.05, 0.13, 0.025 ), n2 ) * ( 1.0 - veins );
		lc = mix( lc, vec3f( 0.25, 0.3, 0.1 ), 1.0 - smoothstep( 0.015, 0.03, ax ) );
		lc = mix( lc, vec3f( 0.25, 0.22, 0.08 ), smoothstep( 0.9, 1.0, ax ) * 0.6 );
		c = lc;
		metal = 0.0;
		rough = 0.28;
		transl = 0.25;
	} else if ( P == ${W(`DISC`)} || P == ${W(`WHIP`)} ) {
		// rays: sandy, finely mottled back (stingray) or black with white rings (eagle ray);
		// white belly
		let top = w > 0.0;
		let eagleK = select( 0.0, 1.0, pat == ${U(`eagleRay`)} );
		let qq = vec2f( Lp.x, Lp.z ) * 20.0;
		let cell = floor( qq );
		let jit = ( vec2f( fishHash( cell + 1.7 ), fishHash( cell + 5.3 ) ) - 0.5 ) * 0.4;
		let rad = fishHash( cell + 9.1 ) * 0.14 + 0.12;
		let ring = abs( length( fract( qq ) - 0.5 - jit ) - rad );
		let spots = ( 1.0 - smoothstep( 0.035, 0.075, ring ) ) * step( 0.45, fishHash( cell ) );
		let mottle = fishVnoise( vec2f( Lp.x, Lp.z ) * 60.0 ) * 0.25 + n2 * 0.2 + 0.7;
		var dorsal = mix( back * mottle, mix( back, vec3f( 0.75, 0.78, 0.8 ), spots * 0.85 ), eagleK );
		dorsal = mix( dorsal, edgeC, smoothstep( 0.8, 1.0, t ) * 0.4 * ( 1.0 - eagleK ) );
		c = select( belly, dorsal, top );
		c = select( c, finC, P == ${W(`WHIP`)} );
		metal = 0.0;
		rough = r2.w;
	} else if ( P == ${W(`CARAPACE`)} ) {
		// green turtle shell: scutes (vertebral row, costals, marginals) with dark seams and
		// radiating olive / brown / amber streaks
		let X = t; let Y = w;
		let ax = abs( X );
		let rr = length( vec2f( X, Y ) );
		let vert = ax < 0.3;
		let ySeams = select( vec4f( -0.42, -0.02, 0.36, 2.0 ), vec4f( -0.58, -0.22, 0.14, 0.5 ), vert );
		let yc = Y + ax * ax * 0.25;
		let dY = min( min( abs( yc - ySeams.x ), abs( yc - ySeams.y ) ), min( abs( yc - ySeams.z ), abs( yc - ySeams.w ) ) );
		let dX = abs( ax - 0.3 );
		let marg = rr > 0.84;
		let angle = atan2( Y, X );
		let dM = min( abs( rr - 0.84 ), abs( fract( angle * ${ct(12/Math.PI)} ) - 0.5 ) * 0.25 );
		let seam = min( select( min( dY, dX ), dM, marg ), abs( rr - 0.84 ) );
		let streak = sin( atan2( yc - ( floor( yc * 2.8 ) + 0.5 ) / 2.8, X - sign( X ) * 0.55 ) * 11.0 + n2 * 6.0 ) * 0.5 + 0.5;
		let blotch = smoothstep( 0.45, 0.8, fishVnoise( vec2f( X, Y ) * 9.0 ) );
		var shell = mix( back, flank, streak * 0.55 + blotch * 0.45 );
		shell = mix( shell, vec3f( 0.2, 0.14, 0.06 ), smoothstep( 0.6, 0.9, n1 ) * 0.4 );
		shell *= mix( 0.45, 1.0, smoothstep( 0.003, 0.012, seam ) );
		c = shell;
		metal = 0.0;
		rough = 0.35;
	} else if ( P == ${W(`SKIN`)} || P == ${W(`FLIPPER`)} ) {
		// scaly grey-brown skin with pale scale margins; pale yellow plastron
		let qq = vec2f( Lp.x + Lp.y, Lp.z ) * 55.0;
		let rowS = floor( qq.y );
		let q2 = qq + vec2f( rowS * 0.5, 0.0 );
		let ff = fract( q2 ) - 0.5;
		let scale = smoothstep( 0.32, 0.47, max( abs( ff.x ), abs( ff.y ) ) );
		let tone = fishHash( floor( q2 ) ) * 0.35 + 0.8;
		let skin = mix( finC * tone, edgeC, scale * 0.45 );
		c = select( skin, belly * mix( 0.85, 1.05, n1 ), w > 1.5 && P == ${W(`SKIN`)} );
		metal = 0.0;
		rough = 0.5;
	} else if ( P == ${W(`SHELL`)} ) {
		// spiny lobster: red-brown carapace with cream spots, banded legs
		let sp = vec2f( t, w ) * 12.0;
		let spots = ( 1.0 - smoothstep( 0.18, 0.3, length( fract( sp ) - 0.5 ) ) ) * step( 0.6, fishHash( floor( sp ) ) );
		var sh = mix( vec3f( 0.16, 0.045, 0.03 ), vec3f( 0.32, 0.1, 0.04 ), n1 );
		sh = mix( sh, vec3f( 0.7, 0.55, 0.22 ), spots * 0.85 );
		c = sh;
		metal = 0.0;
		rough = 0.35;
	}
${e?`
	// ---- props: dull, drying skin; wet sheen; salted skin
	c = mix( c, vec3f( luminance( c ) ), flags.z * 0.55 * bodyK );
	c *= mix( 1.0, 0.85, flags.z * bodyK );
	metal *= 1.0 - flags.z;
	rough = mix( rough, rough * 0.55, flags.y );
	coat = flags.y * select( select( 0.0, 0.25, isFin ), 0.6, isBody );
`:``}
	// iridescent sheen on silvery skin at grazing angles
	let cosV = abs( dot( in.N, in.V ) );
	let irid = r1.w * bodyK * silver * ( 1.0 - cosV );
	let hueA = vec3f( 0.55, 0.95, 0.8 ); let hueB = vec3f( 0.95, 0.6, 1.0 );
	c = mix( c, c * mix( hueA, hueB, cosV ) * 1.25, irid * 0.6 );

	s.albedo = c;
	s.roughness = rough;
	s.metalness = metal;
	// The reference (three r186) reads specularIntensityNode (the 'fishSpec' var) before the colour
	// function assigns it, so the var reads its zero default there: the fish have no dielectric
	// specular in the reference (only metal / grazing reflections; verified headless against the
	// original: with a constant 0.5 it gains exactly the port's highlights). FISH_SPECULAR selects: 'reference' (look of the three.js app) or 'intended' (0.5,
	// 1.0 on eyes and ice, as the code was written).
	s.specularIntensity = spec;
	s.normal = perturbNormalByHeight( in.P, in.N, dhdx, dhdy, 1.0 );
	// translucencyNode: lightColor * albedo * transl * 0.5 (the engine multiplies by the light)
	s.translucency = c * ( transl * 0.5 );
${e?`	s.clearcoat = coat;
	s.clearcoatRoughness = 0.2;
`:``}`}var vt=`
	{
		let Dm = in.vs.vFishData;
		let partM = fishPartOf( Dm );
		let finM = partM > 0.5 && partM < 6.5;
		let rayM = 1.0 - smoothstep( 0.07, 0.14, abs( fract( Dm.w + 0.5 ) - 0.5 ) );
		let alphaM = select( 1.0, max( mix( 0.9, 0.55, smoothstep( 0.25, 1.0, Dm.z ) ), rayM ), finM );
		let dither = interleavedGradientNoise( in.pixel + fract( frame.time * 7.3 ) * 97.0 );
		if ( ! ( dither < alphaM ) ) { discard; }
	}`;function yt(e,t,n){return new x({name:t,roughness:.4,metalness:0,modules:[ut(),e.module],attributes:{aData:`vec4f`,aKind:`f32`},varyings:dt,...n})}function bt(e,{fade:t=!1}={}){return yt(e,t?`FishFade`:`Fish`,{vertex:pt(e,t),surface:_t(!1,t)})}function xt(e,{fade:t=!1}={}){return yt(e,t?`FishPropsFade`:`FishProps`,{vertex:mt(e,t),surface:vt+_t(!0,t),shadow:vt+`
	return true;`,defines:{CLEARCOAT:1}})}var St=90,Ct=22,wt=new t,G=new r,Tt=new n,Et=new r,Dt=new c,Ot=new o;function kt(e,t,n){let r=new f;return r.setAttribute(`position`,new p(e,3)),r.setAttribute(`aData`,new p(t,4)),r.setIndex(n),r.computeVertexNormals(),r.computeBoundingSphere(),r}function At(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function jt(e){let t=[],a=[],o=[],s=At(17),c=(e,n,r,i,o)=>(t.push(e,n,r),a.push(0,z.ICE,i,o),t.length/3-1),l=e?3:6,u=e?12:24,d=(e,t)=>.16*(1-e*e)+.025*Math.sin(t*5+e*7)*e+.02,f=c(0,d(0,0),0,.5,.5),p=[];for(let e=1;e<=l;e++){let t=e/l,n=[];for(let e=0;e<u;e++){let r=e/u*Math.PI*2;n.push(c(Math.cos(r)*t,d(t,r),Math.sin(r)*t,s(),s()))}p.push(n)}let m=[];for(let e=0;e<u;e++){let t=e/u*Math.PI*2;m.push(c(Math.cos(t)*.8,-.35,Math.sin(t)*.8,s(),s()))}p.push(m);for(let e=0;e<u;e++)o.push(f,p[0][(e+1)%u],p[0][e]);for(let e=0;e<l;e++)for(let t=0;t<u;t++){let n=p[e][t],r=p[e][(t+1)%u],i=p[e+1][(t+1)%u],a=p[e+1][t];o.push(n,r,a,r,i,a)}let h=e?50:170;for(let e=0;e<h;e++){let e=Math.sqrt(s())*.92,t=s()*Math.PI*2,a=Math.cos(t)*e,l=Math.sin(t)*e,u=d(e,t),f=.06+s()*.09,p=new n().setFromEuler(new i(s()*6,s()*6,s()*6)),m=[[1,.2,.1],[-.6,.9,.2],[-.5,-.4,.9],[.1,-.6,-.9],[.3,.8,-.5]].map(e=>new r(e[0]*(.7+s()*.6),e[1]*(.7+s()*.6),e[2]*(.7+s()*.6)).multiplyScalar(f).applyQuaternion(p)),h=[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[1,4,3],[1,3,2]],g=s(),_=s();for(let e of h){let t=m[e[0]],n=m[e[1]],i=m[e[2]],s=new r().subVectors(n,t).cross(new r().subVectors(i,t)),d=new r().add(t).add(n).add(i),f=s.dot(d)<0,p=[t,n,i].map(e=>c(a+e.x,u+e.y*.8,l+e.z,g,_));f?o.push(p[0],p[2],p[1]):o.push(p[0],p[1],p[2])}}return kt(t,a,o)}function Mt(e){let t=[],n=[],r=[],i=e?8:20,a=e?3:7,o=At(5),s=[];for(let e=0;e<6;e++)s.push([.3+o()*.6,o()<.5?-1:1]);for(let e of[!1,!0]){let o=t.length/3;for(let e=0;e<=i;e++){let r=e/i,o=.19*Math.sin(Math.PI*Math.min(1,.08+r*.95))+.012;for(let e=-a;e<=a;e++){let i=e/a,c=i*o;for(let[e,t]of s)Math.sign(i)===t&&Math.abs(i)>.45&&r>e&&(c+=t*.01*Math.abs(i));let l=Math.abs(i)*o*.25,u=i*i*.04*(1-r);t.push(c,l+u+.01*Math.sin(r*9)*i,r),n.push(r,z.LEAF,i,r)}}let c=2*a+1;for(let t=0;t<i;t++)for(let n=0;n<2*a;n++){let i=o+t*c+n,a=i+1,s=i+c+1,l=i+c;e?r.push(i,a,l,a,s,l):r.push(i,l,a,a,l,s)}}return kt(t,n,r)}function Nt(e){let t=[],n=[],i=[],a=(e,r,i,a,o)=>(t.push(e,r,i),n.push(.5-i,z.SHELL,a,o),t.length/3-1),o=e?6:12,s=(e,t)=>{let n=[];for(let[r,i,s]of e){let e=[];for(let n=0;n<=o;n++){let c=Math.PI*n/o,l=Math.cos(c)*i,u=Math.sin(c)*s;e.push(a(l,u*(u<0?t:1),r,l*3,r*3))}n.push(e)}for(let e=0;e<n.length-1;e++)for(let t=0;t<o;t++){let r=n[e][t],a=n[e][t+1],o=n[e+1][t+1],s=n[e+1][t];i.push(r,s,a,a,s,o)}for(let e=0;e<n.length-1;e++){let t=n[e][0],r=n[e][o],a=n[e+1][o],s=n[e+1][0];i.push(t,r,s,r,a,s)}};s([[.5,.03,.03],[.47,.09,.075],[.4,.125,.105],[.28,.135,.115],[.15,.125,.11],[.1,.115,.1]],.25);for(let e of[1,-1]){let t=a(e*.035,.07,.47,.5,.5),n=a(e*.075,.06,.46,.5,.5),r=a(e*.05,.03,.47,.5,.5),o=a(e*.075,.1,.55,.5,.5);i.push(t,n,o,n,r,o,r,t,o),e<0&&i.splice(i.length-9,9,t,o,n,n,o,r,r,o,t)}let c=[];for(let e=0;e<6;e++){let t=.1-e*.075,n=.115-e*.009,r=-e*e*.002;c.push([t,n,n*.8,r])}for(let[e,n,r,i]of c){let a=t.length/3;s([[e+.005,n*.95,r*.95],[e-.02,n,r],[e-.08,n*.96,r*.92]],.3);for(let e=a;e<t.length/3;e++)t[e*3+1]+=i}for(let e=-2;e<=2;e++){let t=e*.32,n=-.36,r=.13-Math.abs(e)*.012,o=a(0,-.05,n,0,0),s=a(Math.sin(t-.13)*r,-.060000000000000005,n-Math.cos(t-.13)*r,1,0),c=a(Math.sin(t+.13)*r,-.060000000000000005,n-Math.cos(t+.13)*r,1,1);i.push(o,c,s,o,s,c)}let l=(t,n,o,s)=>{let c=[],l=e?3:5;for(let e=0;e<t.length;e++){let i=t[e],u=t[Math.min(e+1,t.length-1)],d=t[Math.max(e-1,0)],f=new r(u[0]-d[0],u[1]-d[1],u[2]-d[2]).normalize(),p=new r(0,1,0).cross(f).normalize();p.lengthSq()<1e-6&&p.set(1,0,0);let m=new r().crossVectors(f,p),h=n+(o-n)*e/(t.length-1),g=[];for(let n=0;n<l;n++){let r=n/l*Math.PI*2;g.push(a(i[0]+(p.x*Math.cos(r)+m.x*Math.sin(r))*h,i[1]+(p.y*Math.cos(r)+m.y*Math.sin(r))*h,i[2]+(p.z*Math.cos(r)+m.z*Math.sin(r))*h,s,e/t.length))}c.push(g)}for(let e=0;e<c.length-1;e++)for(let t=0;t<l;t++){let n=c[e][t],r=c[e][(t+1)%l],a=c[e+1][(t+1)%l],o=c[e+1][t];i.push(n,r,o,r,a,o)}};for(let t of[1,-1]){let n=[];for(let r=0;r<=(e?5:10);r++){let i=r/(e?5:10);n.push([t*(.05+Math.sin(i*2.2)*.28),.05+i*.06-i*i*.1,.48+Math.sin(i*2.6)*.25-i*i*.75])}l(n,.042,.005,2);for(let e=0;e<5;e++){let n=.36-e*.055;l([[t*.09,-.01,n],[t*.19,.025,n-.01],[t*.26,-.01,n-.04],[t*.29,-.07,n-.07]],.013,.005,3)}l([[t*.03,.05,.47],[t*.05,.08,.5]],.012,.01,4)}return kt(t,n,i)}function Pt(e,t,n,r,i,a){let o=r+(r>=0?1e-4:-1e-4),s=o*n,c=Math.sin(s*.5),l=2*c*c/o+e*Math.cos(s),u=Math.sin(s)/o-e*Math.sin(s),d=i+(i>=0?1e-4:-1e-4),f=d*u,p=Math.sin(f*.5);return a.set(l,2*p*p/d+t*Math.cos(f),Math.sin(f)/d-t*Math.sin(f))}var Ft={side:new t().makeBasis(new r(0,1,0),new r(0,0,1),new r(1,0,0)),sideFlip:new t().makeBasis(new r(0,-1,0),new r(0,0,-1),new r(1,0,0)),tail:new t().makeBasis(new r(0,0,1),new r(-1,0,0),new r(0,-1,0)),tailFlat:new t().makeBasis(new r(1,0,0),new r(0,0,1),new r(0,-1,0)),gill:new t().makeBasis(new r(0,0,1),new r(1,0,0),new r(0,1,0)),flat:new t().makeBasis(new r(0,0,-1),new r(0,1,0),new r(1,0,0))},K=class{constructor(){this.items=[],this.mesh=null}add(e,t,n,i,a,o={}){let s=t?R[t]:null,c=o.curl??0,l=o.sag??0;wt.multiplyMatrices(n,Ft[i]),wt.decompose(G,Tt,Et);let u=o.anchor||[0,0,0],d=Pt(u[0],u[1],u[2],c,l,new r).multiplyScalar(a).applyQuaternion(Tt);G.sub(d),this.items.push({kind:e,species:t,L:a,x:G.x,y:G.y,z:G.z,q:Tt.toArray(),pattern:s?s.pattern:0,seed:o.seed??Math.random(),curl:c,sag:l,jaw:o.jaw??0,flags:[o.cloudy??.4,o.wet??1,o.dried??0,o.blood??0]})}static restHeight(e,t){let n=R[e],r=0;for(let e=.1;e<.9;e+=.05)r=Math.max(r,H(n,e).W);return r*t*.85}static tailAnchor(e){return[0,0,.5-R[e].body*.985]}static gillAnchor(e){let t=R[e];return[0,t.mouth.y*.5,.5-t.body*(t.mouth.corner+.03)]}build(){let t=new Map;for(let e of this.items){let n=e.kind+`:`+(e.species||``);t.has(n)||t.set(n,{kind:e.kind,species:e.species})}let n=[],r=new Map;for(let[e,i]of t){let t=i.species?R[i.species]:null,a=e=>{switch(i.kind){case`split`:return et(t,{lod:e});case`head`:return $e(t,{lod:e,pose:`dead`,u1:t.opercle+.02,eyes:e===0});case`trunk`:return $e(t,{lod:e,pose:`dead`,u0:t.opercle+.02});case`ice`:return jt(e);case`leaf`:return Mt(e);case`lobster`:return Nt(e);default:return $e(t,{lod:e,pose:`dead`,eyes:e===0})}};r.set(e,n.length);let o=a(1);n.push({geometry:a(0)},{geometry:o},{geometry:o,shadow:!0,shadowOnly:!0})}let i=this.items.length,a=new Ne(`FishProps`,n,{maxInstances:Math.max(1,i),fade:!0}),o=a.data;this.kind0=new Uint16Array(i),this.pos=new Float32Array(i*4),this.items.forEach((e,t)=>{let n=t*16;o.set([e.x,e.y,e.z,e.L],n),o.set(e.q,n+4),o.set([e.pattern+e.seed%1*.9,e.curl,e.sag,e.jaw],n+8),o.set(e.flags,n+12),this.kind0[t]=r.get(e.kind+`:`+(e.species||``)),this.pos.set([e.x,e.y,e.z,e.L],t*4)}),a.upload(),this.batch=a,this.material=xt(a);let s=a.createMesh(this.material,{castShadow:!0,receiveShadow:!0});s.name=`village_fish`,this.fadeMaterial=xt(a,{fade:!0}),s.add(a.createFadeMesh(this.fadeMaterial));let c=s.onBeforeRender;return this._frame=-1,s.onBeforeRender=(t,n,r,i,a,o)=>{r.isPerspectiveCamera&&this.cull(r,e.frame),c(t,n,r,i,a,o)},this.mesh=s,this.items=null,s}cull(e,t){if(t===this._frame)return;this._frame=t,e.updateMatrixWorld(),wt.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),Dt.setFromProjectionMatrix(wt,e.coordinateSystem,e.reversedDepth);let n=e.position,r=this.pos,i=this.batch,a=this.kind0.length;i.begin();for(let e=0;e<a;e++){let t=r[e*4]-n.x,a=r[e*4+1]-n.y,o=r[e*4+2]-n.z,s=r[e*4+3],c=Math.sqrt(t*t+a*a+o*o);if(c>St)continue;let l=this.kind0[e];if(c<Ct&&i.add(l+2,e),Ot.center.set(r[e*4],r[e*4+1],r[e*4+2]),Ot.radius=s*.8,!Dt.intersectsSphere(Ot))continue;let u=s*28,d=St*.9;if(c>d)i.addFade(l+(c<u?0:1),e,1-nt(c,d,St),!1);else if(c>u*.88&&c<u){let t=nt(c,u*.88,u);i.addFade(l,e,t,!0),i.addFade(l+1,e,t,!1)}else i.add(l+(c<u?0:1),e)}i.commit()}},It=new d,q=new r,J=e=>(It.setHex(e),[It.r,It.g,It.b]),Lt=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],Y=(e,t=.7,n=0,r=0)=>[e,n,r,t],X=(e,t=0,n=0,r=.5)=>[e,t,n,r],Z={iron:J(1907739),galv:J(10133666),rubber:J(1315860),brass:J(11570506),rope:J(11836012),ropeDark:J(8219210),ropeBlue:J(4091790),white:J(15921126),orange:J(15229482),red:J(12729134),yellow:J(15778362),green:J(4161365),blue:J(3108776),black:J(2105376),fishSilver:J(10135213),fishDry:J(9071173),glassWarm:J(16773328),straw:J(13218426)},Rt=class{constructor(e){this.fn=e}next(){return this.fn()}range(e,t){return e+(t-e)*this.fn()}int(e,t){return Math.floor(this.range(e,t+1))}pick(e){return e[Math.floor(this.fn()*e.length)%e.length]}chance(e){return this.fn()<e}};function zt(e,t,n,r,i=.5){e.lathe(`hard`,t,n,r,[[0,0],[.21,0],[.21,.045],[.21,.045],[.14,.075],[.115,.14],[.11,.3],[.125,.37],[.175,.41],[.18,.45],[.14,.49],[0,.5]],{segs:14,tint:Z.iron,data:X(i,.3,.35,.5)});for(let a=0;a<4;a++){let o=a/4*Math.PI*2+Math.PI/4;e.cyl(`hard`,t+Math.cos(o)*.17,n+.045,r+Math.sin(o)*.17,.018,.022,.025,{segs:6,tint:Z.iron,data:X(i,.8,.4,.6)})}}function Bt(e,t,n,r,i=0,a=.5){let o=Z.iron,s=X(a,.5,.4,.5);e.pushAt(t,n,r,i),e.box(`hard`,0,.012,0,.26,.024,.09,{tint:o,data:s}),e.box(`hard`,-.065,.055,0,.05,.07,.055,{tint:o,data:s}),e.box(`hard`,.065,.055,0,.05,.07,.055,{tint:o,data:s}),e.rod(`hard`,[0,.1,0],[.2,.1,0],.026,.013,{segs:8,tint:o,data:s}),e.rod(`hard`,[0,.1,0],[-.2,.1,0],.026,.013,{segs:8,tint:o,data:s}),e.pop()}function Vt(e,t,n,r,i=0,a=.7,o=.5){e.pushAt(t,0,r,i);let s=n-a;e.torus(`hard`,.12,s,0,.27,.1,{rz:Math.PI/2,radial:7,tubular:16,tint:Z.rubber,data:X(o,0,0,.82)}),e.tube(`rope`,P([-.05,n+.02,0],[.12,s+.33,0],.02,4),.016,{tint:Z.rope,data:[o,0,0,0]}),e.pop()}function Ht(e,t,n,i,a=.09,o=.32,s=5,c=.5,l=Z.rope){let u=[],d=s*12;for(let e=0;e<=d;e++){let c=e/d,l=c*s*Math.PI*2,f=a+(o-a)*c;u.push(new r(t+Math.cos(l)*f,n+.02+Math.sin(l*3.1)*.004,i+Math.sin(l)*f))}let f=u[u.length-1];u.push(new r(f.x+.25,n+.02,f.z+.3)),e.tube(`rope`,u,.02,{radial:4,tint:l,data:[c,0,0,0]});let p=[];for(let e=0;e<=24;e++){let s=e/24*Math.PI*4+1.3,c=a+.05+(o-a-.1)*e/24;p.push(new r(t+Math.cos(s)*c,n+.055,i+Math.sin(s)*c))}e.tube(`rope`,p,.02,{radial:4,tint:l,data:[c+.3,0,0,0]})}function Ut(e,t,n,r,i,a=null,o=.5){e.torus(`rope`,t,n,r,i,.022,{rx:.18,rz:.1,radial:5,tubular:14,tint:Z.rope,data:[o,0,0,0]}),a&&e.tube(`rope`,P([t+i*.8,n-.02,r],a,.15,8),.022,{tint:Z.rope,data:[o,0,0,0]})}function Wt(e,t,n,r,i=0,a=.5){let o=Z.orange,s=Z.white;e.pushAt(t,n,r,i),e.torus(`hard`,0,0,0,.29,.06,{rx:Math.PI/2,radial:8,tubular:24,tint:(e,t,n)=>Math.floor((Math.atan2(n,e)+Math.PI)/(Math.PI/4)+.5)%2?s:o,data:X(a,0,0,.55)}),e.torus(`rope`,0,0,0,.345,.012,{rx:Math.PI/2,radial:4,tubular:24,tint:Z.white,data:[a,0,0,0]}),e.pop()}function Gt(e,t,n,r,i=.5,a=1){let o=a,s=Z.iron,c=X(i,.35,.5,.45);e.torus(`hard`,t,n-.02*o,r,.02*o,.005*o,{rx:Math.PI/2,radial:3,tubular:6,tint:s,data:c}),e.cyl(`hard`,t,n-.13*o,r,.02*o,.12*o,.1*o,{segs:6,capTop:!0,capBot:!0,tint:s,data:c}),e.cyl(`hard`,t,n-.155*o,r,.125*o,.125*o,.025*o,{segs:6,capBot:!0,tint:s,data:c});let l=n-.355*o;e.cyl(`glass`,t,l,r,.085*o,.075*o,.2*o,{segs:6,capTop:!1,tint:Z.glassWarm,data:[i,1,1,0]});for(let n=0;n<4;n++){let i=n/4*Math.PI*2+Math.PI/4;e.box(`hard`,t+Math.cos(i)*.085*o,l+.1*o,r+Math.sin(i)*.085*o,.014*o,.2*o,.014*o,{skip:12,tint:s,data:c})}return e.cyl(`hard`,t,l-.04*o,r,.1*o,.07*o,.04*o,{segs:6,capBot:!0,tint:s,data:c}),[t,l+.1*o,r]}function Kt(e,t,n,r,i=.5){let a=Z.iron,o=X(i,.3,.5,.45);e.box(`hard`,t,n,r+.01,.08,.16,.02,{tint:a,data:o}),e.rod(`hard`,[t,n+.02,r+.01],[t,n+.05,r+.2],.01,.01,{segs:5,tint:a,data:o});let s=Gt(e,t,n+.05,r+.2,i,.75);return e.toWorld(s[0],s[1],s[2])}function qt(e,t,n,r,i,a=3.2,o=.5){let s=Y(o,.75,.62,0),c=J(14077885);e.box(`wood`,t,n+a/2,r,.14,a,.14,{grain:1,tint:c,data:s}),e.box(`wood`,t,n+a+.03,r,.18,.06,.18,{grain:0,tint:c,data:s}),e.pushAt(t,n,r,i);let l=Z.iron,u=X(o,.35,.5,.45),d=a-.18;e.box(`hard`,0,d,.35,.035,.035,.62,{tint:l,data:u}),e.rod(`hard`,[0,d-.35,.075],[0,d-.01,.4],.012,.012,{segs:5,tint:l,data:u}),e.torus(`hard`,0,d-.08,.2,.08,.008,{ry:Math.PI/2,rz:Math.PI/2,radial:3,tubular:8,tint:l,data:u});let f=Gt(e,0,d-.02,.6,o),p=e.toWorld(f[0],f[1],f[2]);return e.pop(),p}function Jt(e,t,n,r,i=.5){let a=Y(i,.8,0,0);e.box(`wood`,t,n+.55,r,.12,1.1,.12,{grain:1,tint:[1,1,1],data:a}),e.box(`wood`,t,n+1.12,r,.16,.04,.16,{grain:0,tint:[1,1,1],data:a});let o=Z.iron,s=X(i,.35,.5,.45),c=n+1.14;return e.cyl(`hard`,t,c,r,.07,.07,.03,{segs:8,capBot:!0,tint:o,data:s}),e.cyl(`glass`,t,c+.03,r,.06,.06,.15,{segs:8,capTop:!1,tint:Z.glassWarm,data:[i,1,1,0]}),e.cyl(`hard`,t,c+.18,r,.015,.1,.07,{segs:8,capBot:!0,tint:o,data:s}),e.toWorld(t,c+.1,r)}function Yt(e,t,n,r,i=0,a=1.6,o=.5,s=null){e.pushAt(t,n,r,i);let c=s||[1,1,1],l=e=>Y(e,.8,s?.55:0,0);for(let t=0;t<3;t++)e.box(`wood`,0,.44,-.13+t*.13,a,.04,.11,{grain:0,tint:c,data:l(o+t*.1)});for(let t of[-a/2+.15,a/2-.15])e.box(`wood`,t,.21,-.13,.07,.42,.07,{grain:1,tint:c,data:l(o+.5)}),e.box(`wood`,t,.21,.13,.07,.42,.07,{grain:1,tint:c,data:l(o+.6)}),e.box(`wood`,t,.4,0,.06,.05,.4,{grain:2,tint:c,data:l(o+.7)}),e.beam(`wood`,[t,.42,-.2],[t,.9,-.28],.06,.05,{tint:c,data:l(o+.8)});e.box(`wood`,0,.68,-.245,a,.1,.03,{grain:0,rx:-.16,tint:c,data:l(o+.3)}),e.box(`wood`,0,.84,-.27,a,.1,.03,{grain:0,rx:-.16,tint:c,data:l(o+.4)}),je.addIn(e,0,0,.02,0,{h:.46,width:a-.3}),e.pop()}function Xt(e,t,n,r,i=Z.blue,a=.5){e.lathe(`hard`,t,n,r,[[0,0],[.1,0],[.1,0],[.135,.28],[.142,.295],[.13,.29],[.095,.03],[0,.03]],{segs:12,tint:i,data:X(a,0,0,.5)}),e.torus(`hard`,t,n+.29,r,.14,.006,{rz:Math.PI/2,arc:Math.PI,radial:4,tubular:10,tint:Z.galv,data:X(a,.2,.8,.4)})}var Q=new t,Zt=e=>e.fishProps||=new K;function $(e,t,n,r,i={}){let a=i.species||`redSnapper`,o=i.len||.4,s=i.kind||`whole`,c=i.pose||`side`,l=[0,0,0],u=n;c===`tail`?(l=K.tailAnchor(a),s===`split`&&(c=`tailFlat`)):c===`gill`?l=K.gillAnchor(a):(u+=s===`split`?.012:K.restHeight(a,o),i.flip&&(c=`sideFlip`)),M(t,u,r,i.ry||0,i.rx||0,i.rz||0,Q),Q.premultiply(e.frame),Zt(e).add(s,a,Q,c,o,{...i,anchor:l})}function Qt(e,t,n,r,i,a=.5){M(t,n,r,a*6.28,0,0,Q),Q.premultiply(e.frame),Zt(e).add(`ice`,null,Q,`flat`,i,{seed:a,flags:0})}function $t(e,t,n,r,i=0,a=.9,o=.5,s=0){M(t,n,r,i,0,s,Q),Q.premultiply(e.frame),Zt(e).add(`leaf`,null,Q,`flat`,a,{seed:o,anchor:[0,0,0]})}function en(e,t,n,r,i=0,a=.3,o=.5,s=0){M(t,n+a*.035,r,i,s,0,Q),Q.premultiply(e.frame),Zt(e).add(`lobster`,null,Q,`flat`,a,{seed:o})}function tn(e,t,n,i=.5,a=.018){e.tube(`rope`,[new r(t[0],t[1],t[2]),new r(n[0],n[1]+a*.5,n[2])],.0035,{radial:3,tint:Z.rope,data:[i,0,0,0]});let o=[];for(let e=0;e<=8;e++){let t=e/8*Math.PI*2;o.push(new r(n[0]+Math.cos(t)*a,n[1]+Math.sin(t*2)*.003,n[2]+Math.sin(t)*a*.6))}e.tube(`rope`,o,.003,{radial:3,tint:Z.rope,data:[i,0,0,0]})}function nn(e,t,n,r,i=.06,a=.5){let o=X(a,.35,.85,.35),s=i+.012;e.torus(`hard`,t,n,r,s,.0045,{ry:Math.PI/2,arc:Math.PI*1.25,rz:-Math.PI*.1,radial:4,tubular:8,tint:Z.galv,data:o});let c=n-s;return e.rod(`hard`,[t,c+.004,r-.004],[t,c-.08,r],.0045,.0045,{segs:4,tint:Z.galv,data:o}),e.torus(`hard`,t,c-.1,r,.022,.0045,{ry:Math.PI/2,rz:Math.PI,arc:Math.PI*1.2,radial:4,tubular:8,tint:Z.galv,data:o}),c-.12}function rn(e,t,n,i,a=0,o=.5){e.pushAt(t,n,i,a);let s=e=>Y(e,.75,0,0);for(let t=0;t<5;t++)e.box(`wood`,0,.88,-.26+t*.13,1.35,.045,.12,{grain:0,data:s(o+t*.13)});for(let t of[-.6,.6])for(let n of[-.27,.27])e.box(`wood`,t,.43,n,.07,.86,.07,{grain:1,data:s(o+t+n)});e.box(`wood`,0,.25,0,1.25,.03,.5,{grain:0,data:s(o+.9)}),e.box(`wood`,0,.8,-.28,1.25,.1,.03,{grain:0,data:s(o+.4)}),e.box(`wood`,.2,.915,.02,.56,.025,.34,{grain:0,tint:[1.25,1.2,1.1],data:Y(o+.2,.25,0,0)});let c=.928,l={species:`redSnapper`,len:.44,ry:.12,sag:.08,blood:1,cloudy:.5,seed:o,jaw:.25};$(e,.17,c,.02,{...l,kind:`trunk`}),$(e,.21,c,.035,{...l,kind:`head`,ry:.4}),e.pushAt(.26,.93,.13,-.45);let u=[[0,.011],[.13,.009],[.175,.002],[.19,-.004],[.12,-.009],[0,-.01]].map(e=>new r(e[0],0,e[1]));e.slab(`hard`,u,.0016,{up:new r(0,1,0),tint:J(13159632),data:X(o,.05,.95,.18)}),e.box(`wood`,-.055,.009,0,.11,.018,.024,{grain:0,tint:Z.black,data:Y(o,.2,.8,0)});for(let t of[-.085,-.03])e.cyl(`hard`,t,.0175,0,.0035,.0035,.002,{segs:5,tint:J(11570490),data:X(o,.1,.9,.3)});e.pop();let d=[];for(let e=0;e<9;e++){let t=e/9*Math.PI*2;d.push(new r(.215+Math.cos(t)*.05*(1+.25*Math.sin(t*3+o*9)),.9285,.04+Math.sin(t)*.028))}e.slab(`hard`,d,8e-4,{up:new r(0,1,0),tint:J(4851720),data:X(o,0,0,.15)}),$(e,-.33,.9025,-.06,{species:`tuna`,len:.52,ry:2.75,sag:-.12,curl:.05,jaw:.3,seed:o+.3}),Xt(e,-.3,.265,.05,Z.white,o),e.pop()}function an(e,t,n,r,i,a,o=0,s=.5,c={}){e.pushAt(t,n,r,c.ry||0,c.rx||0,c.rz||0);let l=X(s,0,0,.42);o===0?(e.lathe(`hard`,0,0,0,[[0,0],[.08,.025],[.125,.12],[.1,.25],[.04,.305],[0,.31]],{segs:8,tint:(e,t)=>t>.15?i:a,data:l}),e.torus(`hard`,0,.335,0,.025,.008,{rx:Math.PI/2,radial:3,tubular:6,tint:Z.black,data:l})):o===1?(e.lathe(`hard`,0,0,0,[[0,0],[.05,0],[.09,.08],[.09,.32],[.05,.4],[0,.4]],{segs:8,tint:(e,t)=>t>.14&&t<.26?a:i,data:l}),e.cyl(`wood`,0,.38,0,.012,.014,.5,{segs:5,data:Y(s,.8,0,0)}),e.cyl(`wood`,0,-.12,0,.014,.012,.14,{segs:5,data:Y(s,.8,0,0)})):e.lathe(`hard`,0,0,0,[[0,0],[.08,.03],[.09,.12],[0,.2]],{segs:7,tint:i,data:l}),e.pop()}function on(e,t,n,r,i,a=.25){let o=P(t,n,a,10);e.tube(`rope`,o,.01,{radial:4,tint:Z.rope,data:[i.next(),0,0,0]});let s=[[Z.orange,Z.white],[Z.red,Z.white],[Z.yellow,Z.black],[Z.white,Z.blue],[Z.green,Z.yellow],[Z.orange,Z.orange]];for(let t=0;t<r;t++){let n=(t+.5)/r,a=o[Math.round(n*10)],[c,l]=i.pick(s),u=i.chance(.5)?0:2;an(e,a.x,a.y-.34,a.z,c,l,u,i.next(),{rz:i.range(-.15,.15)})}}function sn(e,t,n,r=.5,i=null){q.set(n[0]-t[0],n[1]-t[1],n[2]-t[2]);let a=q.length();q.divideScalar(a);let o=a-.55,s=[t[0]+q.x*o,t[1]+q.y*o,t[2]+q.z*o];e.rod(`wood`,t,s,.022,.024,{segs:6,data:Y(r,.55,0,0)}),e.beam(`wood`,s,n,.14,.018,{tint:i||[1,1,1],data:Y(r+.2,.5,i?.6:0,0)})}function cn(e,t,n,r){let i=e<.42?.7+.3*Math.sin(Math.PI/2*e/.42):Math.cos(Math.PI/2*(e-.42)/.58)**.85;return{halfB:n/2*i,sheer:r+.09*(2*e-1)**2+.1*e*e,keel:.05*(Math.max(0,.45-e)/.45)**2+.42*(Math.max(0,e-.62)/.38)**2.2,z:(e-.5)*t}}function ln(e,n,i,a,o=0,s={}){let c=s.length??4.1,l=s.beam??1.38,u=s.depth??.52,d=s.seed??.5,f=s.hull??J(3112847),p=s.bottom??J(9386538),m=s.trim??Z.white,h=!!s.upsideDown;e.pushAt(n,i,a,o,s.rx||0,(h?Math.PI:0)+(s.rz||0)),h&&e.push(M(0,-(u+.035),0));let g=(e,t)=>{let n=cn(e,c,l,u),r=Math.abs(t)*Math.PI/2;return[n.halfB*Math.sign(t)*Math.sin(r)**.85,n.keel+(n.sheer-n.keel)*(1-Math.cos(r)**1.25),n.z]},_=[],v=[],y=.001,b=(e,t)=>{for(let n=0;n<=10;n++)for(let i=0;i<=16;i++){let a=.02+.96*i/16,o=-1+2*n/10,s=g(a,o),c=g(Math.min(1,a+y),o),l=g(Math.max(0,a-y),o),d=g(a,Math.min(1,o+y)),f=g(a,Math.max(-1,o-y)),p=new r(c[0]-l[0],c[1]-l[1],c[2]-l[2]),m=new r(d[0]-f[0],d[1]-f[1],d[2]-f[2]),h=p.clone().cross(m).normalize(),_=s[0],v=s[1]-u*.9;h.x*_+h.y*v<0&&h.negate(),t.push({p:[s[0]-h.x*e,s[1]-h.y*e,s[2]-h.z*e],n:h.toArray(),s:o,t:a})}};b(0,_);let x=e=>Math.abs(-1+2*e/10)*(l*.5+u)*.9,S=(e,t)=>j(16,10,(n,r)=>{let i=e[r*17+n];return{p:i.p,n:t?[-i.n[0],-i.n[1],-i.n[2]]:i.n,uv:[i.t*c,x(r)]}}),ee=u*.42;e.add(`wood`,S(_,!1),new t,(e,t)=>t<ee?p:f,Y(d,.5,.7,1)),(!h||s.interior!==!1)&&(b(.03,v),e.add(`wood`,S(v,!0),new t,J(14209728),Y(d+.3,.55,.6,5)));for(let t of[-1,1]){let n=[];for(let e=0;e<=16;e++){let i=g(.02+.96*e/16,t);n.push(new r(i[0]-t*.012,i[1]+.01,i[2]))}e.tube(`wood`,n,.028,{radial:4,tint:m,data:Y(d+.1,.6,.65,0)})}let C=[];for(let e=0;e<=16;e++){let t=g(.02+.96*e/16,0);C.push(new r(0,t[1]-.015,t[2]))}e.tube(`wood`,C,.028,{radial:4,tint:p,data:Y(d+.2,.6,.6,0)});let te=[];for(let e=0;e<=10;e++){let t=g(.02,-1+2*e/10);te.push(new r(t[0],t[1],t[2]))}if(e.add(`wood`,we(te,.035,new r(1,0,0),new r(0,0,-1)),new t,f,Y(d+.4,.55,.7,6)),!h){for(let t of[.3,.62]){let n=cn(t,c,l,u);e.box(`wood`,0,n.sheer-.17,n.z,n.halfB*1.85,.035,.22,{grain:0,tint:m,data:Y(d+t,.6,.6,0)})}s.oars!==!1&&(sn(e,[-.3,u*.55,-1.2],[-.35,u*.4,1.35],d+.1),sn(e,[.32,u*.55,-1.1],[.28,u*.45,1.4],d+.7))}h&&e.pop(),e.pop()}function un(e,t,n,i,a,o,s={}){let c=s.length??7.5,l=s.beam??2.6,u=s.depth??1.3;e.pushAt(t,n,i,a,s.rx||0,s.rz||0);let d=()=>Y(o.next(),o.range(.9,1)),f=[.78,.74,.7],p=[];for(let e=0;e<=10;e++){let t=e/10;p.push(new r(0,.12*(2*t-1)**4+(t>.85?(t-.85)*3.5:0),(t-.5)*c))}e.tube(`wood`,p,.1,{radial:5,tint:f,data:d()});for(let t=1;t<11;t++){let n=t/11,i=l/2*Math.sin(Math.PI*(.08+.84*n))**.7,a=(n-.5)*c;for(let t of[-1,1]){if(o.chance(.18))continue;let n=o.chance(.35)?o.range(.35,.8):1,s=[];for(let e=0;e<=6;e++){let c=e/6*n*Math.PI/2;s.push(new r(t*i*Math.sin(c),u*(1-Math.cos(c))*1.05+.05,a+o.range(-.02,.02)))}e.tube(`wood`,s,.055,{radial:4,tint:f,data:d()})}}for(let t=0;t<3;t++){let n=(.25+t*.14)*Math.PI/2,r=.2+o.range(0,.1),i=.55+o.range(0,.2),a=[l/2*.95*Math.sin(n)+.05,u*(1-Math.cos(n))+.05,(r-.5)*c],s=[l/2*.95*Math.sin(n)+.05,u*(1-Math.cos(n))+.05,(i-.5)*c];e.beam(`wood`,a,s,.035,.2,{roll:-n,tint:f,data:d()})}e.pop()}function dn(e,n,r,i,a,o=3.2,s=J(4157279),c=.5,l=null){e.pushAt(n,0,i,a);let u=1.95,d=Y(c,.85,0,0);for(let t of[-o/2,o/2]){let n=l?l(t,0):r;e.cyl(`wood`,t,n-.4,0,.055,.065,2.4,{segs:6,data:d}),e.box(`wood`,t,n+u-.02,0,.08,.08,.6,{grain:2,data:d})}let f=l?(l(-o/2,0)+l(o/2,0))/2:r;e.rod(`wood`,[-o/2-.2,f+u+.05,0],[o/2+.2,f+u+.05,0],.04,.04,{segs:6,data:Y(c+.3,.8,0,0)});let p=f+u+.09,m=1.6,h=j(18,12,(e,t)=>{let n=e/18,r=t/12,i=(n-.5)*(o-.3),a=r<.5?1:-1,s=Math.abs(r-.5)*2,c=Math.sin(n*23+r*3)*.04+Math.sin(n*7.3)*.05;return{p:[i,p-s*m+Math.sin(n*Math.PI)*s*.1,a*(.04+s*.22+c*s)],n:[0,.2,a],uv:[i,r*m*2]}});e.add(`net`,h,new t,s,(e,t)=>[c,Math.min(1,Math.max(0,(p-t)/m))*.8,.045,0]);for(let t of[-1,1])for(let n=0;n<5;n++)an(e,((n+.5)/5-.5)*(o-.4),p-m-.06,t*.27,Z.orange,Z.orange,2,c+n*.1,{rx:t*.2});e.pop()}function fn(e,t,n,r,i,a=2.6,o=.5,s=null){e.pushAt(t,n,r,i);let c=Y(o,.9,0,0);for(let t of[-a/2,a/2])e.rod(`wood`,[t,-.2,-.7],[t,2.05,.05],.035,.03,{segs:5,data:c}),e.rod(`wood`,[t,-.2,.7],[t,2.05,-.05],.035,.03,{segs:5,data:c});let l=[`jack`,`mullet`,`redSnapper`,`mullet`],u=new Rt(_(Math.floor(o*4294967296)));for(let[t,n]of[[1.95,0],[1.25,-.36],[1.25,.36]]){e.rod(`wood`,[-a/2-.15,t,n],[a/2+.15,t,n],.025,.025,{segs:5,data:Y(o+t,.85,0,0)});let r=Math.floor(a/.22);for(let i=0;i<r;i++){if(s&&s.chance(.4))continue;let c=(s?s.range(.3,.42):.36)*1.35,d=-a/2+.15+i*(a-.3)/(r-1)+u.range(-.03,.03),f=u.range(.05,.1),p=o+i*.07+t,m=n<0||n===0&&i%2?Math.PI:0;tn(e,[d,t-.02,n],[d,t-f,n],p,.012),$(e,d,t-f,n,{species:l[(i+Math.round(t*3))%l.length],kind:`split`,pose:`tail`,len:c,ry:m+u.range(-.25,.25),sag:u.range(-.25,.25),curl:u.range(-.35,.1),dried:1,wet:0,seed:p%1})}}e.pop()}function pn(e,t,n,i=`picket`,a=Z.white,o=.5,s=null,c=null){let l=i===`picket`;for(let i=0;i<t.length-1;i++){let[u,d]=t[i],[f,p]=t[i+1],m=Math.hypot(f-u,p-d),h=Math.max(1,Math.round(m/2)),g=Math.atan2(f-u,p-d);for(let t=0;t<=h;t++){if(i>0&&t===0)continue;let r=t/h,s=u+(f-u)*r,c=d+(p-d)*r,m=n(s,c);e.box(`wood`,s,m+.42,c,.09,1.1,.09,{grain:1,tint:l?a:[1,1,1],data:Y(o+t*.1,.8,l?.5:0,0)})}for(let t=0;t<h;t++){let r=t/h,i=(t+1)/h,s=u+(f-u)*r,c=d+(p-d)*r,m=u+(f-u)*i,_=d+(p-d)*i,v=n(s,c),y=n(m,_);for(let n of l?[.25,.7]:[.35,.78])e.beam(`wood`,[s,v+n,c],[m,y+n,_],.03,.08,{tint:l?a:[1,1,1],data:Y(o+n+t,.8,l?.45:0,0)});if(l){let n=Math.hypot(m-s,_-c),r=Math.floor(n/.14);for(let n=0;n<r;n++){let i=(n+.5)/r,l=s+(m-s)*i,u=c+(_-c)*i,d=v+(y-v)*i,f=.9+(n*7+t*3)%5*.012;e.box(`wood`,l,d+f/2-.05,u,.075,f,.022,{grain:1,ry:g+Math.PI/2,tint:a,data:Y(o+n*.37,.8,.45,0)}),e.box(`wood`,l,d+f-.03,u,.053,.053,.022,{grain:1,ry:g+Math.PI/2,rz:Math.PI/4,tint:a,data:Y(o+n*.37,.8,.45,0)})}}}if(s&&c){let e=c(u,d),t=c(f,p),i=(e.x+t.x)/2,a=(e.z+t.z)/2,o=Math.max(n(u,d),n(f,p));s.addBox(new r(i,o+.5,a),new r(.06,.6,m/2),Math.atan2(t.x-e.x,t.z-e.z),{tag:`fence`})}}}function mn(e,t,n,r,i=.5,a=!0){let o=Y(i,.85,0,0),s=1.7,c=.62;for(let i of[-.62,c])for(let a of[-.62,c])e.box(`wood`,t+i,n+s/2-.2,r+a,.12,2.1,.12,{grain:1,data:o});for(let i of[-.62,c])e.beam(`wood`,[t-c,n+.3,r+i],[t+c,n+s-.2,r+i],.04,.12,{data:o});for(let a=0;a<9;a++)e.box(`wood`,t,n+s+.02,r-.7+a*.175,1.5,.045,.16,{grain:0,data:Y(i+a*.1,.85,0,0)});let l=n+s+.045;return a?(e.cyl(`roofMetal`,t,l,r,.6,.6,1.25,{segs:20,capTop:!1,swapUV:!0,tint:Z.galv,data:[i,.55,1,0]}),e.cyl(`roofMetal`,t,l+1.25,r,.08,.62,.22,{segs:20,swapUV:!1,tint:Z.galv,data:[i+.5,.6,1,0]})):(e.cyl(`hard`,t,l,r,.6,.6,1.25,{segs:20,capTop:!1,tint:J(2764332),data:X(i,0,0,.55)}),e.cyl(`hard`,t,l+1.25,r,.1,.6,.15,{segs:20,tint:J(2764332),data:X(i,0,0,.55)})),e.rod(`hard`,[t+.5,l+.1,r],[t+.8,l+.1,r],.03,.03,{segs:6,tint:Z.galv,data:X(i,.4,.8,.4)}),e.rod(`hard`,[t+.8,l+.1,r],[t+.8,n+.6,r],.03,.03,{segs:6,tint:Z.galv,data:X(i,.4,.8,.4)}),l}function hn(e,t,n,r,i=0,a){e.pushAt(t,n,r,i);for(let t=0;t<4;t++){let n=6-(t>2);for(let r=0;r<n;r++){let n=a.range(.055,.075),i=-.5+r*.16+t%2*.08;e.cyl(`wood`,i,n+t*.13,-.25,n,n,.5+a.range(-.05,.05),{segs:7,capTop:!0,capBot:!0,rx:Math.PI/2,ry:a.range(-.05,.05),tint:[1.05,.95,.85],data:Y(a.next(),.35,0,0)})}}e.pop()}function gn(e,n,r,i,a=5,o=Z.red,s=.5){e.cyl(`wood`,n,r-.3,i,.035,.06,a+.3,{segs:7,tint:Z.white,data:Y(s,.6,.6,0)}),e.lathe(`hard`,n,r+a,i,[[0,0],[.05,.02],[.05,.06],[0,.09]],{segs:8,tint:Z.brass,data:X(s,.2,.9,.35)});let c=e.toWorld(n,0,i),l=.55,u=j(10,3,(e,t)=>{let n=e/10*1.3,i=l*(1-.75*e/10);return{p:[n,r+a-.1-(t/3-.5)*i-l/2,0],n:[0,0,1],uv:[n,t/3*i]}}),d=e.frame.clone().invert().multiply(new t().makeTranslation(c.x,0,c.z));e.add(`flag`,u,d,o,e=>[s,e,c.x,c.z])}function _n(e,t,n,i,a){let o=P(t,n,.18,10);e.tube(`rope`,o,.006,{radial:3,tint:Z.white,data:[i.next(),0,0,0]});let s=new r(n[0]-t[0],0,n[2]-t[2]).normalize(),c=Math.atan2(s.x,s.z)-Math.PI/2,l=i.int(3,5);for(let t=0;t<l;t++){let n=(t+.7)/(l+.6),r=o[Math.round(n*10)],s=i.range(.4,.75),u=i.range(.45,.8),d=j(3,4,(e,t)=>{let n=(e/3-.5)*s,r=-t/4*u;return{p:[n,r,Math.sin(e*1.9+t)*.02],n:[0,0,1],uv:[n+s/2,-r]}}),f=M(r.x,r.y+.01,r.z,c),p=i.next();e.add(`cloth`,d,f,i.pick(a),(e,t)=>[p,Math.min(1,-t/.8),0,0])}}function vn(e){let t=[];for(let e=0;e<=6;e++){let n=e/6*.88;t.push([.25+.035*Math.sin(Math.PI*n/.88),n])}e.lathe(`wood`,0,0,0,t,{segs:14,rRef:.27,tint:[1,1,1],data:Y(.3,.55,0,5)}),e.cyl(`wood`,0,.82,0,.255,.255,.01,{segs:14,capTop:!0,tint:[.95,.9,.85],data:Y(.7,.6,0,6)});for(let t of[.08,.26,.62,.8]){let n=.25+.035*Math.sin(Math.PI*t/.88)+.004;e.cyl(`hard`,0,t-.025,0,n,n,.05,{segs:14,capTop:!1,tint:Z.iron,data:X(.4,.45,.45,.55)})}}function yn(e){let t=.62,n=.42,r=.4,i=e=>Y(e,.65,0,0);for(let a of[-1,1])for(let o of[-1,1])e.box(`wood`,a*(t/2-.02),r/2,o*(n/2-.02),.04,r,.04,{grain:1,data:i(.1+a*.2+o*.3)});for(let r=0;r<3;r++){let a=.07+r*.13;for(let t of[-1,1])e.box(`wood`,0,a,t*(n/2-.005),.6,.09,.012,{grain:0,data:i(.2+r*.1+t*.05)});for(let n of[-1,1])e.box(`wood`,n*(t/2-.005),a,0,.012,.09,.39999999999999997,{grain:2,data:i(.5+r*.1+n*.05)})}e.box(`wood`,0,.015,0,.59,.02,.39,{grain:0,data:i(.8)});for(let n=0;n<3;n++)e.box(`wood`,0,.39,-.13+n*.13,t,.018,.09,{grain:0,skip:8,data:i(.9+n*.1)})}function bn(e){let n=.9,i=e=>Y(e,.8,0,0);for(let t of[-1,1])e.box(`wood`,0,.025,t*(.5/2-.02),n,.05,.04,{grain:0,data:i(.1+t*.1)});for(let t=0;t<5;t++)e.box(`wood`,0,.052,-.19+t*.095,.86,.012,.06,{grain:0,data:i(.3+t*.05)});for(let t of[-.9/2+.03,0,n/2-.03])e.torus(`wood`,t,.05,0,.24,.014,{rx:-Math.PI/2,rz:Math.PI/2,arc:Math.PI,radial:3,tubular:8,tint:[.9,.85,.8],data:i(.6+t)});for(let t=0;t<7;t++){let n=(t+.5)/7*Math.PI,r=.05+Math.sin(n)*.245,a=Math.cos(n)*.245;e.box(`wood`,0,r,a,.88,.012,.045,{grain:0,rx:-(n-Math.PI/2),data:i(.7+t*.05)})}for(let i of[-.9/2+.03,n/2-.03]){let n=[];for(let e=0;e<=10;e++){let t=e/10*Math.PI;n.push(new r(i,.05+Math.sin(t)*.24,Math.cos(t)*.24))}e.add(`net`,we(n,0,new r(0,0,1),new r(1,0,0)),new t,J(4876888),[.5,0,.035,0])}e.tube(`rope`,P([-.1,.3,0],[.1,.3,0],-.12,6),.01,{radial:4,tint:Z.ropeBlue,data:[.3,0,0,0]})}var xn=class{constructor(e){this.target=e,this.protos={barrel:this._proto(vn),crate:this._proto(yn),trap:this._proto(bn)},this.counts={barrel:0,crate:0,trap:0},this._m=new t}_proto(e){let t=new ke;return e(t),t}add(e,t,n,r,i=0,a=null,o=0,s=0){let c=this.protos[e],l=(this.counts[e]++*.6180339887+e.length*.137)%1*7;M(t,n,r,i,o,s,this._m);for(let e in c.batches)this.target.batch(e).addBatch(c.batches[e],this._m,a,l)}get count(){let e=0;for(let t in this.counts)e+=this.counts[t];return e}build(){return[]}};export{M as $,Ht as A,bt as B,Wt as C,dn as D,Lt as E,Kt as F,R as G,tt as H,mn as I,Ee as J,Ne as K,hn as L,ln as M,nn as N,sn as O,Vt as P,j as Q,un as R,_n as S,en as T,z as U,nt as V,$e as W,k as X,ke as Y,Te as Z,tn as _,Y as a,qt as b,zt as c,on as d,Se as et,rn as f,fn as g,$ as h,Rt as i,re as it,Ut as j,Jt as k,Xt as l,pn as m,X as n,we as nt,$t as o,Bt as p,je as q,xn as r,ie as rt,Yt as s,Z as t,Ce as tt,an as u,gn as v,J as w,Gt as x,Qt as y,K as z};