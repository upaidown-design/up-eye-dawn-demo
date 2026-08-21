export const postMoney=(investment,preMoney)=>investment+preMoney;
export const investorOwnership=(investment,preMoney)=>investment/postMoney(investment,preMoney);
export const inversePreMoney=(investment,maxDilution)=>investment*(1-maxDilution)/maxDilution;
export const currentShareholderRetention=(investment,preMoney,futureDilution=0,optionPool=0)=>(1-investorOwnership(investment,preMoney))*(1-futureDilution)*(1-optionPool);
export const runwayMonths=(capital,averageMonthlyBurn)=>capital/averageMonthlyBurn;
export const scenarioCoverage=(capital,scenarioCapital)=>capital/scenarioCapital;

export const tickets=[500000,750000,1000000,1500000];
export const referenceTickets=[400000,1660000];
export const preMoneyCases=[4000000,5000000,6000000,7500000,10000000];
export const dilutionCaps=[0.10,0.125,0.15,0.175,0.20];
export const futureDilutionCases=[0.15,0.20,0.25];
export const optionPoolCases=[0,0.05,0.10];
