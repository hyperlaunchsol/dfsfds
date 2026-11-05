/* Decorative liquid titanium halo. No external dependencies. */
(()=>{
 const scene=document.querySelector('.token-object');if(!scene)return;
 const canvas=document.createElement('canvas');canvas.className='liquid-scene';canvas.setAttribute('aria-hidden','true');scene.prepend(canvas);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power',premultipliedAlpha:false});
 if(!gl){canvas.remove();return}
 const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
 const fragment=`precision mediump float;
 uniform vec2 res;uniform float time;uniform vec2 pointer;
 mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
 float shape(vec3 p){p.xy=rot(-.45+pointer.x*.12)*p.xy;p.xz=rot(.55+pointer.x*.2)*p.xz;p.yz=rot(.7+pointer.y*.15)*p.yz;float a=atan(p.y,p.x);float wave=sin(a*3.+time*.35)*.055+sin(a*5.-time*.23)*.025;vec2 q=vec2(length(p.xy)-1.25-wave,p.z);return length(q)-(.115+.035*sin(a*2.+time*.3));}
 vec3 normalAt(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
 vec3 environment(vec3 r){vec3 c=vec3(.09,.1,.16);float ceiling=pow(max(r.y*.5+.5,0.),2.);c+=vec3(.53,.58,.7)*ceiling;float band=pow(max(1.-abs(r.y-.43)*3.1,0.),7.);c+=vec3(.95,1.,1.12)*band;float violet=pow(max(dot(r,normalize(vec3(-.6,.2,.65))),0.),6.);c+=vec3(.31,.2,.43)*violet;float cool=pow(max(dot(r,normalize(vec3(.8,.4,.1))),0.),12.);c+=vec3(.45,.65,.8)*cool;return c;}
 void main(){vec2 uv=(gl_FragCoord.xy-.5*res)/res.y;vec3 ro=vec3(0.,0.,4.2);vec3 rd=normalize(vec3(uv*2.4,-3.));float d=0.;bool hit=false;for(int i=0;i<48;i++){vec3 p=ro+rd*d;float s=shape(p);if(s<.002){hit=true;break;}d+=s*.82;if(d>7.)break;}if(!hit){gl_FragColor=vec4(0.);return;}vec3 p=ro+rd*d;vec3 n=normalAt(p);vec3 r=reflect(rd,n);vec3 col=environment(r);float f=pow(1.-max(dot(-rd,n),0.),3.);float light=max(dot(n,normalize(vec3(-.6,1.,2.))),0.);col=col*(.63+.32*light)+vec3(.24,.21,.33)*f;col=pow(col,vec3(.86));gl_FragColor=vec4(col,.95);}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null}return s}
 const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);if(!vs||!fs){canvas.remove();return}
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){canvas.remove();return}
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const uRes=gl.getUniformLocation(program,'res'),uTime=gl.getUniformLocation(program,'time'),uPointer=gl.getUniformLocation(program,'pointer');let visible=true,frame=0,last=0,px=0,py=0,tx=0,ty=0,lost=false;
 function resize(){const r=scene.getBoundingClientRect();const scale=innerWidth<600?.75:1;canvas.width=Math.max(1,Math.min(750,Math.round(r.width*1.18*scale)));canvas.height=Math.max(1,Math.min(750,Math.round(r.height*1.18*scale)));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uRes,canvas.width,canvas.height)}
 function draw(now){if(lost)return;frame=0;if(!visible||document.hidden)return;if(now-last>=32||reduced){last=now;px+=(tx-px)*.055;py+=(ty-py)*.055;gl.uniform1f(uTime,reduced?0:now*.001);gl.uniform2f(uPointer,px,py);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6)}if(!reduced)frame=requestAnimationFrame(draw)}
 function resume(){if(visible&&!document.hidden&&!frame&&!lost)frame=requestAnimationFrame(draw)}
 scene.addEventListener('pointermove',e=>{if(reduced)return;const r=scene.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5});scene.addEventListener('pointerleave',()=>{tx=ty=0});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{resize();resume()}).observe(scene);else addEventListener('resize',()=>{resize();resume()},{passive:true});
 if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible&&frame){cancelAnimationFrame(frame);frame=0}else resume()},{rootMargin:'100px'}).observe(scene);
 document.addEventListener('visibilitychange',resume);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);scene.classList.remove('has-webgl');canvas.remove()});
 scene.classList.add('has-webgl');resize();resume();
})();
