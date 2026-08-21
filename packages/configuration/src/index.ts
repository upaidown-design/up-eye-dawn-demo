import truth from'../../../source-of-truth/new-york-2026.json'with{type:'json'};
import financialModel from'../../../financial/model-v1.json'with{type:'json'};
import roundDecision from'../../../financial/round-decision-v1.json'with{type:'json'};
export{truth,financialModel,roundDecision};
export const brand={companyName:truth.company.display_name,legalName:truth.company.legal_name,productName:'Autonomous Field Intelligence',roverProductName:truth.terminology.rover,roverNameStatus:'COMMERCIAL_NAME_DECISION_PENDING',tagline:'Observe. Investigate. Measure. Learn.',defaultLocale:'en',investorUrl:'/investor/',contactEmail:'[CONTACT_REQUIRED]',colors:{background:'#07100f',surface:'#0d1916',surfaceRaised:'#13231e',text:'#edf7f1',muted:'#8ea49a',accent:'#b9f36a',cyan:'#52d9c2',warning:'#f1c56a',danger:'#ed786e'}} as const;
