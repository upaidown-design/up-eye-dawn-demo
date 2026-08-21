import registry from'../../../assets/manifest/visual-asset-registry.json'with{type:'json'};
const base=`${import.meta.env.BASE_URL}${registry.base_path.replace(/^\//,'')}`;
export const visualAssets=Object.fromEntries(registry.assets.map(asset=>[asset.id,{...asset,src:`${base}${asset.file}`}]))as Record<string,(typeof registry.assets)[number]&{src:string}>;
export{registry as visualAssetRegistry};
