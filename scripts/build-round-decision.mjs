import fs from'node:fs/promises';
import path from'node:path';
import{fileURLToPath}from'node:url';
import{tickets,referenceTickets,preMoneyCases,dilutionCaps,futureDilutionCases,optionPoolCases,investorOwnership,inversePreMoney,currentShareholderRetention,runwayMonths,scenarioCoverage}from'./round-decision-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const model=JSON.parse(await fs.readFile(path.join(root,'financial/model-v1.json'),'utf8'));
const scenario=Object.fromEntries(model.scenarios.map(x=>[x.id,x]));
const base=scenario.BASE,lean=scenario.LEAN,accelerated=scenario.ACCELERATED;
const status=['FULL','PARTIAL','MINIMAL','NOT FUNDED'];
const capitalTable=[
  {capital:500000,runway:runwayMonths(500000,lean.average_monthly_burn_m1_m15),comparison:'LEAN',coverage:scenarioCoverage(500000,lean.capital_with_buffer),sentinel:'FULL',rover:'FULL',ai_data:'MINIMAL',field_pilots:'PARTIAL',team:'FULL',china:'FULL',legal_ip:'FULL',buffer:'MINIMAL',next_round_risk:'HIGH',assessment:'Funds Lean with a narrow surplus; Base is not funded.',probability_base_milestones:'LOW'},
  {capital:750000,runway:runwayMonths(750000,base.average_monthly_burn_m1_m15),comparison:'BASE',coverage:scenarioCoverage(750000,base.capital_with_buffer),sentinel:'FULL',rover:'FULL',ai_data:'PARTIAL',field_pilots:'PARTIAL',team:'PARTIAL',china:'FULL',legal_ip:'FULL',buffer:'MINIMAL',next_round_risk:'MEDIUM_HIGH',assessment:'Efficient only with explicit deferrals; €137,629 short of Base.',probability_base_milestones:'MEDIUM'},
  {capital:1000000,runway:runwayMonths(1000000,base.average_monthly_burn_m1_m15),comparison:'BASE',coverage:scenarioCoverage(1000000,base.capital_with_buffer),sentinel:'FULL',rover:'FULL',ai_data:'FULL',field_pilots:'FULL',team:'FULL',china:'FULL',legal_ip:'FULL',buffer:'FULL',next_round_risk:'LOWER',assessment:'Funds Base and preserves €112,372 rather than spending it automatically.',probability_base_milestones:'HIGHER_NOT_GUARANTEED'},
  {capital:1500000,runway:runwayMonths(1500000,accelerated.average_monthly_burn_m1_m15),comparison:'ACCELERATED',coverage:scenarioCoverage(1500000,accelerated.capital_with_buffer),sentinel:'FULL',rover:'FULL',ai_data:'PARTIAL',field_pilots:'PARTIAL',team:'FULL',china:'FULL',legal_ip:'FULL',buffer:'PARTIAL',next_round_risk:'LOWER_BUT_EXECUTION_RISK',assessment:'Covers 90.6% of Accelerated; acceleration must be milestone-gated.',probability_base_milestones:'HIGHER_NOT_GUARANTEED'},
];

const milestoneLadder=[
  {id:1,name:'Canonical Sentinel design',status:'PLANNED'},
  {id:2,name:'Instrumented Sentinel prototype',status:'PLANNED'},
  {id:3,name:'Rover platform selected',status:'PLANNED'},
  {id:4,name:'Integrated Rover prototype',status:'PLANNED'},
  {id:5,name:'Drone layer integrated',status:'PLANNED'},
  {id:6,name:'Real field data',status:'PLANNED'},
  {id:7,name:'AI/Data pipeline',status:'PLANNED'},
  {id:8,name:'Pilot evidence',status:'PLANNED'},
  {id:9,name:'Commercial evidence',status:'PLANNED'},
  {id:10,name:'Next-round readiness',status:'PLANNED'},
];
const milestoneCoverage={
  '500000':['FULL','FULL','FULL','PARTIAL','MINIMAL','MINIMAL','MINIMAL','NOT FUNDED','NOT FUNDED','NOT FUNDED'],
  '750000':['FULL','FULL','FULL','FULL','PARTIAL','PARTIAL','PARTIAL','PARTIAL','MINIMAL','MINIMAL'],
  '1000000':['FULL','FULL','FULL','FULL','FULL','FULL','FULL','FULL','PARTIAL','PARTIAL'],
  '1500000':['FULL','FULL','FULL','FULL','FULL','FULL','FULL','FULL','FULL','PARTIAL'],
};
const financingCliffs=[
  {ticket:500000,cliff:'Rover purchased and minimally integrated, but insufficient runway for Base field/data proof.',classification:'FINANCING CLIFF'},
  {ticket:750000,cliff:'Pilots and data work can start while the three-month financing buffer remains underfunded.',classification:'FINANCING CLIFF'},
  {ticket:1500000,cliff:'Accelerated hiring before product and commercial gates validate can create fixed-cost overhang.',classification:'EXECUTION CLIFF'},
];
const evidenceEfficiency=[
  {capital:500000,physical:'PARTIAL',software:'FULL',data:'MINIMAL',commercial:'NOT FUNDED',ip:'FULL',manufacturing:'MINIMAL',efficiency:'MEDIUM',reason:'Creates credible Lean proof, but financing cliffs can strand integration before Base evidence.'},
  {capital:750000,physical:'FULL',software:'FULL',data:'PARTIAL',commercial:'MINIMAL',ip:'FULL',manufacturing:'PARTIAL',efficiency:'MEDIUM',reason:'Adds meaningful proof but remains an uncomfortable gap below Base and protects little buffer.'},
  {capital:1000000,physical:'FULL',software:'FULL',data:'FULL',commercial:'PARTIAL',ip:'FULL',manufacturing:'PARTIAL',efficiency:'HIGH',reason:'Covers Base with a protected surplus and avoids premature fundraising without forcing Accelerated spend.'},
  {capital:1500000,physical:'FULL',software:'FULL',data:'FULL',commercial:'FULL',ip:'FULL',manufacturing:'PARTIAL',efficiency:'MEDIUM',reason:'Buys speed, but value depends on milestone gating and strategic support; does not fully fund Accelerated.'},
];
const dilutionTable=preMoneyCases.map(pre_money=>({pre_money,...Object.fromEntries(tickets.map(x=>[String(x),investorOwnership(x,pre_money)]))}));
const inverseTable=dilutionCaps.map(max_dilution=>({max_dilution,...Object.fromEntries(tickets.map(x=>[String(x),inversePreMoney(x,max_dilution)]))}));
const cumulativeDilution=preMoneyCases.flatMap(pre_money=>tickets.flatMap(investment=>futureDilutionCases.flatMap(future_dilution=>optionPoolCases.map(option_pool=>({pre_money,investment,current_round_dilution:investorOwnership(investment,pre_money),future_dilution,option_pool,current_shareholders_after_current_future_and_pool:currentShareholderRetention(investment,pre_money,future_dilution,option_pool)})))));

const result={
  schema_version:1,as_of:'2026-08-16',classification:'INTERNAL — CONFIDENTIAL',status:'AWAITING_FOUNDER_APPROVAL',verdict:'ROUND_DECISION_READY_FOR_FOUNDER',source_model:'financial/model-v1.json',
  allowed_statuses:status,main_tickets:tickets,reference_tickets:referenceTickets,capital_table:capitalTable,milestone_ladder:milestoneLadder,milestone_coverage:milestoneCoverage,financing_cliffs:financingCliffs,evidence_efficiency:evidenceEfficiency,
  ticket_assessments:{
    '500000':{what_we_can_fund:'Lean plan, core team, commercial rover base/integration, preliminary Sentinel iteration, China sourcing and IP baseline.',must_defer:'Base AI/data depth, full pilots, commercial proof and a protected financing buffer.',expected_runway_months:runwayMonths(500000,lean.average_monthly_burn_m1_m15),major_risk:'A financing cliff after hardware integration but before durable field/data evidence.',next_financing:'Likely before Base evidence is complete.',value_created:'Lean physical and software proof with limited data depth.',base_gap:base.capital_with_buffer-500000},
    '750000':{difference_vs_500000:250000,unlocks:'Fuller Rover integration, stronger Sentinel work, partial drone/data/pilot scope and longer Base-cost runway.',buffer:'€137,629 below Base; meaningful buffer is not protected.',base_gap:base.capital_with_buffer-750000,verdict:'UNCOMFORTABLE_BETWEEN_LEAN_AND_BASE'},
    '1000000':{base_surplus:1000000-base.capital_with_buffer,surplus_percentage:(1000000-base.capital_with_buffer)/base.capital_with_buffer,additional_months:(1000000-base.capital_with_buffer)/base.average_monthly_burn_m1_m15,verdict:'STRONG',protection_rule:'Ring-fence surplus; release only against quotes, field gates or financing timing.'},
    '1500000':{accelerated_coverage:1500000/accelerated.capital_with_buffer,accelerated_gap:accelerated.capital_with_buffer-1500000,what_it_buys:'Larger team, more AI/data capacity, more field activity and faster parallel execution.',risk:'Premature fixed-cost expansion before product and commercial decisions validate.',verdict:'USEFUL_ONLY_IF_MILESTONE_GATED_OR_STRATEGIC'},
  },
  valuation:{pre_money_cases:preMoneyCases,dilution_table:dilutionTable,inverse_pre_money_table:inverseTable,guardrails:{green:{max:0.125,rationale:'Preserves capacity for a future 15–25% round and an optional pool.'},amber:{min_exclusive:0.125,max:0.15,rationale:'Acceptable only when capital fully funds Base or the investor contributes material strategic value.'},red:{min_exclusive:0.15,rationale:'Compounds heavily with future dilution and should require exceptional strategic value and legal review.'}},cumulative_dilution:cumulativeDilution},
  recommendation:{classification:'CODEX RECOMMENDATION — NOT FOUNDER APPROVED',ask_format:'OPTION C — €1M core round; up to €1.5M with strategic participation',opening_ask:1000000,target_close:1000000,minimum_acceptable_capital:750000,maximum_useful_capital:1500000,opening_pre_money:7500000,target_pre_money:6000000,valuation_floor:inversePreMoney(1000000,0.15),ideal_dilution:'10%–12.5%',maximum_dilution:0.15,ebitda_language:'CONDITIONAL',ebitda_wording:'€500k EBITDA becomes achievable only if pricing, volume, COGS, margin and sales-timing drivers validate.'},
  ask_options:[
    {option:'A',structure:'Exact €1M ask',advantage:'Simple and aligned with Base plus surplus.',risk:'Less flexibility for strategic extension.'},
    {option:'B',structure:'€750k–€1M range',advantage:'Negotiating flexibility.',risk:'Investor may anchor to the underfunded €750k edge.'},
    {option:'C',structure:'€1M core; up to €1.5M strategic extension',advantage:'Protects Base while allowing justified acceleration.',risk:'Requires precise milestone gating and strategic criteria.',recommended:true},
  ],
  strategic_value_criteria:['Guaranteed distribution','Access to large agricultural customers','Manufacturing capacity','Strategic data access with acceptable rights','Drone or hardware integration','Follow-on capital capacity','International expansion access','Institutional credibility'],
  investor_types:[
    {type:'FINANCIAL VC',capital:'HIGH',speed:'MEDIUM',strategic_value:'VARIABLE',governance_risk:'MEDIUM_HIGH',commercial_value:'LOW_VARIABLE',future_signal:'HIGH'},
    {type:'STRATEGIC CORPORATE',capital:'HIGH',speed:'LOW_MEDIUM',strategic_value:'HIGH_POTENTIAL',governance_risk:'HIGH',commercial_value:'HIGH_POTENTIAL',future_signal:'VARIABLE'},
    {type:'INDUSTRIAL PARTNER',capital:'MEDIUM',speed:'MEDIUM',strategic_value:'HIGH_MANUFACTURING',governance_risk:'MEDIUM',commercial_value:'MEDIUM_HIGH',future_signal:'MEDIUM'},
    {type:'FAMILY OFFICE',capital:'MEDIUM_HIGH',speed:'MEDIUM_HIGH',strategic_value:'VARIABLE',governance_risk:'LOW_MEDIUM',commercial_value:'VARIABLE',future_signal:'MEDIUM'},
    {type:'TECH STRATEGIC',capital:'MEDIUM_HIGH',speed:'MEDIUM',strategic_value:'HIGH_TECH',governance_risk:'HIGH_IP_DATA',commercial_value:'MEDIUM',future_signal:'MEDIUM_HIGH'},
  ],
  commercial_proof_required:[
    ['Sentinel selling price','P0'],['Sentinel COGS','P0'],['Rover selling price / service model','P0'],['Rover COGS','P0'],['SaaS monthly price','P0'],['AI/data price','P1'],['Pilot price','P0'],['Deployments','P0'],['Hectares','P1'],['Conversion','P0'],['Sales timing','P0'],['Collections','P0'],['Gross margin','P0'],['Support cost','P0'],
  ].map(([variable,priority])=>({variable,priority,status:'TO_VALIDATE'})),
  walk_away_matrix:[
    ['Capital below €750k','NEGOTIATE'],['Dilution above 15%','DO NOT ACCEPT WITHOUT REVIEW'],['Board control or investor majority rights','DO NOT ACCEPT WITHOUT REVIEW'],['Non-standard liquidation preference','LEGAL REVIEW'],['Full-ratchet anti-dilution','DO NOT ACCEPT WITHOUT REVIEW'],['Broad exclusivity','DO NOT ACCEPT WITHOUT REVIEW'],['Investor ownership of core IP','DO NOT ACCEPT WITHOUT REVIEW'],['Broad or perpetual data rights','DO NOT ACCEPT WITHOUT REVIEW'],['Strategic restrictions on customers or partners','LEGAL REVIEW'],['Information and protective rights','NEGOTIATE'],
  ].map(([issue,status])=>({issue,status})),
  founder_questions:[
    'Do you approve €1M as the core New York ask?','Is €750k the absolute minimum close you will accept?','Do you approve a strategic extension up to €1.5M?','Will you defend a €7.5M opening and €6M target pre-money?','Is 15% the absolute dilution ceiling?','Which investor rights are automatic walk-away items?','Which strategic contributions justify moving into the amber dilution zone?','Do you approve ring-fencing the €112k Base surplus?','Do you approve conditional EBITDA language and no forecast claim?','Who has final authority to mark the proposal APPROVED_FOR_NEW_YORK?',
  ],
  round_narrative:{thirty_seconds:'We are preparing a €1M core round, with a strategic extension up to €1.5M. The core round funds the Base M0–M15 plan, protects a financing buffer and converts today’s software and concepts into integrated hardware, field evidence, structured data and next-round readiness. Terms remain subject to founder approval.',two_minutes:'We are preparing a €1M core round because the driver-based Base plan requires approximately €888k including contingency and the three-month financing buffer. The additional €112k is protected, not automatically spent. Capital funds the core team, Rover and Sentinel iterations, the aerial layer, AI/data infrastructure, field validation, China sourcing and the IP baseline. Milestone release is tied to quotes, integrated prototypes, real field data, pilot evidence and commercial inputs. A strategic investor could extend the round to €1.5M when distribution, manufacturing, integration or follow-on value justifies the additional dilution. The next financing trigger is evidence-based: validated unit economics and a repeatable offer, not an invented revenue date.'},
  investor_objections:[
    ['Why do you need €1M?','Base requires €887.6k including contingency and buffer; €1M protects €112.4k against quotes, delays and financing timing.'],['Why not €500k?','€500k funds Lean but leaves a €387.6k Base gap and risks stopping after integration but before durable field/data proof.'],['Why not bootstrap?','Bootstrap can continue software and discovery, but the model’s physical integration, field validation, sourcing and IP work require dedicated capital.'],['Why this valuation range?','It is a negotiation recommendation, not a fact; €6M pre on €1M produces 14.3% dilution and stays within the proposed 15% ceiling.'],['Why accept this dilution?','Capital is tied to evidence that should improve the next financing position; no return or valuation uplift is promised.'],['Why raise before the rover exists?','The round explicitly buys the commercial platform, integration and field proof; current maturity is disclosed.'],['What if China costs double?','Protect the Base surplus, require quotes before release and defer acceleration rather than consume the financing buffer.'],['What if Sentinel costs more?','Keep configuration pending until quotes and acceptance criteria exist; use contingency and milestone gates.'],['What if revenue is delayed?','Revenue is currently zero in the model; preserve runway and do not hire against unvalidated sales.'],['When is the next round?','When integrated evidence, real field data, pilots and unit-economics inputs support a repeatable offer; not on a fixed invented date.'],
  ].map(([question,answer])=>({question,answer})),
};

const jsonPath=path.join(root,'financial/round-decision-v1.json');
await fs.writeFile(jsonPath,JSON.stringify(result,null,2)+'\n');
const fmt=n=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const onePage=`# ROUND DECISION — NEW YORK 2026\n\n**INTERNAL — CONFIDENTIAL · AWAITING FOUNDER APPROVAL**\n\n| Decision | CODEX recommendation — not founder approved |\n|---|---|\n| Recommended ask | €1M core; up to €1.5M with strategic participation |\n| Why | Base requires ${fmt(base.capital_with_buffer)}; €1M protects ${fmt(1000000-base.capital_with_buffer)} |\n| Scenario runway | ${(1000000/base.average_monthly_burn_m1_m15).toFixed(1)} months at Base average burn |\n| What it funds | Base team, Rover, Sentinel, aerial layer, AI/data, field validation, China sourcing and IP baseline |\n| Milestones | Integrated prototypes → real field data → pilot evidence → commercial inputs → next-round readiness |\n| Valuation position | Open €7.5M pre; target €6M; mathematical 15% floor ${fmt(inversePreMoney(1000000,.15))} |\n| Dilution target | Ideal 10–12.5%; maximum recommended 15% |\n| Minimum / maximum | €750k minimum; €1.5M maximum useful with gates |\n| Walk-away | >15% dilution, core-IP transfer, uncontrolled data rights, board control, full-ratchet or broad exclusivity without review |\n| Open decisions | Core ask, minimum close, strategic extension, valuation stance, dilution ceiling, rights guardrails, surplus ring-fence, approval authority |\n\n**Verdict:** ROUND_DECISION_READY_FOR_FOUNDER\n`;
await fs.writeFile(path.join(root,'financial/ROUND_DECISION_NEW_YORK_2026.md'),onePage);
console.log(JSON.stringify({jsonPath,base_capital:base.capital_with_buffer,recommendation:result.recommendation,verdict:result.verdict},null,2));
