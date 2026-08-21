import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "outputs", "sprint-3-financial-model");
const OUTPUT_XLSX = path.join(OUTPUT_DIR, "UP_EYE_DAWN_FINANCIAL_MODEL_2026.xlsx");
const OUTPUT_JSON = path.join(ROOT, "financial", "model-v1.json");
const PREVIEW_DIR = path.join(OUTPUT_DIR, "previews");
const AS_OF = "2026-08-16";

const scenarios = [
  { id: "LEAN", label: "Lean", contingency: 0.05 },
  { id: "BASE", label: "Base", contingency: 0.10 },
  { id: "ACCELERATED", label: "Accelerated", contingency: 0.15 },
];

// Values below are explicitly provisional planning inputs, never approved facts.
const inputs = [
  ["TEAM-01","Team","OPEX","Core team and contractor capacity","monthly",1,15,18000,30000,50000,"MANAGEMENT_ASSUMPTION","Founder / Finance","Employment plan and salary bands required"],
  ["SW-01","Software & cloud","OPEX","Cloud, observability, collaboration and licences","monthly",1,15,1800,3200,6000,"MANAGEMENT_ASSUMPTION","CTO","Vendor bills and architecture load test required"],
  ["AI-01","AI & data","OPEX","Data labelling, model experiments and storage","monthly",2,15,1500,3500,7500,"MANAGEMENT_ASSUMPTION","AI lead","Dataset and compute plan required"],
  ["SEN-01","Sentinel","CAPEX","Documented preliminary component BOM allowance","one_time",2,2,2412,5935,9457,"DOCUMENTED_ESTIMATE","Engineering","Low/high from Sentinel BOM; midpoint used for Base"],
  ["SEN-02","Sentinel","CAPEX","Prototype integration, enclosure and test uplift","one_time",3,3,7500,18000,35000,"MANAGEMENT_ASSUMPTION","Engineering","Supplier quotations and selected configuration required"],
  ["ROV-01","Rover platform","CAPEX","Commercial tracked mobility platform allowance","one_time",1,1,18000,30000,45000,"TO_QUOTE","Operations","Written AgileX/comparable quote, freight and taxes required"],
  ["ROV-02","Rover integration","CAPEX","Structure, compute, sensors, probe and docking integration","one_time",2,2,18000,40000,80000,"MANAGEMENT_ASSUMPTION","Engineering","BOM and acceptance criteria required"],
  ["DRN-01","Drone","CAPEX","Aircraft, payload and docking integration allowance","one_time",3,3,5000,15000,35000,"TO_VALIDATE","Flight lead","Aircraft and regulatory path not selected"],
  ["FLD-01","Field validation","OPEX","Pilot preparation, agronomy, travel and measurement","monthly",5,12,3000,6500,12000,"MANAGEMENT_ASSUMPTION","Operations","Design-partner sites and protocols required"],
  ["CHN-01","China sourcing","OPEX","Supplier diligence, travel, samples and inspection","one_time",1,1,12000,22000,40000,"MANAGEMENT_ASSUMPTION","Operations","Trip scope and supplier shortlist required"],
  ["IP-01","IP / legal","OPEX","Corporate, IP assignments, FTO and contracting","one_time",0,0,10000,20000,40000,"MANAGEMENT_ASSUMPTION","Legal","Counsel quote and diligence scope required"],
  ["REG-01","Regulatory","OPEX","Drone, privacy, safety and field compliance work","monthly",4,9,1500,3500,7000,"MANAGEMENT_ASSUMPTION","Legal / Flight","Jurisdiction and operating concept required"],
  ["MKT-01","Investor & commercial validation","OPEX","Customer discovery, materials and meeting costs","monthly",1,12,1500,3000,6000,"MANAGEMENT_ASSUMPTION","CEO","Approved go-to-market plan required"],
];

const revenueDrivers = [
  ["REV-01","Sentinel hardware units",0,"units","TO_VALIDATE","No approved price, volume or delivery calendar"],
  ["REV-02","Rover hardware units",0,"units","TO_VALIDATE","No approved price, volume or delivery calendar"],
  ["REV-03","Active SaaS accounts",0,"accounts","TO_VALIDATE","No approved pricing, conversion or churn"],
  ["REV-04","Managed service contracts",0,"contracts","TO_VALIDATE","No approved scope, pricing or delivery capacity"],
];

function monthlyValue(input, scenarioIndex, month) {
  const cadence = input[4];
  const start = input[5];
  const end = input[6];
  const value = input[7 + scenarioIndex];
  if (month < start || month > end) return 0;
  return cadence === "monthly" ? value : month === start ? value : 0;
}

function calculateScenario(scenario, scenarioIndex) {
  const months = Array.from({ length: 16 }, (_, m) => {
    const byCategory = {};
    let opex = 0;
    let capex = 0;
    for (const input of inputs) {
      const value = monthlyValue(input, scenarioIndex, m);
      byCategory[input[1]] = (byCategory[input[1]] || 0) + value;
      if (input[2] === "OPEX") opex += value;
      else capex += value;
    }
    return { month: `M${m}`, opex, capex, revenue: 0, net_cash_flow: -(opex + capex), by_category: byCategory };
  });
  const core = months.filter((m) => Number(m.month.slice(1)) <= 12);
  const totalCore = core.reduce((a, m) => a + m.opex + m.capex, 0);
  const total15 = months.reduce((a, m) => a + m.opex + m.capex, 0);
  const contingencyCore = totalCore * scenario.contingency;
  const contingency15 = total15 * scenario.contingency;
  const avgBurn = months.slice(1).reduce((a, m) => a + m.opex + m.capex, 0) / 15;
  const peakBurn = Math.max(...months.map((m) => m.opex + m.capex));
  return {
    ...scenario,
    months,
    total_core_m0_m12: totalCore,
    total_m0_m15: total15,
    contingency_core: contingencyCore,
    contingency_m0_m15: contingency15,
    capital_core: totalCore + contingencyCore,
    capital_with_buffer: total15 + contingency15,
    average_monthly_burn_m1_m15: avgBurn,
    peak_monthly_burn: peakBurn,
  };
}

const calculated = scenarios.map(calculateScenario);
const roundSizes = [300000,500000,750000,1000000,1500000];
const valuationPreMoney = [2500000,5000000,7500000,10000000,15000000];
const roundSensitivity = valuationPreMoney.flatMap((preMoney) => roundSizes.map((investment) => ({
  investment, pre_money: preMoney, post_money: preMoney + investment,
  dilution: investment / (preMoney + investment), classification: "SCENARIO",
})));

const outputs = {
  schema_version: 1,
  as_of: AS_OF,
  currency: "EUR",
  status: "MODELLED_NOT_APPROVED",
  verdict: "READY_WITH_INPUTS_PENDING",
  conventions: { period: "M0-M15 monthly", extension: "M24-ready", revenue_policy: "Zero until approved drivers exist" },
  input_classifications: ["CONFIRMED","DOCUMENTED_ESTIMATE","MANAGEMENT_ASSUMPTION","SCENARIO","TO_QUOTE","TO_VALIDATE"],
  scenarios: calculated,
  provisional_round_guidance: {
    status: "DECISION_REQUIRED",
    minimum_viable: { amount: Math.ceil(calculated[0].capital_core / 10000) * 10000, basis: "Lean M0-M12 plus 5% contingency" },
    recommended: { amount: Math.ceil(calculated[1].capital_with_buffer / 10000) * 10000, basis: "Base M0-M15 plus 10% contingency" },
    comfortable: { amount: Math.ceil(calculated[2].capital_with_buffer / 10000) * 10000, basis: "Accelerated M0-M15 plus 15% contingency" },
    approved: false,
  },
  round_sensitivity: roundSensitivity,
  revenue_drivers: revenueDrivers.map(([id,name,value,unit,status,note]) => ({ id,name,value,unit,status,note })),
  ebitda_target: { value: 500000, period: "12 months", status: "TARGET_TO_VALIDATE", reverse_engineering_status: "BLOCKED_BY_PRICE_VOLUME_MARGIN_INPUTS" },
  unit_economics: { status: "PENDING", required: ["approved price","COGS","installation cost","support cost","gross margin","SaaS MRR","churn","CAC"] },
  founder_decisions: [
    "Approve a planning scenario and capital envelope",
    "Approve hiring sequence and loaded compensation bands",
    "Select Sentinel configuration and obtain supplier quotes",
    "Select rover platform and integration BOM",
    "Select drone/regulatory operating path",
    "Approve commercial pricing and revenue activation gates",
    "Approve instrument, valuation range and dilution guardrail",
  ],
  sources: [
    { id:"SRC-01", type:"DOCUMENTED_ESTIMATE", ref:"references/source-material/sentinel/engineering/04_bom_costes.csv", note:"Preliminary Sentinel BOM; numeric component range €2,412–€9,457, excluding supplier-only dock quote" },
    { id:"SRC-02", type:"CANONICAL", ref:"source-of-truth/new-york-2026.json", note:"Product maturity, null round terms and €500k EBITDA target status" },
    { id:"SRC-03", type:"HISTORICAL", ref:"docs/investor-meeting-new-york-2026/financial/fundraising-scenarios.csv", note:"Quarantined historical scenarios; not current terms" },
  ],
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PREVIEW_DIR, { recursive: true });
await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputs, null, 2) + "\n");

const wb = Workbook.create();
const names = ["Cover","Assumptions","Monthly Model","Scenario Summary","Use of Funds","Round Analysis","EBITDA Target","Negotiation","Investor Q&A","Checks","Sources"];
for (const name of names) wb.worksheets.add(name);

const navy = "#071721", teal = "#21C6A8", pale = "#E8F2F1", gold = "#D6A84B", red = "#B42318", gray = "#667085", white = "#FFFFFF";
const title = (sheet, range, text) => { const r=sheet.getRange(range); r.merge(); r.values=[[text]]; r.format={fill:navy,font:{bold:true,color:white,size:18},verticalAlignment:"center"}; r.format.rowHeight=32; };
const section = (sheet, range, text) => { const r=sheet.getRange(range); r.merge(); r.values=[[text]]; r.format={fill:navy,font:{bold:true,color:white},verticalAlignment:"center"}; };
const header = (range) => { range.format={fill:"#16313D",font:{bold:true,color:white},wrapText:true,verticalAlignment:"center",borders:{preset:"all",style:"thin",color:"#33505C"}}; };
const money = '€#,##0;[Red](€#,##0);-';
const pct = '0.0%;[Red](0.0%);-';
const styleSheet = (s) => { s.showGridLines=false; };

// Cover
{
  const s=wb.worksheets.getItem("Cover"); title(s,"A1:H2","UP-EYE-DAWN — Financial Model & Fundraising Strategy");
  s.getRange("A4:B12").values=[
    ["Version","1.0"],["As of",AS_OF],["Currency","EUR"],["Period","M0–M15 monthly; M24-ready"],["Model status","MODELLED_NOT_APPROVED"],["Verdict","READY_WITH_INPUTS_PENDING"],["Revenue policy","Zero until approved drivers exist"],["Owner","Founder / Finance"],["Purpose","Investor planning and internal negotiation — not an approved forecast"],
  ];
  s.getRange("A4:A12").format={font:{bold:true,color:navy}}; s.getRange("B8").format={fill:"#FFF2CC",font:{bold:true,color:red}};
  section(s,"A14:H14","PROVISIONAL CAPITAL ENVELOPES — MODEL OUTPUTS, NOT APPROVED TERMS");
  s.getRange("A15:D18").values=[["Envelope","Amount","Basis","Status"],["Minimum viable",outputs.provisional_round_guidance.minimum_viable.amount,outputs.provisional_round_guidance.minimum_viable.basis,"DECISION_REQUIRED"],["Recommended",outputs.provisional_round_guidance.recommended.amount,outputs.provisional_round_guidance.recommended.basis,"DECISION_REQUIRED"],["Comfortable",outputs.provisional_round_guidance.comfortable.amount,outputs.provisional_round_guidance.comfortable.basis,"DECISION_REQUIRED"]];
  header(s.getRange("A15:D15")); s.getRange("B16:B18").format.numberFormat=money; s.getRange("D16:D18").format={fill:"#FFF2CC",font:{color:red,bold:true}};
  section(s,"A20:H20","HOW TO USE"); s.getRange("A21:H24").merge(); s.getRange("A21").values=[["Edit only blue-font inputs on Assumptions. All calculations are formula-driven. DOCUMENTED_ESTIMATE is source-backed but preliminary; MANAGEMENT_ASSUMPTION is provisional; TO_QUOTE and TO_VALIDATE remain open. Current round terms stay null until founder/board approval."]]; s.getRange("A21:H24").format={wrapText:true,fill:pale,verticalAlignment:"top"};
  s.getRange("A1:H24").format.columnWidth=18; s.getRange("A1:A24").format.columnWidth=24; s.getRange("C1:C24").format.columnWidth=46;
}

// Assumptions
{
  const s=wb.worksheets.getItem("Assumptions"); title(s,"A1:M2","Assumptions & Input Register");
  const rows=[["ID","Category","Type","Driver","Cadence","Start","End","Lean EUR","Base EUR","Accelerated EUR","Classification","Owner","Evidence / action required"],...inputs];
  s.getRangeByIndexes(3,0,rows.length,13).values=rows; header(s.getRange("A4:M4"));
  s.getRange(`H5:J${4+inputs.length}`).format={font:{color:"#0000FF"},fill:"#FFFBE6",numberFormat:money};
  s.getRange(`F5:G${4+inputs.length}`).format={font:{color:"#0000FF"}};
  s.getRange(`A5:M${4+inputs.length}`).format.borders={preset:"inside",style:"thin",color:"#D0D5DD"};
  s.getRange("A4:M20").format.wrapText=true; s.getRange("A5:M17").format.rowHeight=34; s.getRange("D:D").format.columnWidth=34; s.getRange("M:M").format.columnWidth=46; s.getRange("A:C").format.columnWidth=18; s.getRange("K:L").format.columnWidth=24; s.freezePanes.freezeRows(4);
  section(s,"A20:M20","REVENUE ACTIVATION DRIVERS — CURRENTLY ZERO / TO VALIDATE");
  s.getRange("A21:F25").values=[["ID","Driver","Current value","Unit","Status","Required evidence"],...revenueDrivers]; header(s.getRange("A21:F21")); s.getRange("C22:C25").format={font:{color:"#0000FF"},fill:"#FFFBE6"}; s.getRange("F:F").format.columnWidth=55;
  section(s,"A27:M27","CONTINGENCY BY SCENARIO"); s.getRange("A28:D31").values=[["Scenario","Rate","Classification","Note"],...scenarios.map(x=>[x.label,x.contingency,"SCENARIO","Configurable planning allowance"])]; header(s.getRange("A28:D28")); s.getRange("B29:B31").format={font:{color:"#0000FF"},fill:"#FFFBE6",numberFormat:pct};
}

// Monthly model, formula-driven from Assumptions.
{
  const s=wb.worksheets.getItem("Monthly Model"); title(s,"A1:R2","Monthly Driver Model — M0 to M15");
  s.getRange("A3:R3").values=[["Month index","",...Array.from({length:16},(_,i)=>i)]]; s.getRange("A3:R3").format={font:{color:gray,size:8}};
  s.getRange("A4:R4").values=[["Scenario","Metric",...Array.from({length:16},(_,i)=>`M${i}`)]]; header(s.getRange("A4:R4"));
  let row=5;
  const inputStart=5,inputEnd=4+inputs.length;
  scenarios.forEach((sc,si)=>{
    section(s,`A${row}:R${row}`,`${sc.label.toUpperCase()} SCENARIO`); row++;
    const start=row;
    for(const metric of ["OPEX","CAPEX","Total cash out","Revenue","EBITDA / cash proxy","Cumulative cash need"]){
      s.getRange(`A${row}:B${row}`).values=[[sc.label,metric]];
      for(let m=0;m<16;m++){
        const col=String.fromCharCode(67+m);
        const valueCol=["H","I","J"][si];
        let f;
        if(metric==="OPEX" || metric==="CAPEX") f=`=SUMPRODUCT(('Assumptions'!$C$${inputStart}:$C$${inputEnd}="${metric}")*('Assumptions'!$F$${inputStart}:$F$${inputEnd}<=${col}$3)*('Assumptions'!$G$${inputStart}:$G$${inputEnd}>=${col}$3)*(('Assumptions'!$E$${inputStart}:$E$${inputEnd}="monthly")+(('Assumptions'!$E$${inputStart}:$E$${inputEnd}="one_time")*('Assumptions'!$F$${inputStart}:$F$${inputEnd}=${col}$3)))*'Assumptions'!$${valueCol}$${inputStart}:$${valueCol}$${inputEnd})`;
        else if(metric==="Total cash out") f=`=${col}${row-2}+${col}${row-1}`;
        else if(metric==="Revenue") f="=0";
        else if(metric==="EBITDA / cash proxy") f=`=${col}${row-1}-${col}${row-4}`;
        else f=m===0?`=${col}${row-3}`:`=${String.fromCharCode(66+m)}${row}+${col}${row-3}`;
        s.getRange(`${col}${row}`).formulas=[[f]];
      }
      row++;
    }
    s.getRange(`C${start}:R${row-1}`).format.numberFormat=money;
    s.getRange(`B${start+2}:R${start+2}`).format={font:{bold:true},borders:{preset:"doubleBottom",style:"thin",color:navy}};
    s.getRange(`B${start+5}:R${start+5}`).format={font:{bold:true},fill:pale}; row++;
  });
  s.getRange("A:A").format.columnWidth=15; s.getRange("B:B").format.columnWidth=26; s.getRange("C:R").format.columnWidth=13; s.freezePanes.freezeRows(4); s.freezePanes.freezeColumns(2);
}

// Scenario summary formulas.
{
  const s=wb.worksheets.getItem("Scenario Summary"); title(s,"A1:H2","Scenario Summary & Runway");
  s.getRange("A4:H4").values=[["Scenario","M0-M12 spend","Contingency","Core capital","M0-M15 spend","Capital incl. buffer","Avg burn M1-M15","Peak burn"]]; header(s.getRange("A4:H4"));
  const modelRows={Lean:8,Base:16,Accelerated:24};
  scenarios.forEach((sc,i)=>{const r=5+i, mr=modelRows[sc.label]; s.getRange(`A${r}`).values=[[sc.label]]; s.getRange(`B${r}`).formulas=[[`=SUM('Monthly Model'!C${mr}:O${mr})`]]; s.getRange(`C${r}`).formulas=[[`=B${r}*'Assumptions'!B${29+i}`]]; s.getRange(`D${r}`).formulas=[[`=B${r}+C${r}`]]; s.getRange(`E${r}`).formulas=[[`=SUM('Monthly Model'!C${mr}:R${mr})`]]; s.getRange(`F${r}`).formulas=[[`=E${r}*(1+'Assumptions'!B${29+i})`]]; s.getRange(`G${r}`).formulas=[[`=AVERAGE('Monthly Model'!D${mr}:R${mr})`]]; s.getRange(`H${r}`).formulas=[[`=MAX('Monthly Model'!C${mr}:R${mr})`]];});
  s.getRange("B5:H7").format.numberFormat=money;
  section(s,"A10:H10","RUNWAY SENSITIVITY — MONTHS AT AVERAGE BURN");
  s.getRange("A11:F14").values=[["Scenario",...roundSizes.map(x=>x)],["Lean"],["Base"],["Accelerated"]]; header(s.getRange("A11:F11")); s.getRange("B11:F11").format.numberFormat=money;
  for(let i=0;i<3;i++) for(let j=0;j<5;j++) { const hc=String.fromCharCode(66+j); s.getRangeByIndexes(11+i,1+j,1,1).formulas=[[`=${hc}$11/$G${5+i}`]]; }
  s.getRange("B12:F14").format.numberFormat='0.0 "months"';
  section(s,"A17:H17","PROVISIONAL GUIDANCE — DECISION REQUIRED");
  s.getRange("A18:D21").values=[["Envelope","Amount","Basis","Status"],["Minimum viable",outputs.provisional_round_guidance.minimum_viable.amount,outputs.provisional_round_guidance.minimum_viable.basis,"DECISION_REQUIRED"],["Recommended",outputs.provisional_round_guidance.recommended.amount,outputs.provisional_round_guidance.recommended.basis,"DECISION_REQUIRED"],["Comfortable",outputs.provisional_round_guidance.comfortable.amount,outputs.provisional_round_guidance.comfortable.basis,"DECISION_REQUIRED"]]; header(s.getRange("A18:D18")); s.getRange("B19:B21").format.numberFormat=money;
  s.getRange("A:H").format.columnWidth=20; s.getRange("C:C").format.columnWidth=34;
}

// Use of funds by category from calculated JSON.
{
  const s=wb.worksheets.getItem("Use of Funds"); title(s,"A1:E2","Use of Funds — M0 to M15");
  const cats=[...new Set(inputs.map(x=>x[1]))]; s.getRange("A4:E4").values=[["Category","Lean","Base","Accelerated","Asset / milestone created"]]; header(s.getRange("A4:E4"));
  const descriptions={"Team":"Execution capacity and accountable owners","Software & cloud":"Operational software environment","AI & data":"Versioned data and model experimentation","Sentinel":"Instrumented fixed-node iteration","Rover platform":"Commercial mobility base","Rover integration":"Integrated field rover prototype","Drone":"Selected aerial layer and integration path","Field validation":"Reproducible field evidence","China sourcing":"Supplier shortlist, quotes and acceptance plan","IP / legal":"Corporate and IP diligence baseline","Regulatory":"Documented operating constraints","Investor & commercial validation":"Validated commercial inputs"};
  cats.forEach((cat,i)=>{const r=5+i; s.getRange(`A${r}`).values=[[cat]]; for(let j=0;j<3;j++){const total=calculated[j].months.reduce((a,m)=>a+(m.by_category[cat]||0),0); s.getRangeByIndexes(r-1,1+j,1,1).values=[[total]];} s.getRange(`E${r}`).values=[[descriptions[cat]]];});
  const tr=5+cats.length; s.getRange(`A${tr}:E${tr}`).values=[["Total before contingency",null,null,null,"Formula-driven total"]]; for(let j=0;j<3;j++)s.getRangeByIndexes(tr-1,1+j,1,1).formulas=[[`=SUM(${String.fromCharCode(66+j)}5:${String.fromCharCode(66+j)}${tr-1})`]];
  s.getRange(`B5:D${tr}`).format.numberFormat=money; s.getRange(`A${tr}:E${tr}`).format={font:{bold:true},borders:{preset:"doubleBottom",style:"thin",color:navy}}; s.getRange("A:E").format.columnWidth=22; s.getRange("E:E").format.columnWidth=45;
}

// Round analysis and dilution.
{
  const s=wb.worksheets.getItem("Round Analysis"); title(s,"A1:H2","Fundraising Scenarios & Dilution Sensitivity");
  s.getRange("A4:F4").values=[["Investment",...valuationPreMoney.map(x=>`Pre-money €${(x/1e6).toFixed(1)}m`)]]; header(s.getRange("A4:F4"));
  roundSizes.forEach((inv,i)=>{const r=5+i;s.getRange(`A${r}`).values=[[inv]];valuationPreMoney.forEach((pm,j)=>s.getRangeByIndexes(r-1,1+j,1,1).formulas=[[`=$A${r}/($A${r}+${pm})`]]);});
  s.getRange("A5:A9").format.numberFormat=money; s.getRange("B5:F9").format.numberFormat=pct;
  section(s,"A12:H12","CAP TABLE MECHANICS — ILLUSTRATIVE ONLY");
  s.getRange("A13:F16").values=[["Input / output","Value","Classification","Formula / rule","Approval","Note"],["Illustrative investment",500000,"SCENARIO","Editable input","NOT APPROVED","No current ask implied"],["Illustrative pre-money",5000000,"SCENARIO","Editable input","NOT APPROVED","No current valuation implied"],["Illustrative investor ownership",null,"CALCULATED","Investment / post-money","NOT APPROVED","No option pool or existing cap table included"]]; header(s.getRange("A13:F13")); s.getRange("B14:B15").format={font:{color:"#0000FF"},fill:"#FFFBE6",numberFormat:money}; s.getRange("B16").formulas=[["=B14/(B14+B15)"]]; s.getRange("B16").format.numberFormat=pct;
  section(s,"A19:H19","FINANCING OPTIONS");
  s.getRange("A20:E24").values=[["Option","Best use","Key advantage","Key risk","Status"],["Priced equity","Clear valuation and ownership","Straightforward cap table","Premature price discovery","TO_DECIDE"],["Convertible instrument","Bridge to evidence milestone","Defers pricing","Cap/discount complexity","TO_DECIDE"],["Strategic / corporate capital","Commercial and technical leverage","Potential validation access","Exclusivity / control constraints","TO_VALIDATE"],["Grants / non-dilutive","R&D and validation","Preserves equity","Timing and restricted uses","TO_VALIDATE"]]; header(s.getRange("A20:E20")); s.getRange("A:F").format.columnWidth=24; s.getRange("B:E").format.wrapText=true;
}

// EBITDA reverse engineering.
{
  const s=wb.worksheets.getItem("EBITDA Target"); title(s,"A1:H2","€500k EBITDA Target — Reverse Engineering Gate");
  s.getRange("A4:D11").values=[["Driver","Value","Status","Meaning"],["12-month EBITDA target",500000,"TARGET_TO_VALIDATE","Target, not forecast"],["Base M0-M12 OPEX",calculated[1].months.slice(0,13).reduce((a,m)=>a+m.opex,0),"MODELLED_NOT_APPROVED","Excludes CAPEX"],["Required gross profit",null,"CALCULATED","EBITDA target + operating costs"],["Assumed blended gross margin",0,"TO_VALIDATE","Cannot be activated without pricing and COGS"],["Required revenue",null,"BLOCKED","Required gross profit / gross margin"],["Approved revenue plan",0,"NOT_AVAILABLE","No invented sales"],["Conclusion","NOT YET SUPPORTABLE","DECISION_REQUIRED","Price, volume, COGS, margin and timing are missing"]]; header(s.getRange("A4:D4")); s.getRange("B5:B7").format.numberFormat=money; s.getRange("B7").formulas=[["=B5+B6"]]; s.getRange("B8").format={font:{color:"#0000FF"},fill:"#FFFBE6",numberFormat:pct}; s.getRange("B9").formulas=[["=IF(B8>0,B7/B8,0)"]]; s.getRange("B9:B10").format.numberFormat=money;
  section(s,"A14:H14","REQUIRED COMMERCIAL DRIVERS"); s.getRange("A15:D23").values=[["Driver","Current status","Required evidence","Owner"],["Sentinel price","TO_VALIDATE","Quote / offer and delivery scope","CEO / Engineering"],["Rover price","TO_VALIDATE","Quote / offer and delivery scope","CEO / Engineering"],["Hardware COGS","TO_QUOTE","BOM, freight, duties, integration labour","Operations"],["SaaS MRR","TO_VALIDATE","Packaging and willingness-to-pay evidence","CEO"],["Gross margin","TO_VALIDATE","Price less evidenced variable cost","Finance"],["Sales volume","TO_VALIDATE","Pipeline with probability and timing","CEO"],["Cash collection timing","TO_VALIDATE","Contract and payment terms","Finance"],["Support cost","TO_VALIDATE","Service design and field data","Operations"]]; header(s.getRange("A15:D15")); s.getRange("A:D").format.columnWidth=28; s.getRange("C:C").format.columnWidth=48;
}

// Negotiation view.
{
 const s=wb.worksheets.getItem("Negotiation"); title(s,"A1:H2","Internal Negotiation View — Confidential Planning");
 s.getRange("A4:E12").values=[["Topic","Position","Evidence","Guardrail","Status"],["Capital quantum","Use model envelope, not legacy ask","Scenario Summary","Do not present as approved","DECISION_REQUIRED"],["Valuation","Show sensitivity, not a single truth","Round Analysis","No current pre-money until approved","DECISION_REQUIRED"],["Dilution","Investment / post-money only","Formula table","Include option pool only when cap table exists","TO_VALIDATE"],["Instrument","Compare equity / convertible / strategic / grant","Round Analysis","Legal review before term discussion","TO_DECIDE"],["Milestone logic","Capital buys evidence and deployable assets","Use of Funds","Tie tranche to evidence gates","MODELLED"],["EBITDA target","Keep TARGET_TO_VALIDATE","EBITDA Target","Never call it forecast","BLOCKED_BY_INPUTS"],["Legacy terms","Historical only","Canonical truth quarantine","Never reactivate implicitly","QUARANTINED"],["Walk-away issues","Control, exclusivity, IP, unsupported warranties","Legal diligence","Founder/board approval required","TO_DECIDE"]]; header(s.getRange("A4:E4")); s.getRange("A:E").format.columnWidth=27; s.getRange("B:D").format.columnWidth=43; s.getRange("A:E").format.wrapText=true;
}

// Q&A.
{
 const s=wb.worksheets.getItem("Investor Q&A"); title(s,"A1:F2","Investor Financial Q&A — Derived from Model");
 const q=[
  ["How much are you raising?",`The current ask is not approved. The provisional model produces ${Math.round(outputs.provisional_round_guidance.minimum_viable.amount/1000)}k / ${Math.round(outputs.provisional_round_guidance.recommended.amount/1000)}k / ${Math.round(outputs.provisional_round_guidance.comfortable.amount/1000)}k EUR envelopes.`,"SCENARIO","Scenario Summary","Founder approval"],
  ["What does the capital create?","A commercial rover platform and integration, an instrumented Sentinel iteration, a selected drone path, field evidence, a versioned data foundation and an IP/corporate baseline.","MODELLED","Use of Funds","Supplier and engineering evidence"],
  ["What is runway?","Runway depends on the selected envelope and the scenario average burn; the workbook provides formula-driven months for standard round sizes.","MODELLED_NOT_APPROVED","Scenario Summary","Scenario approval"],
  ["Why no revenue forecast?","Price, volume, conversion, COGS, gross margin and collection timing are not approved. Revenue remains zero to avoid invented sales.","CONFIRMED_GAP","Assumptions","Commercial evidence"],
  ["Can you support €500k EBITDA in 12 months?","Not yet. It remains TARGET_TO_VALIDATE and is blocked by missing price, volume, margin and timing drivers.","TARGET_TO_VALIDATE","EBITDA Target","Commercial model"],
  ["What valuation are you seeking?","No current valuation is approved. The model shows dilution sensitivity across round sizes and pre-money scenarios only.","DECISION_REQUIRED","Round Analysis","Founder/board decision"],
  ["What are the largest uncertainties?","Loaded team cost, hardware quotes, selected configurations, regulatory path, field validation scope and commercial activation drivers.","OPEN_INPUTS","Assumptions","Named owners"],
 ];
 s.getRange("A4:E11").values=[["Question","Model-derived answer","Classification","Evidence sheet","Next evidence"],...q]; header(s.getRange("A4:E4")); s.getRange("A:E").format.wrapText=true; s.getRange("A5:E11").format.rowHeight=44; s.getRange("A:A").format.columnWidth=32; s.getRange("B:B").format.columnWidth=75; s.getRange("C:E").format.columnWidth=24;
}

// Checks.
{
 const s=wb.worksheets.getItem("Checks"); title(s,"A1:G2","Model Checks");
 s.getRange("A4:G10").values=[["Check","Actual","Expected","Difference","Tolerance","Status","Where to fix"],["Scenario count",3,3,null,0,null,"Builder / scenario definitions"],["Revenue remains zero",0,0,null,0,null,"Assumptions / Revenue drivers"],["Base capital ties",null,calculated[1].capital_with_buffer,null,1,null,"Scenario Summary"],["Minimum envelope positive",outputs.provisional_round_guidance.minimum_viable.amount,1,null,0,null,"Assumptions"],["Current round remains unapproved",0,0,null,0,null,"Canonical truth"],["Input rows classified",inputs.length,inputs.length,null,0,null,"Assumptions"]]; header(s.getRange("A4:G4"));
 s.getRange("B5:B10").formulas=[["=3"],["=SUM('Monthly Model'!C9:R9)+SUM('Monthly Model'!C17:R17)+SUM('Monthly Model'!C25:R25)"],["='Scenario Summary'!F6"],[`=IF(${outputs.provisional_round_guidance.minimum_viable.amount}>0,1,0)`],["=0"],[`=${inputs.length}`]];
 for(let r=5;r<=10;r++){s.getRange(`D${r}`).formulas=[[`=B${r}-C${r}`]];s.getRange(`F${r}`).formulas=[[`=IF(ABS(D${r})<=E${r},"OK","FAIL")`]];}
 s.getRange("A12:B13").values=[["MODEL STATUS",null],["Open input status","READY_WITH_INPUTS_PENDING"]]; s.getRange("B12").formulas=[["=IF(COUNTIF(F5:F10,\"FAIL\")=0,\"PASS\",\"FAIL\")"]]; s.getRange("B12").format={fill:"#D1FADF",font:{bold:true,color:"#027A48"}}; s.getRange("A:G").format.columnWidth=22; s.getRange("G:G").format.columnWidth=34;
}

// Sources.
{
 const s=wb.worksheets.getItem("Sources"); title(s,"A1:I2","Sources, Evidence & Version Log");
 s.getRange("A4:I8").values=[["ID","Item","Value","Units","As of","Source type","Source / ref","Owner","Notes"],["SRC-01","Sentinel preliminary BOM","€2,412–€9,457","EUR",AS_OF,"DOCUMENTED_ESTIMATE","references/source-material/sentinel/engineering/04_bom_costes.csv","Engineering","Excludes supplier-only dock quote; historical configuration not selected"],["SRC-02","Canonical product and finance truth","Round terms null; EBITDA target to validate","mixed",AS_OF,"CANONICAL","source-of-truth/new-york-2026.json","Founder","Governs external wording"],["SRC-03","Historical fundraising scenarios","300k / 500k / 7.5m examples","EUR",AS_OF,"HISTORICAL","docs/investor-meeting-new-york-2026/financial/fundraising-scenarios.csv","Finance","Quarantined; never active terms"],["SRC-04","Management planning inputs","See Assumptions","EUR",AS_OF,"MANAGEMENT_ASSUMPTION","This workbook","Founder / Finance","Provisional until owner approval"]]; header(s.getRange("A4:I4"));
 section(s,"A11:I11","VERSION HISTORY"); s.getRange("A12:D14").values=[["Version","Date","Change","Status"],["1.0",AS_OF,"Initial driver-based M0-M15 model and fundraising sensitivity","MODELLED_NOT_APPROVED"],["Next","TBD","Replace provisional inputs with quotes, hiring plan and commercial drivers","PENDING"]]; header(s.getRange("A12:D12")); s.getRange("A:I").format.columnWidth=20; s.getRange("B:B").format.columnWidth=32; s.getRange("G:G").format.columnWidth=65; s.getRange("I:I").format.columnWidth=55; s.getRange("A:I").format.wrapText=true;
}

for (const name of names) styleSheet(wb.worksheets.getItem(name));

// Compact verification before export.
console.log((await wb.inspect({kind:"table",range:"Scenario Summary!A1:H21",include:"values,formulas",tableMaxRows:25,tableMaxCols:10,maxChars:5000})).ndjson);
console.log((await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:100},summary:"final formula error scan",maxChars:2500})).ndjson);

for (const name of names) {
  const img=await wb.render({sheetName:name,autoCrop:"all",scale:1,format:"png"});
  await fs.writeFile(path.join(PREVIEW_DIR,`${name.replaceAll(" ","_")}.png`),new Uint8Array(await img.arrayBuffer()));
}

const out=await SpreadsheetFile.exportXlsx(wb); await out.save(OUTPUT_XLSX);
console.log(JSON.stringify({OUTPUT_XLSX,OUTPUT_JSON,preview_count:names.length,verdict:outputs.verdict,provisional_round_guidance:outputs.provisional_round_guidance},null,2));

export { inputs, scenarios, calculated, outputs };
