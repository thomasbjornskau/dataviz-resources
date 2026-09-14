const S=12;

function seasDiff(x){ // (1-B)(1-B^S)
  const d1=[]; for(let i=1;i<x.length;i++) d1.push(x[i]-x[i-1]);
  const w=[];  for(let i=S;i<d1.length;i++) w.push(d1[i]-d1[i-S]);
  return w;
}
function css(w,th,TH){ // innovasjoner ved betinget MKM
  const n=w.length,a=new Float64Array(n);
  for(let t=0;t<n;t++){
    let v=w[t];
    if(t-1>=0)   v+=th*a[t-1];
    if(t-S>=0)   v+=TH*a[t-S];
    if(t-S-1>=0) v-=th*TH*a[t-S-1];
    a[t]=v;
  }
  return a;
}
function sse(w,th,TH){const a=css(w,th,TH);let s=0;for(let i=0;i<a.length;i++)s+=a[i]*a[i];return s;}

function fitAirline(y){
  const x=y.map(Math.log), w=seasDiff(x);
  if(w.length<24) return null;
  let best=Infinity,bth=0,bTH=0;
  for(let i=0;i<=30;i++)for(let j=0;j<=30;j++){
    const th=-0.95+1.9*i/30, TH=-0.95+1.9*j/30, s=sse(w,th,TH);
    if(s<best){best=s;bth=th;bTH=TH;}
  }
  let step=0.06;
  for(let k=0;k<60;k++){
    let imp=false;
    for(const d of [[step,0],[-step,0],[0,step],[0,-step]]){
      const th=bth+d[0],TH=bTH+d[1];
      if(Math.abs(th)>0.999||Math.abs(TH)>0.999) continue;
      const s=sse(w,th,TH);
      if(s<best-1e-13){best=s;bth=th;bTH=TH;imp=true;}
    }
    if(!imp){step/=2; if(step<1e-6)break;}
  }
  return {th:bth,TH:bTH,sig2:best/w.length,a:css(w,bth,bTH),x:x};
}
function psiWeights(th,TH,H){
  const num=new Float64Array(H+1),den=new Float64Array(H+1);
  num[0]=1; if(H>=1)num[1]=-th; if(H>=S)num[S]-=TH; if(H>=S+1)num[S+1]+=th*TH;
  den[0]=1; if(H>=1)den[1]-=1;  if(H>=S)den[S]-=1;  if(H>=S+1)den[S+1]+=1;
  const p=new Float64Array(H+1);
  for(let j=0;j<=H;j++){let v=num[j];for(let k=1;k<=j;k++)v-=den[k]*p[j-k];p[j]=v;}
  return p;
}
function forecastAirline(m,H,z){
  z=z||1.96;
  const a=Array.from(m.a).concat(new Array(H).fill(0)), xx=m.x.slice(), m0=m.a.length;
  for(let h=1;h<=H;h++){
    const i=m0+h-1; let w=0;
    if(i-1>=0)   w-=m.th*a[i-1];
    if(i-S>=0)   w-=m.TH*a[i-S];
    if(i-S-1>=0) w+=m.th*m.TH*a[i-S-1];
    const n=xx.length;
    xx.push(w+xx[n-1]+xx[n-S]-xx[n-S-1]);
  }
  const f=xx.slice(m.x.length), p=psiWeights(m.th,m.TH,H);
  const out=[]; let cum=0;
  for(let h=0;h<H;h++){
    cum+=p[h]*p[h];
    const se=Math.sqrt(m.sig2*cum);
    out.push({f:Math.exp(f[h]),se:se,lg:f[h]});
  }
  return out;
}

