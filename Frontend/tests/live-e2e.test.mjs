import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3002';
async function request(path, body) {
 const response = await fetch(base + path, {method:body ? 'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 return response;
}
test('frontend HTML loads',async()=>{const r=await request('/');assert.equal(r.status,200);assert.match(await r.text(),/id="root"/);});
test('Cesium workers are JavaScript, never SPA fallback HTML',async()=>{const r=await request('/cesium/Workers/createGeometry.js');assert.equal(r.status,200);const text=await r.text();assert.doesNotMatch(text,/<!doctype html>/i);assert.match(text,/Cesium/);});
test('Cesium credit image loads as image',async()=>{const r=await request('/cesium/Assets/Images/ion-credit.png');assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/image/);});
test('discovery → regional filter → evidence → comparison through frontend proxy',async()=>{
 const metadata=await request('/api/v1/objectives');assert.equal(metadata.status,200);assert.ok((await metadata.json()).data.objectives.general);
 const body={targetId:'mars_jezero',objective:'general',limit:100};
 let r=await request('/api/v1/discovery/search',body);assert.equal(r.status,200);const all=(await r.json()).data;assert.ok(all.length>0);
 r=await request('/api/v1/discovery/search',{...body,region:'egypt'});assert.equal(r.status,200);const sites=(await r.json()).data;assert.ok(sites.length>=2);assert.ok(sites.length<all.length);
 const ids=sites.slice(0,2).map(x=>x.earth_id);
 for(const site of sites){assert.ok(site.details.coordinate.latitude>=22&&site.details.coordinate.latitude<=31.7);}
 r=await request(`/api/v1/candidates/${ids[0]}?targetId=mars_jezero&objective=general`);assert.equal(r.status,200);assert.equal((await r.json()).data.id,ids[0]);
 r=await request('/api/v1/comparisons',{targetId:'mars_jezero',objective:'general',candidateIds:ids});assert.equal(r.status,200);assert.deepEqual((await r.json()).data.map(x=>x.id),ids);
 r=await request('/api/v1/discovery/search',{...body,targetId:'missing_target'});assert.equal(r.status,400);
});
test('Moon target discovery works',async()=>{const r=await request('/api/v1/discovery/search',{targetId:'moon_malapert',objective:'crew_operations',limit:3});assert.equal(r.status,200);assert.ok((await r.json()).data.length);});
test('local assistant and guardrail rejection work',async()=>{
 let r=await request('/api/v1/agent/query',{text:'Find Mars rover analog sites in Egypt for Jezero'});assert.equal(r.status,200);assert.ok((await r.json()).picks.length);
 r=await request('/api/v1/agent/query',{text:'سسسس'});assert.equal(r.status,400);
});
test('target selection changes the ranked map shortlist',async()=>{
 const search=async targetId=>{const r=await request('/api/v1/discovery/search',{targetId,objective:'general',limit:12});assert.equal(r.status,200);return (await r.json()).data;};
 const mars=await search('mars_jezero'),moon=await search('moon_connecting_ridge');
 assert.equal(mars.length,12);assert.equal(moon.length,12);
 assert.notDeepEqual(mars.map(x=>x.earth_id),moon.map(x=>x.earth_id));
 assert.notDeepEqual(mars.map(x=>[x.earth_id,x.score_pct]),moon.map(x=>[x.earth_id,x.score_pct]));
});
test('running discovery component uses the target-specific shortlist',async()=>{
 const route=await request('/src/pages/DiscoveryPage.tsx');assert.equal(route.status,200);
 const source=await route.text();const match=source.match(/import LiveResearchPage from "([^"]+)"/);
 assert.ok(match,'Vite discovery route must import LiveResearchPage');
 const component=await request(match[1]);assert.equal(component.status,200);
 const code=await component.text();assert.match(code,/limit:\s*12/);assert.match(code,/discovery-results-summary/);
});
