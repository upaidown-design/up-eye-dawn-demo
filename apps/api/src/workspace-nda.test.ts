import assert from 'node:assert/strict';
import test from 'node:test';
import {isNdaTransitionAllowed, ndaContentHash} from './workspace-nda.js';
import {normalizeImapEmail,normalizeJmapEmail} from './workspace-mail.js';

test('NDA lifecycle allows only controlled forward transitions and legal return',()=>{
  assert.equal(isNdaTransitionAllowed('DRAFT_FOR_WORKFLOW_TESTING','LEGAL_REVIEW'),true);
  assert.equal(isNdaTransitionAllowed('LEGAL_REVIEW','DRAFT_FOR_WORKFLOW_TESTING'),true);
  assert.equal(isNdaTransitionAllowed('LEGAL_REVIEW','APPROVED'),true);
  assert.equal(isNdaTransitionAllowed('APPROVED','RETIRED'),true);
  assert.equal(isNdaTransitionAllowed('DRAFT_FOR_WORKFLOW_TESTING','APPROVED'),false);
  assert.equal(isNdaTransitionAllowed('APPROVED','DRAFT_FOR_WORKFLOW_TESTING'),false);
  assert.equal(isNdaTransitionAllowed('RETIRED','APPROVED'),false);
});

test('JMAP messages normalize into inbox-safe thread records',()=>{
  const incoming=normalizeJmapEmail({id:'m1',threadId:'t1',from:[{email:'Investor@Fund.com'}],to:[{email:'investors@upaidown.com'}],subject:'Diligence',receivedAt:'2026-08-22T10:00:00Z',textBody:[{partId:'p1'}],bodyValues:{p1:{value:'Hello team'}},keywords:{$seen:true}},'investors@upaidown.com');
  assert.deepEqual(incoming,{remoteThreadId:'t1',providerMessageId:'m1',direction:'INBOUND',fromAddress:'investor@fund.com',toAddresses:['investors@upaidown.com'],ccAddresses:[],subject:'Diligence',text:'Hello team',occurredAt:'2026-08-22T10:00:00Z',deliveryStatus:'READ',contactEmail:'investor@fund.com'});
});

test('IMAP messages group replies and recognise functional sending identities',()=>{
  const incoming=normalizeImapEmail({seq:1,uid:44,envelope:{from:[{address:'Investor@Fund.com'}],to:[{address:'investors@upaidown.com'}],subject:'Re: Diligence'},internalDate:'2026-08-23T10:00:00Z',flags:new Set(['\\Seen'])},'Reply body','investors@upaidown.com',['nda@upaidown.com'],'981');
  const outbound=normalizeImapEmail({seq:2,uid:45,envelope:{from:[{address:'nda@upaidown.com'}],to:[{address:'investor@fund.com'}],subject:'Diligence'},internalDate:'2026-08-23T09:00:00Z',flags:new Set()},'Initial body','investors@upaidown.com',['nda@upaidown.com'],'981');
  assert.equal(incoming.direction,'INBOUND');
  assert.equal(outbound.direction,'OUTBOUND');
  assert.equal(incoming.contactEmail,'investor@fund.com');
  assert.equal(incoming.remoteThreadId,outbound.remoteThreadId);
  assert.equal(incoming.providerMessageId,'imap:investors@upaidown.com:981:44');
});

test('NDA content hash is deterministic and detects a paragraph change',()=>{
  const a={version:'v1',title:'NDA',paragraphs:['One','Two']};
  const b={title:'NDA',paragraphs:['One','Two'],version:'v1'};
  const changed={version:'v1',title:'NDA',paragraphs:['One','Changed']};
  assert.equal(ndaContentHash(a),ndaContentHash(b));
  assert.notEqual(ndaContentHash(a),ndaContentHash(changed));
});
