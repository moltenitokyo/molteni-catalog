import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit3, Trash2, X, Upload, ExternalLink, RefreshCw, 
  FileText, ArrowRight, Wifi, WifiOff, Loader, Link as LinkIcon, 
  Check, ChevronLeft, PlayCircle, ShoppingBag, Code, Image as ImageIcon,
  Search, Filter, LayoutGrid, List, Layers // Layersアイコン追加
} from 'lucide-react';

// --- 設定エリア ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const STORAGE_BUCKET = 'product-images'; 
const STORAGE_URL = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/` : '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// お問い合わせ先URL
const CONTACT_URL = "https://www.molteni.co.jp/contact/"; 

// テーマ定数
const THEME = {
  bg: '#ffffff', 
  text: '#37393b', 
  serif: '"Libre Bodoni", "Bodoni W01 Roman", serif', 
  sans: '"Helvetica Neue", Helvetica, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Arial, sans-serif',
};

// ---------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${STORAGE_URL}${path}`;
};

const makeAutoplayAndLoop = (html) => {
  if (!html) return null;
  return html.replace(/src="([^"]+)"/, (match, url) => {
    const separator = url.includes('?') ? '&' : '?';
    return `src="${url}${separator}autoplay=1&muted=1&playsinline=1&loop=1"`;
  });
};

const sortLinks = (links) => {
  if (!Array.isArray(links)) return [];
  const order = { 'detail': 1, 'price': 2, 'product': 3 };
  return [...links].sort((a, b) => (order[a.type] || 2) - (order[b.type] || 2));
};

// ---------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------
export default function App() {
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('loading'); 
  const [currentProduct, setCurrentProduct] = useState(null);
  
  // ★ コレクションビュー用のState
  const [currentCollection, setCurrentCollection] = useState(null);

  const [status, setStatus] = useState('Init...');
  const [baseUrl, setBaseUrl] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollection, setFilterCollection] = useState('All');
  const [layoutMode, setLayoutMode] = useState('list'); 

  const mainImageInputRef = useRef(null);
  const secondImageInputRef = useRef(null);

  useEffect(() => {
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name=${name}]`);
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Libre+Bodoni:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    document.body.style.backgroundColor = THEME.bg;
    document.body.style.fontFamily = THEME.serif;
    document.body.style.margin = '0';
    
    setBaseUrl(window.location.href.split('?')[0]);
    if (!supabase) { setStatus('No API Key'); setView('admin'); return; }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setStatus('Syncing...');
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (error) { console.error(error); setStatus('Error'); }
    else { setProducts(data || []); setStatus('Online'); checkRouting(data || []); }
  };

  const checkRouting = (data) => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const colParam = params.get('collection'); // ★ URLからコレクション名を取得

    if (idParam) {
      const target = data.find(p => p.id === parseInt(idParam));
      target ? openProduct(target) : setView('admin');
    } else if (colParam) {
      // ★ コレクション用のURLだった場合
      setCurrentCollection(colParam);
      setView('collection');
    } else {
      setView('admin');
    }
  };

  const openProduct = (p) => { setCurrentProduct(p); setView('product'); };
  
  const openEditor = (p) => {
    let links = [];
    if (p && Array.isArray(p.links)) links = p.links;
    else if (p && p.links && typeof p.links === 'object') {
       if (p.links.priceUrl) links.push({ type: 'price', url: p.links.priceUrl });
       if (p.links.detailsUrl) links.push({ type: 'detail', url: p.links.detailsUrl });
    }
    
    setCurrentProduct(p ? { ...p, links } : {
      name: '', collection: '', designer: '', price: '', description: '',
      links: [], videoUrl: '', image: '', secondImage: ''
    });
    setView('editor');
  };

  const handleUpload = async (file, targetField) => {
    if (!file) return;
    const name = `${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(name, file);
    if (!error) {
      setCurrentProduct(prev => ({ ...prev, [targetField]: name }));
    } else {
      alert('Upload Error');
    }
  };

  const handleCopyLink = (text, idForFeedback) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(idForFeedback);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  // ---------------------------------------------------------
  // サブビュー: Collection Page (★新規追加: コレクションまとめ画面)
  // ---------------------------------------------------------
  if (view === 'collection' && currentCollection) {
    // 該当コレクションの製品だけを抽出
    const colProducts = products.filter(p => p.collection === currentCollection);

    return (
      <div className="fixed inset-0 w-full h-full bg-[#f5f5f5] md:bg-[#e5e5e5] flex justify-center items-center z-[100]">
        
        {/* お問い合わせボタン (固定) */}
        <a href={CONTACT_URL} target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: 'rgba(55, 57, 59, 0.9)', color: '#ffffff', padding: '14px 20px', borderRadius: '0', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', fontFamily: THEME.sans, zIndex: 9999, backdropFilter: 'blur(4px)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'background-color 0.3s' }}>
          <span>製品についてお問い合わせ</span>
        </a>

        <div className="relative w-full h-full md:w-[414px] md:h-[850px] md:max-h-[95vh] bg-white md:rounded-[40px] md:border-[12px] md:border-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col font-serif" style={{color: THEME.text}}>
          <div className="w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar bg-white flex flex-col relative z-10">
            
            {!window.location.search.includes('collection=') && (
               <button onClick={() => window.location.href = baseUrl} className="absolute top-6 left-6 z-50 bg-white/90 backdrop-blur w-10 h-10 flex items-center justify-center border border-gray-200 shadow-sm hover:bg-black hover:text-white transition-all">
                 <ChevronLeft size={18} />
               </button>
            )}

            {/* コレクションのトップヘッダー */}
            <div style={{ padding: '60px 24px 40px 24px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontFamily: THEME.sans, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', color: '#86868B', textTransform: 'uppercase' }}>COLLECTION</span>
              <h1 style={{ fontFamily: THEME.serif, fontSize: '38px', fontWeight: 'normal', margin: '16px 0 0 0', textTransform: 'uppercase' }}>{currentCollection}</h1>
            </div>

            {/* コレクション内の製品リスト */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {colProducts.map((p, index) => {
                const sortedLinks = sortLinks(p.links);
                return (
                  <div key={p.id} style={{ borderBottom: index !== colProducts.length - 1 ? '10px solid #f5f5f5' : 'none', paddingBottom: '40px' }}>
                    <img src={getImageUrl(p.image)} alt={p.name} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                    
                    <div style={{ padding: '32px 24px 0 24px', textAlign: 'center' }}>
                      <h2 style={{ fontFamily: THEME.serif, fontSize: '28px', fontWeight: 'normal', margin: '0 0 8px 0' }}>{p.name}</h2>
                      {p.designer && (
                        <p style={{ fontFamily: THEME.serif, fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#86868B', textTransform: 'uppercase', margin: '0 0 24px 0' }}>
                          Design : {p.designer}
                        </p>
                      )}

                      {/* ボタンエリア */}
                      <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                        {sortedLinks.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noreferrer" style={{ flex: 1, height: '48px', backgroundColor: '#F2F2F2', color: THEME.text, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', border: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: THEME.sans }}>
                                {link.type === 'price' ? 'Price' : link.type === 'product' ? 'Product' : 'Detail'}
                              </span>
                              {link.type === 'product' ? <ShoppingBag size={12}/> : link.type === 'price' ? <FileText size={12}/> : <ArrowRight size={12}/>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {colProducts.length === 0 && (
                <div style={{ padding: '80px 20px', textAlign: 'center', color: '#86868B', fontSize: '12px', fontFamily: THEME.sans }}>
                  NO PRODUCTS FOUND IN THIS COLLECTION.
                </div>
              )}
            </div>

            <div style={{ height: '80px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // サブビュー: Product Page (単体)
  // ---------------------------------------------------------
  if (view === 'product' && currentProduct) {
    const videoHtml = makeAutoplayAndLoop(currentProduct.videoUrl);
    const sortedLinks = sortLinks(currentProduct.links);
    const hasBottomContent = videoHtml || currentProduct.secondImage;

    return (
      <div className="fixed inset-0 w-full h-full bg-[#f5f5f5] md:bg-[#e5e5e5] flex justify-center items-center z-[100]">
        
        <a 
        href={`mailto:info@molteni.jp?subject=【「${currentProduct.name}」についてのお問い合わせ】`} 
        target="_blank" 
        rel="noreferrer"
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            backgroundColor: 'rgba(55, 57, 59, 0.9)', 
            color: '#ffffff',
            padding: '14px 20px', 
            borderRadius: '0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.05em', 
            fontFamily: THEME.sans,
            zIndex: 9999, 
            backdropFilter: 'blur(4px)', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            transition: 'background-color 0.3s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(55, 57, 59, 1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(55, 57, 59, 0.9)'}
        >
          <span>製品についてお問い合わせ</span>
        </a>

        <div className="relative w-full h-full md:w-[414px] md:h-[850px] md:max-h-[95vh] bg-white md:rounded-[40px] md:border-[12px] md:border-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col font-serif" style={{color: THEME.text}}>
          
          <div className="w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar bg-white flex flex-col relative z-10">
            
            {!window.location.search.includes('id=') && (
               <button onClick={() => window.location.href = baseUrl} className="absolute top-6 left-6 z-50 bg-white/90 backdrop-blur w-10 h-10 flex items-center justify-center border border-gray-200 shadow-sm hover:bg-black hover:text-white transition-all">
                 <ChevronLeft size={18} />
               </button>
            )}
            
            <div className="w-full relative shrink-0">
              <img 
                src={getImageUrl(currentProduct.image) || "https://via.placeholder.com/1080x1920"} 
                alt={currentProduct.name} 
                className="block w-full h-auto max-w-full"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div className="px-8 py-10 flex flex-col grow bg-white">
              
              <div style={{ marginBottom: '24px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h1 style={{
                  fontFamily: THEME.serif,
                  fontSize: '36px',
                  lineHeight: '1',
                  fontWeight: 'normal',
                  margin: '32px 0 12px 0',
                  color: THEME.text,
                  wordBreak: 'break-word'
                }}>
                  {currentProduct.name}
                </h1>

                <div style={{
                  fontFamily: THEME.serif,
                  fontSize: '12px',
                  fontWeight: 'normal',
                  letterSpacing: '0.1em',
                  color: THEME.text,
                  textTransform: 'uppercase',
                  marginBottom: '20px', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontWeight: 'bold' }}>{currentProduct.collection}</span>
                  {currentProduct.designer && (
                    <span style={{ fontSize: '11px', opacity: 1, fontWeight: 'bold' }}>
                      Design : {currentProduct.designer.toUpperCase()}
                    </span>
                  )}
                </div>

                <p style={{
                  fontFamily: THEME.sans,
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: THEME.text,
                  fontWeight: '400',
                  margin: '0 auto',
                  textAlign: 'center',
                  width: '88%',
                  maxWidth: '500px'
                }}>
                  {currentProduct.description}
                </p>
              </div>

              <div style={{ 
                marginTop: 'auto', 
                paddingBottom: '24px', 
                display: 'flex', 
                width: '100%', 
                gap: '8px' 
              }}>
                {sortedLinks.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{
                      flex: 1,                 
                      height: '52px',          
                      backgroundColor: '#F2F2F2', 
                      color: THEME.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center', 
                      textDecoration: 'none',   
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E5E5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F2F2F2'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: THEME.sans }}>
                        {link.type === 'price' ? 'Price' : link.type === 'product' ? 'Product' : 'Detail'}
                      </span>
                      {link.type === 'product' ? <ShoppingBag size={13} color={THEME.text}/> : link.type === 'price' ? <FileText size={13} color={THEME.text}/> : <ArrowRight size={13} color={THEME.text}/>}
                    </div>
                  </a>
                ))}
              </div>

              {hasBottomContent && (
                <div style={{ marginTop: '24px', paddingTop: '0', borderTop: 'none', width: '100%', overflow: 'hidden' }}>
                  {videoHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: videoHtml }} className="w-full [&>iframe]:w-full [&>iframe]:h-auto relative z-0" />
                  ) : (
                    <img 
                      src={getImageUrl(currentProduct.secondImage)} 
                      alt="Second View" 
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  )}
                </div>
              )}
              
              <div style={{ height: '80px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // サブビュー: Editor
  // ---------------------------------------------------------
  if (view === 'editor') {
    const EditorLinkRow = ({ link, idx }) => {
      const update = (k, v) => {
        const n = [...currentProduct.links]; n[idx][k] = v; setCurrentProduct({ ...currentProduct, links: n });
      };
      return (
        <div className="flex gap-2 items-center bg-gray-50 p-2 border border-gray-100">
          <select value={link.type} onChange={e => update('type', e.target.value)} className="bg-white border border-gray-300 text-[10px] uppercase font-bold p-2 w-24">
            <option value="detail">Detail</option><option value="price">Price</option><option value="product">Product</option>
          </select>
          <input value={link.url} onChange={e => update('url', e.target.value)} placeholder="https://..." className="flex-1 bg-transparent text-sm px-2"/>
          <button onClick={() => { const n = currentProduct.links.filter((_, i) => i !== idx); setCurrentProduct({...currentProduct, links: n}); }} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
        </div>
      );
    };

    return (
      <div className="min-h-screen p-6 bg-[#f5f5f5] flex justify-center font-sans text-black">
        <div className="w-full max-w-2xl pb-20">
          <div className="flex justify-between items-center mb-6 border-b border-black/10 pb-4">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Edit Product</h2>
            <button onClick={() => setView('admin')}><X size={24} className="opacity-50 hover:opacity-100"/></button>
          </div>
          
          <div className="space-y-8">
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase block mb-2">Main Image</label>
              <div className="cursor-pointer border border-dashed border-gray-300 bg-white hover:border-black min-h-[200px] flex flex-col items-center justify-center relative" onClick={() => mainImageInputRef.current.click()}>
                {currentProduct.image ? <img src={getImageUrl(currentProduct.image)} className="w-full h-auto" /> : <div className="text-center opacity-40 py-10"><Upload className="mx-auto mb-2"/><span className="text-[10px] uppercase tracking-widest">Upload Image</span></div>}
                <input ref={mainImageInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], 'image')}/>
              </div>
            </div>

            <div className="space-y-4">
              <input value={currentProduct.collection} onChange={e => setCurrentProduct({...currentProduct, collection: e.target.value})} placeholder="Collection (e.g. Chair)" className="w-full border-b border-gray-300 py-2 text-sm outline-none bg-transparent"/>
              <input value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} placeholder="Product Name (e.g. Lia)" className="w-full border-b border-gray-300 py-2 text-xl font-serif outline-none bg-transparent"/>
              <input value={currentProduct.designer || ''} onChange={e => setCurrentProduct({...currentProduct, designer: e.target.value})} placeholder="Designer (e.g. Gio Ponti)" className="w-full border-b border-gray-300 py-2 text-sm outline-none bg-transparent"/>
              <textarea value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} placeholder="Description" className="w-full bg-white p-3 text-sm h-32 border border-gray-200 resize-none font-serif"/>
            </div>

            <div className="bg-white p-5 border border-black/5">
              <h3 className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase mb-4">Bottom Media (Video OR Image)</h3>
              <div className="flex gap-2 mb-6">
                <Code size={16} className="opacity-30 mt-1"/>
                <textarea value={currentProduct.videoUrl || ''} onChange={e => setCurrentProduct({...currentProduct, videoUrl: e.target.value})} placeholder='Paste Video Embed Code (<iframe...)' className="w-full bg-gray-50 p-2 text-xs h-20 font-mono"/>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <label className="text-[9px] text-gray-400 block mb-2">If no video is provided, this image will be shown:</label>
                <div className="cursor-pointer border border-dashed border-gray-200 bg-gray-50 hover:border-black min-h-[100px] flex flex-col items-center justify-center relative" onClick={() => secondImageInputRef.current.click()}>
                  {currentProduct.secondImage ? <img src={getImageUrl(currentProduct.secondImage)} className="w-full h-auto max-h-[200px] object-contain" /> : <div className="text-center opacity-40"><ImageIcon className="mx-auto mb-1" size={16}/><span className="text-[9px] uppercase tracking-widest">Upload 2nd Image</span></div>}
                  <input ref={secondImageInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], 'secondImage')}/>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 border border-black/5 space-y-4">
              <div className="flex justify-between"><h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40">Buttons</h3><button onClick={() => setCurrentProduct({...currentProduct, links: [...currentProduct.links, {type:'detail', url:''}]})} className="text-[10px] font-bold uppercase flex items-center gap-1 hover:text-blue-600"><Plus size={12}/> Add</button></div>
              {currentProduct.links.map((l, i) => <EditorLinkRow key={i} link={l} idx={i} />)}
            </div>

            <button onClick={async () => {
              const { id, created_at, ...data } = currentProduct;
              const q = id ? supabase.from('products').update(data).eq('id', id) : supabase.from('products').insert([data]);
              await q; fetchProducts(); setView('admin');
            }} className="w-full py-4 bg-black text-white text-xs tracking-[0.3em] uppercase font-bold hover:opacity-90">SAVE PRODUCT</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // サブビュー: Admin
  // ---------------------------------------------------------
  
  const uniqueCollections = ['All', ...new Set(products.map(p => p.collection).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchCollection = filterCollection === 'All' || p.collection === filterCollection;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (p.collection && p.collection.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCollection && matchSearch;
  });

  return (
    <div className="min-h-screen font-sans text-black bg-[#f5f5f5]">
      
      <header className="px-8 py-6 border-b border-black/5 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur z-20">
        <h1 className="text-sm font-bold tracking-[0.25em]">MOLTENI <span className="opacity-40">CATALOG</span></h1>
        
        <div className="flex gap-4 items-center">
          <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${status === 'Online' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status === 'Online' ? <Wifi size={12}/> : <WifiOff size={12}/>} {status}
          </div>
          <button onClick={fetchProducts} className="p-2 opacity-30 hover:opacity-100"><RefreshCw size={14}/></button>
          <button onClick={() => openEditor(null)} className="bg-black text-white px-5 py-2 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-800 flex gap-2 transition-colors">
            <Plus size={14}/> Add New
          </button>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-8 py-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-black/5 bg-[#f5f5f5]">
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm outline-none focus:border-black transition-colors rounded-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="opacity-30" />
            <select 
              value={filterCollection} 
              onChange={(e) => setFilterCollection(e.target.value)}
              className="w-full md:w-48 bg-white border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black transition-colors rounded-none cursor-pointer"
            >
              {uniqueCollections.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            
            {/* ★ コレクションリンクコピーボタン (フィルター選択時のみ表示) */}
            {filterCollection !== 'All' && (
              <div className="flex gap-1 ml-2">
                <button 
                  onClick={() => window.open(`${baseUrl}?collection=${encodeURIComponent(filterCollection)}`, '_blank')}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors rounded-sm"
                  title="Preview Collection"
                >
                  <Layers size={12}/> <span className="hidden md:inline">Preview</span>
                </button>
                <button 
                  onClick={() => handleCopyLink(`${baseUrl}?collection=${encodeURIComponent(filterCollection)}`, 'col-' + filterCollection)}
                  className={`px-3 py-2 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors rounded-sm ${copyFeedback === 'col-' + filterCollection ? 'bg-green-100 text-green-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {copyFeedback === 'col-' + filterCollection ? <Check size={12}/> : <LinkIcon size={12}/>}
                  <span className="hidden md:inline">{copyFeedback === 'col-' + filterCollection ? 'COPIED!' : 'COPY LINK'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center bg-gray-200 p-1 rounded-sm shrink-0">
          <button 
            onClick={() => setLayoutMode('list')} 
            className={`p-1.5 transition-all ${layoutMode === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
            title="List View"
          >
            <List size={16} />
          </button>
          <button 
            onClick={() => setLayoutMode('grid')} 
            className={`p-1.5 transition-all ${layoutMode === 'grid' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
        </div>

      </div>

      <main className="p-8 max-w-[1800px] mx-auto">
        {view === 'loading' && <div className="text-center py-20 text-xs tracking-widest opacity-40"><Loader className="animate-spin inline-block mr-2" size={14}/>LOADING SYSTEM...</div>}
        
        {layoutMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white border border-black/5 group hover:shadow-lg transition duration-500 flex flex-col">
                <div className="aspect-[4/3] relative overflow-hidden border-b border-black/5 bg-gray-50 cursor-pointer" onClick={() => openEditor(p)}>
                  <img src={getImageUrl(p.image)} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Edit3 size={20} color="white"/>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[9px] font-bold tracking-[0.2em] opacity-40 uppercase mb-1 truncate">{p.collection}</p>
                  <h3 className="text-base font-serif mb-4 line-clamp-2 leading-snug">{p.name}</h3>
                  <div className="mt-auto pt-3 border-t border-black/5 flex justify-between items-center">
                     <button onClick={() => window.open(`${baseUrl}?id=${p.id}`, '_blank')} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity">
                       <ExternalLink size={12}/> Preview
                     </button>
                     <button onClick={() => handleCopyLink(`${baseUrl}?id=${p.id}`, p.id)} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${copyFeedback === p.id ? 'text-green-600 opacity-100' : 'opacity-50 hover:opacity-100'}`}>
                       {copyFeedback === p.id ? <Check size={12}/> : <LinkIcon size={12}/>}
                       {copyFeedback === p.id ? 'COPIED!' : 'COPY LINK'}
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProducts.map(p => (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-black/5 p-3 hover:shadow-md transition-shadow duration-300">
                
                <div className="w-16 h-16 shrink-0 bg-gray-100 relative group cursor-pointer" onClick={() => openEditor(p)}>
                  <img src={getImageUrl(p.image)} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Edit3 size={12} color="white"/>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase truncate">{p.collection}</p>
                    {p.designer && <p className="text-[9px] opacity-30 truncate">/ {p.designer.toUpperCase()}</p>}
                  </div>
                  <h3 className="text-base font-serif truncate" style={{fontFamily: THEME.serif}}>{p.name}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0 md:justify-end">
                  <button onClick={() => window.open(`${baseUrl}?id=${p.id}`, '_blank')} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
                    <ExternalLink size={12}/> View
                  </button>
                  <button onClick={() => handleCopyLink(`${baseUrl}?id=${p.id}`, p.id)} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${copyFeedback === p.id ? 'bg-green-50 text-green-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    {copyFeedback === p.id ? <Check size={12}/> : <LinkIcon size={12}/>} Copy
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-1 hidden md:block"></div>
                  <button onClick={() => openEditor(p)} className="p-2 text-gray-400 hover:text-black transition-colors"><Edit3 size={14}/></button>
                  <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('products').delete().eq('id', p.id); fetchProducts(); } }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {view !== 'loading' && filteredProducts.length === 0 && (
          <div className="text-center py-20 text-xs tracking-widest opacity-40">NO PRODUCTS FOUND.</div>
        )}
      </main>
    </div>
  );
}