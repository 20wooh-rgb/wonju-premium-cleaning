async function loadGallery(){
  const res = await fetch('data/gallery.json', {cache:'no-store'});
  const data = await res.json();
  const items = data.items || [];

  // Always include placeholder category
  const placeholderCats = ['물류센터 전경(추가 예정)'];
  const categories = Array.from(new Set(items.map(i=>i.category).concat(placeholderCats)));

  const filtersEl = document.getElementById('filters');
  const gridEl = document.getElementById('grid');
  const searchEl = document.getElementById('search');
  const emptyNotice = document.getElementById('emptyNotice');

  let active = '전체';
  let query = '';
  let currentList = [];
  let currentIndex = 0;

  function buildFilters(){
    const all = ['전체', ...categories];
    filtersEl.innerHTML = '';
    all.forEach(cat=>{
      const btn = document.createElement('button');
      btn.className = 'chip' + (cat===active ? ' active':'');
      btn.textContent = cat;
      btn.type='button';
      btn.addEventListener('click', ()=>{
        active = cat;
        document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
      filtersEl.appendChild(btn);
    });
  }

  function passes(item){
    const inCat = (active==='전체') || (item.category===active);
    if(!inCat) return false;
    if(!query) return true;
    const q = query.toLowerCase();
    return (item.category||'').toLowerCase().includes(q) || (item.title||'').toLowerCase().includes(q) || (item.file||'').toLowerCase().includes(q);
  }

  function render(){
    const filtered = items.filter(passes);
    currentList = filtered;

    if(active==='물류센터 전경(추가 예정)'){
      emptyNotice.classList.remove('hidden');
      emptyNotice.textContent = '물류센터 전경 사진은 추후 추가 예정입니다. (폴더에 사진 추가 후 gallery.json에 항목만 넣으면 바로 반영)';
    } else if(filtered.length===0){
      emptyNotice.classList.remove('hidden');
      emptyNotice.textContent = '해당 조건의 사진이 아직 없습니다. (카테고리/검색어를 바꿔보세요)';
    } else {
      emptyNotice.classList.add('hidden');
      emptyNotice.textContent = '';
    }

    gridEl.innerHTML = '';
    if(active==='물류센터 전경(추가 예정)') return;

    filtered.forEach((it, idx)=>{
      const card = document.createElement('article');
      card.className = 'card';
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.setAttribute('aria-label', `${it.category} 사진 보기`);
      card.innerHTML = `
        <img loading="lazy" src="images/thumb/${it.file}" alt="${it.title || it.category}" />
        <div class="info">
          <div class="title">${escapeHtml(it.title || '')}</div>
          <div class="meta">${escapeHtml(it.category || '')}</div>
        </div>`;
      card.addEventListener('click', ()=>openLightbox(idx));
      card.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openLightbox(idx); }
      });
      gridEl.appendChild(card);
    });
  }

  // Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbTitle = document.getElementById('lbTitle');
  const lbMeta = document.getElementById('lbMeta');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');

  function openLightbox(idx){
    currentIndex = idx;
    const it = currentList[currentIndex];
    if(!it) return;
    lbImg.src = `images/full/${it.file}`;
    lbImg.alt = it.title || it.category || '';
    lbTitle.textContent = it.title || '';
    lbMeta.textContent = it.category || '';
    lb.classList.remove('hidden');
    document.body.style.overflow='hidden';
  }
  function closeLightbox(){
    lb.classList.add('hidden');
    document.body.style.overflow='';
    lbImg.src='';
  }
  function nav(delta){
    if(!currentList.length) return;
    currentIndex = (currentIndex + delta + currentList.length) % currentList.length;
    openLightbox(currentIndex);
  }
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', ()=>nav(-1));
  lbNext.addEventListener('click', ()=>nav(1));
  lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLightbox(); });
  window.addEventListener('keydown', (e)=>{
    if(lb.classList.contains('hidden')) return;
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') nav(-1);
    if(e.key==='ArrowRight') nav(1);
  });

  // Search
  searchEl.addEventListener('input', ()=>{
    query = (searchEl.value||'').trim();
    render();
  });

  buildFilters();
  render();
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
}
loadGallery().catch(err=>{
  console.error(err);
  const n = document.getElementById('emptyNotice');
  n.classList.remove('hidden');
  n.textContent = '갤러리 데이터를 불러오지 못했습니다. (파일 경로를 확인해주세요)';
});
