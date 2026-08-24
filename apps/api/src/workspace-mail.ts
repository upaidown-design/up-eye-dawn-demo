import {createHash,randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {FastifyInstance} from 'fastify';
import {ImapFlow,type FetchMessageObject,type MessageStructureObject} from 'imapflow';
import {z} from 'zod';
import type {PortalAuditFn, PortalRequireAdminFn} from './private-access.js';

const CreateThread = z.object({
  subject: z.string().trim().min(2).max(300), contactEmail: z.string().email().max(254).or(z.literal('')),
  organisation: z.string().trim().max(220).default(''), priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  nextFollowUpAt: z.string().datetime().nullable().optional(), notes: z.string().trim().max(10_000).default(''),
});
const UpdateThread = z.object({
  subject: z.string().trim().min(2).max(300).optional(), contactEmail: z.string().email().max(254).or(z.literal('')).optional(),
  organisation: z.string().trim().max(220).optional(), status: z.enum(['NEW','IN_PROGRESS','WAITING_REPLY','FOLLOW_UP_DUE','CLOSED','ARCHIVED']).optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(), nextFollowUpAt: z.string().datetime().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(), notes: z.string().trim().max(10_000).optional(),
}).refine((input)=>Object.keys(input).length>0,'At least one change is required');
const AddNote = z.object({body:z.string().trim().min(1).max(10_000)});

type Options={pool:pg.Pool;requireAdmin:PortalRequireAdminFn;requireAdminMutation:PortalRequireAdminFn;audit:PortalAuditFn};
const env=(name:string)=>process.env[name]?.trim()??'';
type JmapAddress={name?:string;email?:string};
type JmapEmail={id:string;threadId:string;from?:JmapAddress[];to?:JmapAddress[];cc?:JmapAddress[];subject?:string;receivedAt?:string;sentAt?:string;preview?:string;textBody?:Array<{partId?:string}>;bodyValues?:Record<string,{value?:string;isTruncated?:boolean}>;keywords?:Record<string,boolean>};
type NormalizedEmail={remoteThreadId:string;providerMessageId:string;direction:'INBOUND'|'OUTBOUND';fromAddress:string;toAddresses:string[];ccAddresses:string[];subject:string;text:string;occurredAt:string;deliveryStatus:string;contactEmail:string};

function addresses(items:JmapAddress[]|undefined){return (items??[]).map(item=>item.email?.trim().toLowerCase()).filter((item):item is string=>Boolean(item));}
export function normalizeJmapEmail(message:JmapEmail,account:string){
  const from=addresses(message.from),to=addresses(message.to),cc=addresses(message.cc);const outgoing=from.includes(account.trim().toLowerCase());
  const body=(message.textBody??[]).map(part=>part.partId?message.bodyValues?.[part.partId]?.value??'':'').filter(Boolean).join('\n\n').trim();
  return {remoteThreadId:message.threadId,providerMessageId:message.id,direction:outgoing?'OUTBOUND' as const:'INBOUND' as const,fromAddress:from[0]??'',toAddresses:to,ccAddresses:cc,subject:(message.subject??'(no subject)').slice(0,500),text:body||message.preview?.trim()||'',occurredAt:message.receivedAt??message.sentAt??new Date().toISOString(),deliveryStatus:message.keywords?.$draft?'DRAFT':message.keywords?.$seen?'READ':'UNREAD',contactEmail:outgoing?(to[0]??''):(from[0]??'')};
}

const normalizedSubject=(subject:string)=>subject.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i,'').trim().toLowerCase()||'(no subject)';
const htmlText=(value:string)=>value.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n').trim();
const imapAddresses=(items:Array<{address?:string}>|undefined)=>(items??[]).map(item=>item.address?.trim().toLowerCase()).filter((item):item is string=>Boolean(item));
function textPart(node:MessageStructureObject|undefined,preferred='text/plain'):MessageStructureObject|undefined{
  if(!node)return;
  if(node.type.toLowerCase()===preferred&&node.disposition?.toLowerCase()!=='attachment')return node;
  for(const child of node.childNodes??[]){const found=textPart(child,preferred);if(found)return found;}
}
async function readStream(stream:NodeJS.ReadableStream){const chunks:Buffer[]=[];for await(const chunk of stream as AsyncIterable<Buffer|string>)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));return Buffer.concat(chunks).toString('utf8').slice(0,50_000);}
export function normalizeImapEmail(message:FetchMessageObject,body:string,account:string,identities:string[],uidValidity:string):NormalizedEmail{
  const from=imapAddresses(message.envelope?.from),to=imapAddresses(message.envelope?.to),cc=imapAddresses(message.envelope?.cc);const identitySet=new Set([account,...identities].map(item=>item.trim().toLowerCase()).filter(Boolean));const outgoing=from.some(address=>identitySet.has(address));const subject=(message.envelope?.subject??'(no subject)').slice(0,500);const contactEmail=outgoing?(to.find(address=>!identitySet.has(address))??to[0]??''):(from[0]??'');
  const key=message.threadId||createHash('sha256').update(`${normalizedSubject(subject)}|${contactEmail}`).digest('hex').slice(0,40);
  const occurred=message.internalDate??message.envelope?.date??new Date();const occurredAt=occurred instanceof Date?occurred.toISOString():new Date(occurred).toISOString();
  return {remoteThreadId:`imap:${account}:${key}`,providerMessageId:`imap:${account}:${uidValidity}:${message.uid}`,direction:outgoing?'OUTBOUND':'INBOUND',fromAddress:from[0]??'',toAddresses:to,ccAddresses:cc,subject,text:body.trim(),occurredAt,deliveryStatus:message.flags?.has('\\Seen')?'READ':'UNREAD',contactEmail};
}

async function persistMessages(pool:pg.Pool,messages:NormalizedEmail[],source:string,metadata:Record<string,unknown>){const client=await pool.connect();const touched=new Set<string>();
  try{await client.query('BEGIN');for(const message of messages){if(!message.remoteThreadId||!message.providerMessageId)continue;const thread=(await client.query(`INSERT INTO private_portal.mail_threads(id,subject,contact_email,status,priority,last_message_at,remote_thread_id,source,created_at,updated_at)
      VALUES($1,$2,$3,$4,'MEDIUM',$5,$6,$7,$5,now()) ON CONFLICT(remote_thread_id) WHERE remote_thread_id IS NOT NULL DO UPDATE SET subject=excluded.subject,contact_email=CASE WHEN private_portal.mail_threads.contact_email='' THEN excluded.contact_email ELSE private_portal.mail_threads.contact_email END,status=CASE WHEN excluded.status='NEW' AND private_portal.mail_threads.status NOT IN ('CLOSED','ARCHIVED') AND (private_portal.mail_threads.last_message_at IS NULL OR excluded.last_message_at>=private_portal.mail_threads.last_message_at) THEN 'NEW' ELSE private_portal.mail_threads.status END,last_message_at=GREATEST(private_portal.mail_threads.last_message_at,excluded.last_message_at),updated_at=now() RETURNING id`,[randomUUID(),message.subject,message.contactEmail,message.direction==='INBOUND'?'NEW':'WAITING_REPLY',message.occurredAt,message.remoteThreadId,source])).rows[0];touched.add(thread.id);
      await client.query(`INSERT INTO private_portal.mail_thread_messages(id,thread_id,direction,provider_message_id,from_address,to_addresses,cc_addresses,subject,text_excerpt,occurred_at,delivery_status,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(provider_message_id) WHERE provider_message_id IS NOT NULL DO UPDATE SET thread_id=excluded.thread_id,direction=excluded.direction,from_address=excluded.from_address,to_addresses=excluded.to_addresses,cc_addresses=excluded.cc_addresses,subject=excluded.subject,text_excerpt=excluded.text_excerpt,occurred_at=excluded.occurred_at,delivery_status=excluded.delivery_status,metadata=excluded.metadata`,[randomUUID(),thread.id,message.direction,message.providerMessageId,message.fromAddress,message.toAddresses,message.ccAddresses,message.subject,message.text.slice(0,50_000),message.occurredAt,message.deliveryStatus,JSON.stringify(metadata)]);}
    await client.query('COMMIT');return {synced:messages.length,threads:touched.size};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function jmapRequest(url:string,token:string,body?:unknown){const init:RequestInit={method:body?'POST':'GET',headers:{authorization:`Bearer ${token}`,...(body?{'content-type':'application/json'}:{})},signal:AbortSignal.timeout(20_000),...(body?{body:JSON.stringify(body)}:{})};const response=await fetch(url,init);if(!response.ok)throw new Error(`JMAP_HTTP_${response.status}`);return response.json() as Promise<Record<string,unknown>>;}

async function syncJmap(pool:pg.Pool){
  const sessionUrl=env('MAIL_JMAP_URL'),token=env('MAIL_JMAP_TOKEN'),accountAddress=env('MAIL_JMAP_ACCOUNT');if(!sessionUrl||!token||!accountAddress)throw new Error('MAILBOX_NOT_CONFIGURED');
  const session=await jmapRequest(sessionUrl,token);const apiUrl=String(session.apiUrl??'');const primary=session.primaryAccounts as Record<string,string>|undefined;const accountId=primary?.['urn:ietf:params:jmap:mail'];if(!apiUrl||!accountId)throw new Error('JMAP_SESSION_INVALID');
  const query=await jmapRequest(apiUrl,token,{using:['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail'],methodCalls:[['Email/query',{accountId,sort:[{property:'receivedAt',isAscending:false}],limit:100},'q']]});
  const queryResponses=query.methodResponses as Array<[string,Record<string,unknown>,string]>|undefined;const ids=(queryResponses?.find(item=>item[0]==='Email/query')?.[1]?.ids??[]) as string[];if(!ids.length)return {synced:0,threads:0};
  const fetched=await jmapRequest(apiUrl,token,{using:['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail'],methodCalls:[['Email/get',{accountId,ids,properties:['id','threadId','from','to','cc','subject','receivedAt','sentAt','preview','textBody','bodyValues','keywords'],fetchTextBodyValues:true,maxBodyValueBytes:50_000},'g']]});
  const getResponses=fetched.methodResponses as Array<[string,Record<string,unknown>,string]>|undefined;const messages=((getResponses?.find(item=>item[0]==='Email/get')?.[1]?.list??[]) as JmapEmail[]).map(raw=>normalizeJmapEmail(raw,accountAddress));return persistMessages(pool,messages,'JMAP',{protocol:'JMAP'});
}

const imapConfigured=()=>Boolean(env('MAIL_IMAP_HOST')&&env('MAIL_IMAP_ACCOUNT')&&env('MAIL_IMAP_PASSWORD'));
async function syncImap(pool:pg.Pool){
  const host=env('MAIL_IMAP_HOST'),account=env('MAIL_IMAP_ACCOUNT'),password=env('MAIL_IMAP_PASSWORD');if(!host||!account||!password)throw new Error('MAILBOX_NOT_CONFIGURED');const secure=env('MAIL_IMAP_SECURE')!=='false';const port=Number(env('MAIL_IMAP_PORT')|| (secure?'993':'143'));if(!Number.isInteger(port)||port<1||port>65535)throw new Error('MAIL_IMAP_PORT_INVALID');
  const client=new ImapFlow({host,port,secure,servername:env('MAIL_IMAP_TLS_SERVERNAME')||host,auth:{user:account,pass:password},logger:false,disableAutoIdle:true,connectionTimeout:15_000,greetingTimeout:15_000,socketTimeout:30_000});
  try{await client.connect();const mailbox=await client.mailboxOpen('INBOX',{readOnly:true});if(!mailbox.exists)return {synced:0,threads:0};const start=Math.max(1,mailbox.exists-99);const fetched=await client.fetchAll(`${start}:*`,{uid:true,flags:true,envelope:true,bodyStructure:true,internalDate:true,threadId:true});const identities=env('MAIL_IMAP_IDENTITIES').split(',');const normalized:NormalizedEmail[]=[];
    for(const message of fetched){const plain=textPart(message.bodyStructure,'text/plain'),html=plain?undefined:textPart(message.bodyStructure,'text/html'),part=plain??html;let body='';if(part){const download=await client.download(String(message.uid),part.part||'1',{uid:true,maxBytes:50_000});body=await readStream(download.content);if(html)body=htmlText(body);}normalized.push(normalizeImapEmail(message,body,account,identities,String(mailbox.uidValidity)));}
    return await persistMessages(pool,normalized,'IMAP',{protocol:'IMAP',mailbox:'INBOX'});
  }finally{await client.logout().catch(()=>undefined);}
}

export function registerMailCenterRoutes(app:FastifyInstance,{pool,requireAdmin,requireAdminMutation,audit}:Options){
  app.get('/api/v1/admin/mail',async(request,reply)=>{
    if(!await requireAdmin(request,reply))return;
    const jmapUrl=env('MAIL_JMAP_URL'); const webmailUrl=env('MAIL_WEBMAIL_URL'); const mailboxAccount=env('MAIL_JMAP_ACCOUNT')||env('MAIL_IMAP_ACCOUNT');const hasJmap=Boolean(jmapUrl&&env('MAIL_JMAP_ACCOUNT')&&env('MAIL_JMAP_TOKEN'));const hasImap=imapConfigured();
    const [threads,deliveries,counts]=await Promise.all([
      pool.query(`SELECT t.*,u.display_name assigned_to_name,(SELECT count(*)::int FROM private_portal.mail_thread_notes n WHERE n.thread_id=t.id) note_count FROM private_portal.mail_threads t LEFT JOIN private_portal.admin_users u ON u.id=t.assigned_to WHERE t.status<>'ARCHIVED' ORDER BY COALESCE(t.next_follow_up_at,t.updated_at) ASC LIMIT 300`),
      pool.query(`SELECT e.id,e.kind,e.recipient,e.status,e.provider_message_id,e.created_at,e.sent_at,e.error_code,v.full_name,i.name invitation_name FROM private_portal.email_deliveries e LEFT JOIN private_portal.visitors v ON v.id=e.visitor_id LEFT JOIN private_portal.invitations i ON i.id=e.invitation_id ORDER BY e.created_at DESC LIMIT 200`),
      pool.query(`SELECT count(*) FILTER(WHERE status NOT IN ('CLOSED','ARCHIVED'))::int open,count(*) FILTER(WHERE next_follow_up_at<=now() AND status NOT IN ('CLOSED','ARCHIVED'))::int due,count(*) FILTER(WHERE status='WAITING_REPLY')::int waiting FROM private_portal.mail_threads`),
    ]);
    return {mailbox:{configured:hasJmap||hasImap,jmapConfigured:hasJmap,imapConfigured:hasImap,webmailConfigured:Boolean(webmailUrl),webmailUrl:webmailUrl||null,account:mailboxAccount||null,provider:env('MAIL_SERVER_PROVIDER')||'NOT_CONFIGURED'},counts:counts.rows[0],threads:threads.rows,deliveries:deliveries.rows};
  });
  app.get('/api/v1/admin/mail/threads/:id',async(request,reply)=>{if(!await requireAdmin(request,reply))return;const id=(request.params as {id:string}).id;const [thread,messages,notes]=await Promise.all([pool.query('SELECT * FROM private_portal.mail_threads WHERE id=$1',[id]),pool.query('SELECT * FROM private_portal.mail_thread_messages WHERE thread_id=$1 ORDER BY occurred_at',[id]),pool.query(`SELECT n.*,u.display_name created_by_name FROM private_portal.mail_thread_notes n JOIN private_portal.admin_users u ON u.id=n.created_by WHERE n.thread_id=$1 ORDER BY n.created_at`,[id])]);if(!thread.rowCount)return reply.code(404).send({error:'NOT_FOUND'});return {...thread.rows[0],messages:messages.rows,threadNotes:notes.rows};});
  app.post('/api/v1/admin/mail/threads',async(request,reply)=>{const admin=await requireAdminMutation(request,reply,['OWNER','ADMIN','EDITOR']);if(!admin)return;const parsed=CreateThread.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:'INVALID_MAIL_THREAD',issues:parsed.error.flatten()});const input=parsed.data,id=randomUUID();const row=(await pool.query(`INSERT INTO private_portal.mail_threads(id,subject,contact_email,organisation,priority,next_follow_up_at,notes,assigned_to,source,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'MANUAL',$8,$8) RETURNING *`,[id,input.subject,input.contactEmail.toLowerCase(),input.organisation,input.priority,input.nextFollowUpAt??null,input.notes,admin.admin_user_id])).rows[0];await audit('MAIL_FOLLOWUP_CREATED','NOTICE','ADMIN',request,{actorId:admin.admin_user_id,adminId:admin.admin_user_id},{threadId:id,contactEmail:input.contactEmail});return reply.code(201).send(row);});
  app.patch('/api/v1/admin/mail/threads/:id',async(request,reply)=>{const admin=await requireAdminMutation(request,reply,['OWNER','ADMIN','EDITOR']);if(!admin)return;const parsed=UpdateThread.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:'INVALID_MAIL_THREAD_UPDATE',issues:parsed.error.flatten()});const i=parsed.data,id=(request.params as {id:string}).id;const row=(await pool.query(`UPDATE private_portal.mail_threads SET subject=COALESCE($2,subject),contact_email=COALESCE($3,contact_email),organisation=COALESCE($4,organisation),status=COALESCE($5,status),priority=COALESCE($6,priority),next_follow_up_at=CASE WHEN $7 THEN $8::timestamptz ELSE next_follow_up_at END,assigned_to=CASE WHEN $9 THEN $10::uuid ELSE assigned_to END,notes=COALESCE($11,notes),updated_by=$12,updated_at=now() WHERE id=$1 RETURNING *`,[id,i.subject??null,i.contactEmail?.toLowerCase()??null,i.organisation??null,i.status??null,i.priority??null,Object.hasOwn(i,'nextFollowUpAt'),i.nextFollowUpAt??null,Object.hasOwn(i,'assignedTo'),i.assignedTo??null,i.notes??null,admin.admin_user_id])).rows[0];if(!row)return reply.code(404).send({error:'NOT_FOUND'});await audit('MAIL_FOLLOWUP_UPDATED','INFO','ADMIN',request,{actorId:admin.admin_user_id,adminId:admin.admin_user_id},{threadId:id,changed:Object.keys(i)});return row;});
  app.post('/api/v1/admin/mail/threads/:id/notes',async(request,reply)=>{const admin=await requireAdminMutation(request,reply,['OWNER','ADMIN','EDITOR']);if(!admin)return;const parsed=AddNote.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:'INVALID_MAIL_NOTE'});const threadId=(request.params as {id:string}).id;if(!(await pool.query('SELECT 1 FROM private_portal.mail_threads WHERE id=$1',[threadId])).rowCount)return reply.code(404).send({error:'NOT_FOUND'});const row=(await pool.query('INSERT INTO private_portal.mail_thread_notes(id,thread_id,body,created_by) VALUES($1,$2,$3,$4) RETURNING *',[randomUUID(),threadId,parsed.data.body,admin.admin_user_id])).rows[0];await pool.query('UPDATE private_portal.mail_threads SET updated_at=now(),updated_by=$2 WHERE id=$1',[threadId,admin.admin_user_id]);return reply.code(201).send(row);});
  app.post('/api/v1/admin/mail/sync',async(request,reply)=>{const admin=await requireAdminMutation(request,reply,['OWNER','ADMIN']);if(!admin)return;const hasJmap=Boolean(env('MAIL_JMAP_URL')&&env('MAIL_JMAP_ACCOUNT')&&env('MAIL_JMAP_TOKEN'));if(!hasJmap&&!imapConfigured())return reply.code(503).send({error:'MAILBOX_NOT_CONFIGURED'});const protocol=hasJmap?'JMAP':'IMAP';try{const result=hasJmap?await syncJmap(pool):await syncImap(pool);await audit('MAILBOX_SYNCED','NOTICE','ADMIN',request,{actorId:admin.admin_user_id,adminId:admin.admin_user_id},{...result,protocol});return result;}catch(error){request.log.error({error,protocol},'Mailbox synchronization failed');await audit('MAILBOX_SYNC_FAILED','WARNING','ADMIN',request,{actorId:admin.admin_user_id,adminId:admin.admin_user_id},{code:(error as Error).message,protocol});return reply.code(502).send({error:'MAILBOX_SYNC_FAILED'});}});
}
