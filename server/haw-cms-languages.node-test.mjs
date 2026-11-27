import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { JSDOM } from 'jsdom'

test('a sidebar language change saves the corresponding translation independently', async () => {
  const dutch=fs.readFileSync('public/haw/index.html','utf8')
  const english=fs.readFileSync('public/haw/en/index.html','utf8')
  const dom=new JSDOM(dutch,{url:'https://example.test/haw/',runScripts:'outside-only'})
  const {window}=dom, saves=[]
  window.navigator.sendBeacon=()=>true
  window.fetch=async(url,options={})=>{
    const target=new URL(url,window.location.href)
    if(target.pathname==='/haw/en/')return {ok:true,text:async()=>english}
    if(target.pathname.endsWith('/session'))return {ok:true,json:async()=>({authenticated:true})}
    if(target.pathname.endsWith('/content')&&options.method==='PUT'){saves.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true})}}
    if(target.pathname.endsWith('/content'))return {ok:true,json:async()=>({fields:[]})}
    throw new Error('Unexpected request '+target.pathname)
  }
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0))
  try {
    window.eval(fs.readFileSync('public/haw/cms.js','utf8'))
    await settle()
    window.document.querySelector('.haw-cms-entry').click();await settle()
    const field=[...window.document.querySelectorAll('.haw-cms-editable')].find(node=>node.textContent.trim()==='Van scherpe keuzes tot zichtbare resultaten.')
    assert.ok(field);field.click()
    const language=code=>[...window.document.querySelectorAll('.haw-cms-language')].find(node=>node.textContent===code)
    const textarea=()=>window.document.querySelector('.haw-cms-field textarea')
    textarea().value='Onopgeslagen tekst';textarea().dispatchEvent(new window.Event('input',{bubbles:true}))
    language('EN').click();await settle();await settle()
    assert.equal(textarea().value,'From sharp choices to visible results.')
    textarea().value='A separate English edit';textarea().dispatchEvent(new window.Event('input',{bubbles:true}))
    window.document.querySelector('.haw-cms-field .haw-cms-button').click();await settle()
    assert.equal(saves.length,1);assert.equal(saves[0].page,'en/');assert.equal(saves[0].base,'From sharp choices to visible results.');assert.equal(saves[0].value,'A separate English edit')
    assert.equal(field.textContent.trim(),'Van scherpe keuzes tot zichtbare resultaten.')
    language('NL').click();await settle();assert.equal(textarea().value,'Onopgeslagen tekst')
  } finally { dom.window.close() }
})

test('the statistics dashboard shows site-specific metrics and changes period', async () => {
  const html=fs.readFileSync('public/haw/admin/index.html','utf8')
  const dom=new JSDOM(html,{url:'https://example.test/haw/admin/',runScripts:'outside-only'})
  const {window}=dom,periods=[]
  window.fetch=async url=>{const target=new URL(url,window.location.href);if(target.pathname.endsWith('/session'))return {ok:true,json:async()=>({authenticated:true})};if(target.pathname.endsWith('/stats')){periods.push(Number(target.searchParams.get('days')));const metric={total:2,previous:1,series:[0,2]};return {ok:true,json:async()=>({metrics:{visitors:metric,views:metric,time:metric,cases:metric,contacts:metric},pages:[{path:'project/repanels/',views:2}]})}}throw new Error('Unexpected request '+target.pathname)}
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0))
  try{window.eval(fs.readFileSync('public/haw/cms.js','utf8'));await settle();await settle();assert.equal(window.document.querySelectorAll('.haw-stat').length,5);assert.equal(window.document.querySelectorAll('.haw-stat-sparkline').length,5);assert.match(window.document.querySelector('.haw-stats-top').textContent,/project\/repanels/);[...window.document.querySelectorAll('.haw-stats-range')].find(b=>b.dataset.days==='7').click();await settle();assert.deepEqual(periods,[30,7])}finally{dom.window.close()}
})
