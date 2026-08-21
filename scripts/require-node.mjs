const expected='24.18.0';
const actual=process.versions.node;
if(actual!==expected){
  console.error(`UP-EYE-DAWN runtime requires Node ${expected}; found ${actual}.`);
  console.error('Use `.nvmrc` / `.node-version`, or run the presentation through `pnpm demo:up` (Docker).');
  process.exit(1);
}
console.log(`Node ${actual} verified.`);
