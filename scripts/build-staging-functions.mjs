import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
export const stagingFunctions=['get-student-classes','get-teacher-dashboard','get-school-admin-overview'];
export async function buildStagingFunctions(output) {
  const lock=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));
  if(lock.packages['node_modules/@supabase/supabase-js'].version!=='2.118.0')throw Error('review_staging_sdk_pin');
  const records=[];
  const egress=await readFile(path.join(root,'tests/fixtures/staging-egress.js'),'utf8');
  for(const name of stagingFunctions) {
    const result=await build({absWorkingDir:root,entryPoints:[`supabase/functions/${name}/index.ts`],bundle:true,
      platform:'browser',format:'esm',target:'es2022',write:false,metafile:true,legalComments:'eof',banner:{js:egress},
      plugins:[{name:'reviewed-offline-sdk',setup(plugin){plugin.onResolve({filter:/^npm:/},async args=>{
        if(!['npm:@supabase/supabase-js@2','npm:@supabase/supabase-js@2.118.0'].includes(args.path))throw Error('unreviewed_staging_dependency');
        return plugin.resolve('@supabase/supabase-js',{resolveDir:root,kind:'import-statement'});
      });}}]});
    if(Object.values(result.metafile.outputs).some(x=>x.imports.length))throw Error('staging_bundle_must_be_offline');
    const bytes=result.outputFiles[0].contents;
    await mkdir(path.join(output,name),{recursive:true});await writeFile(path.join(output,name,'index.ts'),bytes);
    // Containers drop DAC override; only non-secret code is mounted readable.
    await chmod(path.join(output,name),0o755);await chmod(path.join(output,name,'index.ts'),0o644);
    const inputs={};for(const input of Object.keys(result.metafile.inputs).sort())inputs[input]=createHash('sha256').update(await readFile(path.join(root,input))).digest('hex');
    inputs['tests/fixtures/staging-egress.js']=createHash('sha256').update(egress).digest('hex');
    records.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),inputs,sdkVersion:'2.118.0'});
  }
  await mkdir(path.join(output,'gateway'),{recursive:true});
  await writeFile(path.join(output,'gateway/index.ts'),await readFile(path.join(root,'tests/fixtures/staging-gateway.ts')));
  await chmod(path.join(output,'gateway'),0o755);await chmod(path.join(output,'gateway/index.ts'),0o644);
  await writeFile(path.join(output,'source-manifest.json'),JSON.stringify(records,null,2)+'\n');
  return records;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==3)throw Error('Expected owned temporary output directory');
  await buildStagingFunctions(path.resolve(process.argv[2]));
  console.log('Built three offline local function bundles from unchanged application source.');
}
