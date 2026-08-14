/* Flight Instrument live-page overlay. Runs locally in the visitor's browser and never sends captured page data. */
(() => {
  if (window.BirdMotionMapper?.open) { window.BirdMotionMapper.open(); return; }
  const state = { mode: 'select', anchors: [], paths: [], drawing: null, overlay: null };
  const style = document.createElement('style');
  style.textContent = `
    #bmm-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:ui-sans-serif,system-ui,sans-serif;color:#eef8ff}
    #bmm-panel{position:absolute;z-index:2;left:18px;top:18px;width:250px;background:rgba(6,15,25,.94);backdrop-filter:blur(14px);border:1px solid rgba(161,210,244,.26);box-shadow:0 20px 60px rgba(0,0,0,.38);border-radius:10px;padding:14px;pointer-events:auto}
    #bmm-panel h1{font-size:14px;margin:0 0 4px;letter-spacing:-.02em}#bmm-panel p{font-size:10px;line-height:1.45;color:#9ab7cd;margin:0 0 11px}
    #bmm-panel .bmm-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px}#bmm-panel button{color:#d7efff;background:#12334d;border:1px solid rgba(174,217,244,.2);font-size:10px;border-radius:5px;padding:7px;cursor:pointer}#bmm-panel button.active{background:#58afe7;color:#04121e;font-weight:800}#bmm-panel .wide{width:100%;margin-top:8px;background:#dceefa;color:#09233a;font-weight:800}
    #bmm-canvas{position:absolute;z-index:1;inset:0;width:100%;height:100%;pointer-events:auto}.bmm-route{fill:none;stroke:#65b5f3;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}.bmm-anchor{fill:#043A78;stroke:#d6f1ff;stroke-width:2}.bmm-label{fill:#fff;font:600 12px ui-monospace,monospace;text-anchor:middle}.bmm-tag{fill:rgba(5,20,33,.88);stroke:rgba(198,231,250,.5);stroke-width:1}.bmm-tagtext{fill:#eef9ff;font:11px ui-sans-serif,sans-serif}
  `;
  document.head.appendChild(style);
  const svgNs = 'http://www.w3.org/2000/svg';
  function getPoint(event) { return { x: event.clientX / innerWidth, y: event.clientY / innerHeight }; }
  function pathD(points) { if (points.length < 2) return ''; return `M ${points.map(p => `${p.x * innerWidth} ${p.y * innerHeight}`).join(' L ')}`; }
  function elementName(event) {
    const root = state.overlay; root.style.pointerEvents = 'none';
    const element = document.elementFromPoint(event.clientX, event.clientY); root.style.pointerEvents = 'auto';
    if (!element) return `Anchor ${state.anchors.length + 1}`;
    const text = (element.getAttribute('aria-label') || element.innerText || element.alt || element.tagName).trim().replace(/\s+/g, ' ').slice(0, 32);
    return text || `Anchor ${state.anchors.length + 1}`;
  }
  function render() {
    const root = state.overlay; if (!root) return; const canvas = root.querySelector('#bmm-canvas');
    canvas.innerHTML = '';
    const paths = state.paths.concat(state.drawing ? [{ points: state.drawing }] : []);
    paths.forEach((route) => { const path = document.createElementNS(svgNs, 'path'); path.setAttribute('d', pathD(route.points)); path.setAttribute('class', 'bmm-route'); canvas.appendChild(path); });
    state.anchors.forEach((anchor, index) => {
      const group = document.createElementNS(svgNs, 'g'); const cx = anchor.x * innerWidth, cy = anchor.y * innerHeight;
      const circle = document.createElementNS(svgNs, 'circle'); circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', 16); circle.setAttribute('class', 'bmm-anchor'); group.appendChild(circle);
      const number = document.createElementNS(svgNs, 'text'); number.setAttribute('x', cx); number.setAttribute('y', cy + 4); number.setAttribute('class', 'bmm-label'); number.textContent = String(index + 1); group.appendChild(number);
      const tag = document.createElementNS(svgNs, 'rect'); tag.setAttribute('x', cx + 23); tag.setAttribute('y', cy - 28); tag.setAttribute('width', Math.max(90, anchor.name.length * 6.7)); tag.setAttribute('height', 23); tag.setAttribute('rx', 4); tag.setAttribute('class', 'bmm-tag'); group.appendChild(tag);
      const text = document.createElementNS(svgNs, 'text'); text.setAttribute('x', cx + 30); text.setAttribute('y', cy - 13); text.setAttribute('class', 'bmm-tagtext'); text.textContent = anchor.name; group.appendChild(text); canvas.appendChild(group);
    });
  }
  function exportBrief() { const data = { schema_version:'1.0', target_url:location.href, viewport:{width:innerWidth,height:innerHeight}, anchors:state.anchors, paths:state.paths, captured_at:new Date().toISOString() }; const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); link.download='bird-motion-brief.json'; link.click(); }
  function open() {
    if (state.overlay) return;
    const root = document.createElement('div'); root.id='bmm-root'; root.innerHTML = `<div id="bmm-panel"><h1>Bird Motion Mapper</h1><p>Click objects to pin anchors. Draw the flock's route directly over this page.</p><div class="bmm-row"><button data-mode="select" class="active">Select</button><button data-mode="anchor">Anchor</button><button data-mode="draw">Draw</button></div><button id="bmm-export" class="wide">Export motion brief</button><button id="bmm-close" class="wide" style="background:transparent;color:#b7d5e8">Close mapper</button></div><svg id="bmm-canvas"></svg>`;
    document.body.appendChild(root); state.overlay=root;
    root.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode=button.dataset.mode; root.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('active', item===button)); }));
    root.querySelector('#bmm-export').addEventListener('click', exportBrief); root.querySelector('#bmm-close').addEventListener('click', close);
    const canvas=root.querySelector('#bmm-canvas');
    canvas.addEventListener('pointerdown',(event)=>{ if(state.mode==='anchor'){ const p=getPoint(event); state.anchors.push({...p,name:elementName(event)}); render(); } if(state.mode==='draw'){state.drawing=[getPoint(event)]; canvas.setPointerCapture(event.pointerId);render();} });
    canvas.addEventListener('pointermove',(event)=>{ if(!state.drawing)return; const p=getPoint(event), last=state.drawing[state.drawing.length-1]; if(Math.hypot(p.x-last.x,p.y-last.y)>.008){state.drawing.push(p);render();} });
    canvas.addEventListener('pointerup',()=>{if(state.drawing?.length>2)state.paths.push({id:`path-${Date.now()}`,name:`Flight Path ${state.paths.length+1}`,points:state.drawing});state.drawing=null;render();});
    document.addEventListener('keydown', onEscape);
    render();
  }
  function onEscape(event){ if(event.key==='Escape') close(); }
  function close(){state.overlay?.remove();state.overlay=null;document.removeEventListener('keydown', onEscape);}
  window.BirdMotionMapper={open,close}; open();
})();
