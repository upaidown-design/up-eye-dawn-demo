import type {FormEvent, ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import {Link, Navigate, useLocation, useNavigate, useParams} from 'react-router-dom';
import {runtimeConfig} from './runtime-config';

type AccessStatus = {granted: boolean; reason: string; role?: string; fullName?: string; email?: string};
type NdaDocument = {
  invitation: {publicId: string; name: string; organisationName: string; purpose: string; intendedRecipientEmail?: string};
  version: string; status: string; title: string; disclosingParty: string; notice: string; paragraphs: string[];
  privacy: {legalStatus: string; controller: string; contact: string; purpose: string; data: string; retention: string; rights: string};
};
type AgendaItem = {time: string; title: string; objective: string};
type PresentationItem = {step: string; screen: string; message: string};
type Briefing = {classification: string; meeting: {title: string; duration: string; status: string; owner: string}; agenda: AgendaItem[]; visit: string[]; presentation: PresentationItem[]; speech: Record<string, string>; questions: string[]; nda: {version: string; status: string; title: string; notice: string}; defaultInviteUrl: string | null};
type Dashboard = {kpis: Record<string, number>; recentActivity: Array<{event_type: string; severity: string; actor_type: string; timestamp_utc: string; masked_ip: string}>};
type Invitation = {id: string; public_id: string; name: string; organisation_name: string; policy: string; created_at: string; expires_at: string; registration_count: number; max_registrations: number | null; manual_approval_required: boolean; status: string; nda_version: string; visitor_count: number};
type Visitor = {id: string; full_name: string; email: string; organisation: string; role: string; country: string; status: string; created_at: string; last_access_at: string | null; invitation_name: string; nda_version: string; accepted_at_utc: string; masked_ip: string; email_delivery_status: string; session_status: string};
type Acceptance = {id: string; visitor_id: string; full_name: string; email: string; organisation: string; nda_version: string; accepted_at_utc: string; evidence_hash: string; pdf_sha256: string; email_delivery_status: string; masked_ip: string; revoked_at: string | null};
type Security = {externalPortal: string; ndaLegalStatus: string; privacyLegalStatus: string; adminMfa: string; smtp: string; https: string; secureCookies: boolean; trustedProxy: string; activeSessions: number; securityEvents7d: number; productionReady: boolean};
type VisitorDetail = {identity: Visitor & {invitation_public_id: string; policy: string}; acceptances: Acceptance[]; sessions: Array<{id: string; status: string; created_at: string; expires_at: string; last_activity_at: string; invalidation_reason: string | null}>; activity: Array<{event_type: string; severity: string; timestamp_utc: string; masked_ip: string}>};
type InvitationDetail = Invitation & {description: string; intended_recipient_email: string | null; allowed_email_domain: string | null; visitors: Array<{id: string; full_name: string; email: string; organisation: string; status: string; created_at: string; last_access_at: string | null}>};

const API = runtimeConfig.apiBase;

function cookieValue(name: string) {
  return document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}

async function api<T>(path: string, options?: RequestInit) {
  const method = options?.method?.toUpperCase() ?? 'GET';
  const csrf = cookieValue('__Host-ued-admin-csrf') || cookieValue('ued_admin_csrf');
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(method !== 'GET' ? {'content-type': 'application/json'} : {}),
      ...(csrf && method !== 'GET' ? {'x-csrf-token': csrf} : {}),
      ...(options?.headers ?? {}),
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('json') ? await response.json().catch(() => ({})) : await response.text();
  if (!response.ok) throw Object.assign(new Error((data as {error?: string}).error ?? `Request failed: ${response.status}`), {status: response.status, data});
  return data as T;
}

const date = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';
const statusLabel = (value?: string | null) => (value || 'UNKNOWN').replaceAll('_', ' ');

export function ProtectedInvestorRoute({children, adminOnly = false}: {children: ReactNode; adminOnly?: boolean}) {
  const [status, setStatus] = useState<AccessStatus | null>(null);
  useEffect(() => { let active = true; api<AccessStatus>('/access/status').then((value) => active && setStatus(value)).catch(() => active && setStatus({granted: false, reason: 'SERVICE_UNAVAILABLE'})); return () => { active = false; }; }, []);
  if (!status) return <Loading text="Verifying confidential access…"/>;
  if (adminOnly && status.role !== 'OWNER' && status.role !== 'ADMIN') return <Navigate to="/admin/login" replace/>;
  if (!status.granted) {
    const routes: Record<string, string> = {NETWORK_CHANGED: '/access/reverify', SESSION_EXPIRED: '/access/expired', ACCESS_REVOKED: '/access/revoked', NDA_REVOKED: '/access/revoked', NDA_UPDATE_REQUIRED: '/access/reverify'};
    return <Navigate to={routes[status.reason] ?? '/access'} replace state={{reason: status.reason}}/>;
  }
  return <>{children}</>;
}

function Loading({text}: {text: string}) {
  return <main className="access-loading"><div className="access-spinner"/><p>{text}</p></main>;
}

export function AdminLogin() {
  const nav = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [mfaCode, setMfaCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api<{authenticated: boolean}>('/admin/session').then(() => nav('/admin', {replace: true})).catch(() => {}); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api('/admin/login', {method: 'POST', body: JSON.stringify({email, password, mfaCode})}); nav('/admin', {replace: true}); } catch { setError('The credentials or verification code are incorrect.'); } finally { setBusy(false); } };
  return <main className="secure-shell"><section className="secure-brand"><p>UP-EYE-DAWN · PRIVATE OPERATIONS</p><h1>Investor access,<br/>under control.</h1><span>Invitations, individual visitors, NDA evidence, active sessions and meeting materials are managed in one auditable workspace.</span></section><section className="secure-panel login-panel"><div><p className="secure-kicker">ADMINISTRATOR ACCESS</p><h2>Sign in</h2><p>Use administrator credentials. Production access requires MFA.</p></div><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required/></label><label>Authenticator code <small>when enabled</small><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="secure-primary" disabled={busy}>{busy ? 'VERIFYING…' : 'ENTER PRIVATE PORTAL'}</button></form><small>Admin and visitor sessions are separate, HTTP-only, time-limited and bound to their network context.</small></section></main>;
}

function AccessState({kind}: {kind: string}) {
  const content: Record<string, {kicker: string; title: string; body: string}> = {
    invalid: {kicker: 'CONFIDENTIAL ACCESS', title: 'Invitation required', body: 'Open the private invitation sent to you. Possessing another visitor’s browser session never grants access.'},
    expired: {kicker: 'SESSION EXPIRED', title: 'Your secure session has expired.', body: 'Use your invitation to verify your identity and acknowledgement again.'},
    revoked: {kicker: 'ACCESS REVOKED', title: 'This access is no longer active.', body: 'Contact the UP-EYE-DAWN meeting owner if you believe this is unexpected.'},
    reverify: {kicker: 'NETWORK CONTEXT CHANGED', title: 'Please verify your access again.', body: 'To protect the confidential material, individual verification is required after a network change.'},
    pending: {kicker: 'PENDING APPROVAL', title: 'Your request has been recorded.', body: 'An administrator must approve access. This page checks for approval automatically.'},
  };
  const item = content[kind] ?? content.invalid!;
  return <main className="access-denied"><p className="secure-kicker">{item.kicker}</p><h1>{item.title}</h1><p>{item.body}</p><Link to="/preflight">Return to public preflight</Link></main>;
}

export function NdaAccessPage() {
  const {inviteToken = ''} = useParams(); const nav = useNavigate(); const location = useLocation(); const [documentData, setDocumentData] = useState<NdaDocument | null>(null); const [mode, setMode] = useState('loading'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [complete, setComplete] = useState<{emailStatus: string; legalStatus: string} | null>(null);
  const loadDocument = () => api<NdaDocument>('/access/document').then((value) => { setDocumentData(value); setMode('form'); }).catch(() => setMode('invalid'));
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (inviteToken) {
        try { await api('/access/invitations/prepare', {method: 'POST', body: JSON.stringify({token: inviteToken})}); if (active) nav('/access', {replace: true}); }
        catch (reason) { if (!active) return; setMode((reason as Error).message === 'REGISTRATION_LIMIT_REACHED' ? 'full' : 'invalid'); }
        return;
      }
      if (location.pathname.endsWith('/expired')) return setMode('expired');
      if (location.pathname.endsWith('/revoked')) return setMode('revoked');
      try {
        const status = await api<AccessStatus>('/access/status');
        if (!active) return;
        if (status.granted) return setComplete({emailStatus: 'RECORDED', legalStatus: 'ACCEPTED'});
        if (status.reason === 'PENDING_APPROVAL') return setMode('pending');
        if (status.reason === 'ACCESS_REVOKED' || status.reason === 'NDA_REVOKED') return setMode('revoked');
        if (status.reason === 'SESSION_EXPIRED') return setMode('expired');
        await loadDocument();
      } catch { if (active) await loadDocument(); }
    };
    void run(); return () => { active = false; };
  }, [inviteToken, location.pathname]);
  useEffect(() => { if (mode !== 'pending') return; const timer = window.setInterval(() => { api<AccessStatus>('/access/status').then((status) => { if (status.granted) setComplete({emailStatus: 'SENT', legalStatus: 'ACCEPTED'}); if (status.reason === 'ACCESS_REVOKED') setMode('revoked'); }).catch(() => {}); }, 5000); return () => window.clearInterval(timer); }, [mode]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try {
      const result = await api<{granted: boolean; reason: string; emailStatus: string; legalStatus: string}>('/access/register', {method: 'POST', body: JSON.stringify({fullName: form.get('fullName'), email: form.get('email'), organisation: form.get('organisation'), role: form.get('role'), country: form.get('country'), typedSignature: form.get('typedSignature'), ndaConfirmed: form.get('ndaConfirmed') === 'on', privacyConfirmed: form.get('privacyConfirmed') === 'on'})});
      if (result.reason === 'PENDING_APPROVAL') setMode('pending'); else setComplete(result);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : 'REGISTRATION_FAILED';
      setError(code === 'INVALID_REGISTRATION' ? 'Review every field. The typed acknowledgement must exactly match your full name.' : code === 'REGISTRATION_NOT_AVAILABLE' ? 'Registration is not available for the details supplied.' : statusLabel(code));
    } finally { setBusy(false); }
  };
  if (complete) return <main className="access-complete"><div className="complete-mark">✓</div><p className="secure-kicker">ACCESS VERIFIED</p><h1>Individual access is active.</h1><p>Your acknowledgement and independent secure session have been recorded. Email delivery: <b>{statusLabel(complete.emailStatus)}</b>.</p><div className="complete-actions"><button className="secure-primary" onClick={() => nav('/investor')}>ENTER PRIVATE INVESTOR ROOM</button><a href={`${API}/access/nda-copy`} target="_blank" rel="noreferrer">Download NDA evidence</a></div><small>Access remains bound to this browser session and network context. IP alone is never treated as identity.</small></main>;
  if (mode === 'loading') return <Loading text="Preparing controlled access…"/>;
  if (mode === 'pending') return <AccessState kind="pending"/>;
  if (mode === 'expired' || mode === 'revoked' || mode === 'invalid' || mode === 'full') return <AccessState kind={mode === 'full' ? 'invalid' : mode}/>;
  if (!documentData) return <AccessState kind="invalid"/>;
  const reverify = documentData.invitation.purpose === 'REVERIFY' || location.pathname.endsWith('/reverify');
  return <main className="nda-shell"><section className="nda-intro"><p className="secure-kicker">{reverify ? 'SECURE RE-VERIFICATION' : 'PRIVATE INVESTOR ACCESS'} · {documentData.version}</p><h1>{reverify ? 'Your network changed. Verify the individual record again.' : 'Confidential materials begin with an individual record.'}</h1><p>Review the document, provide your business identity and type your full name as an electronic acknowledgement.</p><div className={`legal-status ${documentData.status === 'APPROVED' ? 'approved' : 'draft'}`}>{statusLabel(documentData.status)}</div><small>{documentData.notice}</small></section><section className="nda-workspace"><article className="nda-document"><header><span>UP-EYE-DAWN</span><b>{documentData.version}</b></header><h2>{documentData.title}</h2><p><strong>Disclosing party:</strong> {documentData.disclosingParty}</p>{documentData.paragraphs.map((paragraph, index) => <p key={paragraph}><i>{String(index + 1).padStart(2, '0')}</i>{paragraph}</p>)}<aside><b>Privacy and access record · {statusLabel(documentData.privacy.legalStatus)}</b><p>{documentData.privacy.purpose}</p><p>{documentData.privacy.data}</p><p>{documentData.privacy.retention}</p><p>{documentData.privacy.rights} Contact: {documentData.privacy.contact}</p></aside></article><form className="nda-form" onSubmit={submit}><div className="form-heading"><span>RECIPIENT DETAILS</span><h2>{reverify ? 'Verify again' : 'Create your record'}</h2></div><label>Full legal name<input name="fullName" autoComplete="name" required/></label><label>Business email<input name="email" type="email" autoComplete="email" defaultValue={documentData.invitation.intendedRecipientEmail ?? ''} required/></label><label>Organisation<input name="organisation" autoComplete="organization" defaultValue={documentData.invitation.organisationName} required/></label><div className="form-pair"><label>Role<input name="role" autoComplete="organization-title"/></label><label>Country<input name="country" autoComplete="country-name" required/></label></div><label className="signature-field">Typed acknowledgement<input name="typedSignature" autoComplete="name" required/><small>Must exactly match the full legal name above.</small></label><label className="check-field"><input name="ndaConfirmed" type="checkbox" required/><span>I have read and accept the NDA shown on this page.</span></label><label className="check-field"><input name="privacyConfirmed" type="checkbox" required/><span>I acknowledge the privacy notice and processing of technical identifiers for access security.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="secure-primary" disabled={busy}>{busy ? 'RECORDING…' : 'ACCEPT NDA & CONTINUE'}</button><small className="form-footnote">The system creates versioned, timestamped evidence and a PDF. It does not classify this acknowledgement as a qualified or advanced electronic signature.</small></form></section></main>;
}

function AdminNav({logout}: {logout: () => void}) {
  return <><header className="admin-topbar"><div><p>UP-EYE-DAWN · ADMIN CONFIDENTIAL</p><h1>Private Investor Access Control</h1></div><div><Link to="/investor">Open investor room</Link><button onClick={logout}>Sign out</button></div></header><nav className="admin-suite-nav"><Link to="/admin">Control room</Link><Link to="/admin/invitations">Invitations</Link><Link to="/admin/visitors">Visitors</Link><Link to="/admin/nda">NDA ledger</Link><Link to="/admin/meeting">Meeting</Link><Link to="/admin/security">Security</Link></nav></>;
}

function StatusPill({value}: {value: string}) { return <em className={`portal-status ${value.toLowerCase()}`}>{statusLabel(value)}</em>; }

export function AdminPortal() {
  const nav = useNavigate(); const location = useLocation(); const section = location.pathname.split('/')[2] || 'dashboard';
  const [briefing, setBriefing] = useState<Briefing | null>(null); const [dashboard, setDashboard] = useState<Dashboard | null>(null); const [invitations, setInvitations] = useState<Invitation[]>([]); const [visitors, setVisitors] = useState<Visitor[]>([]); const [acceptances, setAcceptances] = useState<Acceptance[]>([]); const [security, setSecurity] = useState<Security | null>(null); const [selectedVisitor, setSelectedVisitor] = useState<VisitorDetail | null>(null); const [selectedInvitation, setSelectedInvitation] = useState<InvitationDetail | null>(null); const [newLink, setNewLink] = useState(''); const [error, setError] = useState('');
  const load = async () => {
    try {
      const [b, d, i, v, a, s] = await Promise.all([api<Briefing>('/admin/briefing'), api<Dashboard>('/admin/dashboard'), api<Invitation[]>('/admin/invitations'), api<Visitor[]>('/admin/visitors'), api<Acceptance[]>('/admin/nda'), api<Security>('/admin/security')]);
      setBriefing(b); setDashboard(d); setInvitations(i); setVisitors(v); setAcceptances(a); setSecurity(s);
    } catch (reason) { if ((reason as {status?: number}).status === 401) nav('/admin/login', {replace: true}); else setError('Private control data could not be loaded.'); }
  };
  useEffect(() => { void load(); }, []);
  const logout = async () => { await api('/admin/logout', {method: 'POST', body: '{}'}); nav('/admin/login', {replace: true}); };
  const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); const policy = String(form.get('policy')); const maxRaw = String(form.get('maxRegistrations') || '');
    try { const result = await api<{shareUrl: string}>('/admin/invitations', {method: 'POST', body: JSON.stringify({name: form.get('name'), description: form.get('description'), organisationName: form.get('organisationName'), intendedRecipientEmail: form.get('intendedRecipientEmail'), allowedEmailDomain: form.get('allowedEmailDomain'), policy, maxRegistrations: policy === 'SINGLE_VISITOR' ? 1 : maxRaw ? Number(maxRaw) : null, expiresAt: new Date(String(form.get('expiresAt'))).toISOString(), manualApprovalRequired: form.get('manualApprovalRequired') === 'on', ndaVersion: briefing?.nda.version, internalNotes: form.get('internalNotes'), scopes: ['INVESTOR']})}); setNewLink(result.shareUrl); event.currentTarget.reset(); await load(); }
    catch (reason) { setError(statusLabel((reason as Error).message)); }
  };
  const reasonAction = async (path: string, message: string) => { const reason = prompt(message); if (!reason) return; await api(path, {method: 'POST', body: JSON.stringify({reason})}); setSelectedVisitor(null); setSelectedInvitation(null); await load(); };
  const approve = async (id: string) => { await api(`/admin/visitors/${id}/approve`, {method: 'POST', body: '{}'}); setSelectedVisitor(await api<VisitorDetail>(`/admin/visitors/${id}`)); await load(); };
  const openVisitor = async (id: string) => setSelectedVisitor(await api<VisitorDetail>(`/admin/visitors/${id}`));
  const openInvitation = async (id: string) => setSelectedInvitation(await api<InvitationDetail>(`/admin/invitations/${id}`));
  if (!briefing || !dashboard || !security) return <Loading text={error || 'Loading private control room…'}/>;
  return <main className="admin-portal"><AdminNav logout={logout}/>{error && <div className="admin-error" role="alert">{error}</div>}
    {section === 'dashboard' && <DashboardView dashboard={dashboard} security={security}/>} 
    {section === 'invitations' && <InvitationsView invitations={invitations} briefing={briefing} newLink={newLink} createInvitation={createInvitation} openInvitation={openInvitation} selected={selectedInvitation} close={() => setSelectedInvitation(null)} revoke={(id) => void reasonAction(`/admin/invitations/${id}/revoke`, 'Reason for revoking this invitation')}/>} 
    {section === 'visitors' && <VisitorsView visitors={visitors} openVisitor={openVisitor} selected={selectedVisitor} close={() => setSelectedVisitor(null)} approve={approve} revoke={(id) => void reasonAction(`/admin/visitors/${id}/revoke`, 'Reason for revoking this visitor') } reverify={(id) => void api(`/admin/visitors/${id}/reverify`, {method: 'POST', body: '{}'}).then(load)}/>} 
    {section === 'nda' && <NdaLedger acceptances={acceptances} revoke={(id) => void reasonAction(`/admin/nda/${id}/revoke`, 'Reason for revoking this NDA acceptance')}/>} 
    {section === 'meeting' && <MeetingView briefing={briefing}/>} 
    {section === 'security' && <SecurityView security={security} events={dashboard.recentActivity}/>} 
  </main>;
}

function DashboardView({dashboard, security}: {dashboard: Dashboard; security: Security}) {
  const labels: Record<string, string> = {invitations_issued: 'Invitations issued', active_invitations: 'Active invitations', registered_visitors: 'Registered visitors', pending_approvals: 'Pending approvals', nda_accepted: 'NDA accepted', active_sessions: 'Active sessions', expired_sessions: 'Expired sessions', revoked_access: 'Revoked access'};
  return <section className="admin-page"><header className="admin-page-hero"><div><p>CONTROL ROOM · LIVE DATA</p><h2>Private investor access, visible end to end.</h2></div><aside><StatusPill value={security.productionReady ? 'PRODUCTION READY' : 'LOCAL TESTING'}/><p>External mode: {security.externalPortal}<br/>Legal gates remain authoritative.</p></aside></header><div className="kpi-strip">{Object.entries(labels).map(([key, label]) => <article key={key}><span>{label}</span><strong>{dashboard.kpis[key] ?? 0}</strong></article>)}</div><section className="activity-panel"><header><div><p>AUDIT LEDGER</p><h3>Recent activity</h3></div><span>{dashboard.recentActivity.length} events</span></header>{dashboard.recentActivity.map((event, index) => <div className="activity-row" key={`${event.timestamp_utc}-${index}`}><StatusPill value={event.severity}/><b>{statusLabel(event.event_type)}</b><span>{event.actor_type}</span><code>{event.masked_ip}</code><time>{date(event.timestamp_utc)}</time></div>)}</section></section>;
}

function InvitationsView({invitations, briefing, newLink, createInvitation, openInvitation, selected, close, revoke}: {invitations: Invitation[]; briefing: Briefing; newLink: string; createInvitation: (event: FormEvent<HTMLFormElement>) => void; openInvitation: (id: string) => void; selected: InvitationDetail | null; close: () => void; revoke: (id: string) => void}) {
  const defaultExpiry = useMemo(() => { const value = new Date(Date.now() + 30 * 86400000); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 16); }, []);
  return <section className="admin-page"><header className="admin-page-heading"><div><p>CONTROLLED DISTRIBUTION</p><h2>Invitations</h2></div><span>Invitation ≠ identity ≠ session</span></header><div className="invitation-layout"><form className="portal-form" onSubmit={createInvitation}><h3>Create private invitation</h3><label>Name<input name="name" placeholder="Fund A · New York" required/></label><label>Organisation<input name="organisationName"/></label><label>Description<textarea name="description" rows={2}/></label><div className="form-pair"><label>Specific recipient email<input name="intendedRecipientEmail" type="email"/></label><label>Allowed email domain<input name="allowedEmailDomain" placeholder="fund.com"/></label></div><div className="form-pair"><label>Policy<select name="policy" defaultValue="MULTI_VISITOR"><option>SINGLE_VISITOR</option><option>MULTI_VISITOR</option></select></label><label>Maximum registrations<input name="maxRegistrations" type="number" min="1" defaultValue="5"/></label></div><label>Expires<input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required/></label><label className="check-field"><input name="manualApprovalRequired" type="checkbox"/><span>Require administrator approval before session activation.</span></label><label>Internal notes<textarea name="internalNotes" rows={2}/></label><input type="hidden" name="ndaVersion" value={briefing.nda.version}/><button className="secure-primary">CREATE PRIVATE INVITATION</button><small>Token plaintext is returned once and only its HMAC is stored.</small>{newLink && <div className="one-time-link"><b>SECURE LINK · SHOWN ONCE</b><code>{newLink}</code><button type="button" onClick={() => navigator.clipboard.writeText(newLink)}>COPY SECURE LINK</button></div>}</form><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Invitation</th><th>Policy</th><th>Registrations</th><th>NDA</th><th>Expires</th><th>Status</th></tr></thead><tbody>{invitations.map((item) => <tr key={item.id} onClick={() => openInvitation(item.id)}><td><b>{item.name}</b><small>{item.organisation_name || item.public_id}</small></td><td>{statusLabel(item.policy)}<small>{item.manual_approval_required ? 'Manual approval' : 'Automatic'}</small></td><td>{item.registration_count} / {item.max_registrations ?? '∞'}</td><td>{item.nda_version}</td><td>{date(item.expires_at)}</td><td><StatusPill value={item.status}/></td></tr>)}</tbody></table></div></div>{selected && <SideDetail title={selected.name} close={close}><div className="detail-facts"><span>Public ID<b>{selected.public_id}</b></span><span>Registrations<b>{selected.registration_count} / {selected.max_registrations ?? '∞'}</b></span><span>Policy<b>{statusLabel(selected.policy)}</b></span><span>NDA<b>{selected.nda_version}</b></span><span>Allowed domain<b>{selected.allowed_email_domain || 'Any'}</b></span><span>Recipient<b>{selected.intended_recipient_email || 'Any'}</b></span></div><h4>Individual registrations</h4>{selected.visitors.map((visitor) => <article className="detail-record" key={visitor.id}><b>{visitor.full_name}</b><span>{visitor.email}</span><StatusPill value={visitor.status}/></article>)}{!selected.visitors.length && <p>No registrations yet.</p>}{selected.status !== 'REVOKED' && <button className="danger-action" onClick={() => revoke(selected.id)}>REVOKE INVITATION</button>}</SideDetail>}</section>;
}

function VisitorsView({visitors, openVisitor, selected, close, approve, revoke, reverify}: {visitors: Visitor[]; openVisitor: (id: string) => void; selected: VisitorDetail | null; close: () => void; approve: (id: string) => void; revoke: (id: string) => void; reverify: (id: string) => void}) {
  return <section className="admin-page"><header className="admin-page-heading"><div><p>INDIVIDUAL IDENTITY LEDGER</p><h2>Visitors</h2></div><a className="admin-download" href={`${API}/admin/visitors.csv`}>EXPORT MASKED CSV</a></header><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Name</th><th>Organisation</th><th>Invitation</th><th>NDA</th><th>Last access</th><th>Network</th><th>Status</th></tr></thead><tbody>{visitors.map((visitor) => <tr key={visitor.id} onClick={() => openVisitor(visitor.id)}><td><b>{visitor.full_name}</b><small>{visitor.email}</small></td><td>{visitor.organisation}<small>{visitor.role || visitor.country}</small></td><td>{visitor.invitation_name}</td><td>{visitor.nda_version || '—'}<small>{date(visitor.accepted_at_utc)}</small></td><td>{date(visitor.last_access_at)}</td><td><code>{visitor.masked_ip || '—'}</code></td><td><StatusPill value={visitor.status}/></td></tr>)}</tbody></table>{!visitors.length && <p className="empty-ledger">No visitors registered yet.</p>}</div>{selected && <SideDetail title={selected.identity.full_name} close={close}><div className="detail-facts"><span>Email<b>{selected.identity.email}</b></span><span>Organisation<b>{selected.identity.organisation}</b></span><span>Role / country<b>{selected.identity.role || '—'} · {selected.identity.country}</b></span><span>Invitation<b>{selected.identity.invitation_name}</b></span><span>Status<b>{statusLabel(selected.identity.status)}</b></span><span>Last access<b>{date(selected.identity.last_access_at)}</b></span></div><div className="detail-actions">{selected.identity.status === 'PENDING_APPROVAL' && <button onClick={() => approve(selected.identity.id)}>APPROVE</button>}<button onClick={() => reverify(selected.identity.id)}>REQUIRE RE-VERIFICATION</button>{selected.identity.status !== 'REVOKED' && <button className="danger-action" onClick={() => revoke(selected.identity.id)}>REVOKE ACCESS</button>}</div><h4>NDA evidence</h4>{selected.acceptances.map((item) => <article className="detail-record" key={item.id}><b>{item.nda_version}</b><span>{date(item.accepted_at_utc)}</span><code>{item.evidence_hash}</code><a href={`${API}/admin/nda/${item.id}/pdf`}>DOWNLOAD PDF</a></article>)}<h4>Sessions</h4>{selected.sessions.map((item) => <article className="detail-record" key={item.id}><StatusPill value={item.status}/><span>Created {date(item.created_at)}</span><span>Last activity {date(item.last_activity_at)}</span><small>{item.invalidation_reason || 'No invalidation reason'}</small></article>)}<h4>Audit activity</h4>{selected.activity.map((item, index) => <article className="detail-record" key={`${item.timestamp_utc}-${index}`}><b>{statusLabel(item.event_type)}</b><span>{date(item.timestamp_utc)} · {item.masked_ip}</span></article>)}</SideDetail>}</section>;
}

function NdaLedger({acceptances, revoke}: {acceptances: Acceptance[]; revoke: (id: string) => void}) {
  return <section className="admin-page"><header className="admin-page-heading"><div><p>IMMUTABLE ACCEPTANCE RECORDS</p><h2>NDA ledger</h2></div><span>{acceptances.length} evidence records</span></header><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Visitor</th><th>Organisation</th><th>Version</th><th>Accepted UTC</th><th>Evidence hash</th><th>Email</th><th>Network</th><th>Action</th></tr></thead><tbody>{acceptances.map((item) => <tr key={item.id}><td><b>{item.full_name}</b><small>{item.email}</small></td><td>{item.organisation}</td><td>{item.nda_version}</td><td>{date(item.accepted_at_utc)}</td><td><code className="hash-cell">{item.evidence_hash}</code></td><td>{statusLabel(item.email_delivery_status)}</td><td><code>{item.masked_ip}</code></td><td><a href={`${API}/admin/nda/${item.id}/pdf`}>PDF</a>{item.revoked_at ? <StatusPill value="REVOKED"/> : <button onClick={() => revoke(item.id)}>REVOKE</button>}</td></tr>)}</tbody></table>{!acceptances.length && <p className="empty-ledger">No NDA acceptances recorded yet.</p>}</div></section>;
}

function MeetingView({briefing}: {briefing: Briefing}) {
  return <section className="admin-page meeting-view"><header className="admin-page-hero"><div><p>TODAY’S MEETING · {briefing.meeting.duration}</p><h2>{briefing.meeting.title}</h2></div><aside><StatusPill value={briefing.meeting.status}/><p>{briefing.meeting.owner}<br/>{briefing.classification}</p></aside></header><section className="meeting-block"><p>01 · AGENDA</p><div className="agenda-list">{briefing.agenda.map((item) => <article key={item.time}><time>{item.time} MIN</time><h3>{item.title}</h3><p>{item.objective}</p></article>)}</div></section><section className="meeting-block"><p>02 · VISIT</p><ol className="visit-list">{briefing.visit.map((item) => <li key={item}>{item}</li>)}</ol></section><section className="meeting-block"><p>03 · PRESENTATION</p><div className="presentation-run">{briefing.presentation.map((item) => <article key={item.step}><b>{item.step}</b><h3>{item.screen}</h3><p>{item.message}</p></article>)}</div></section><section className="meeting-block"><p>04 · SPEECH</p><div className="speech-grid">{Object.entries(briefing.speech).map(([key, value]) => <article key={key}><span>{key.toUpperCase()}</span><p>“{value}”</p><button onClick={() => navigator.clipboard.writeText(value)}>COPY</button></article>)}</div></section><section className="meeting-block question-bank"><h3>Questions to ask</h3>{briefing.questions.map((question) => <p key={question}>{question}</p>)}</section></section>;
}

function SecurityView({security, events}: {security: Security; events: Dashboard['recentActivity']}) {
  const checks = [['External portal', security.externalPortal], ['NDA legal status', security.ndaLegalStatus], ['Privacy legal status', security.privacyLegalStatus], ['Admin MFA', security.adminMfa], ['SMTP', security.smtp], ['HTTPS', security.https], ['Trusted proxy', security.trustedProxy], ['Active sessions', String(security.activeSessions)], ['Security events · 7d', String(security.securityEvents7d)]];
  return <section className="admin-page"><header className="admin-page-heading"><div><p>FAIL-CLOSED CONFIGURATION</p><h2>Security center</h2></div><StatusPill value={security.productionReady ? 'PRODUCTION READY' : 'LOCAL TESTING ONLY'}/></header><div className="security-grid">{checks.map(([label, value]) => <article key={label}><span>{label}</span><b>{statusLabel(value)}</b></article>)}</div><div className="legal-warning"><b>EXTERNAL RELEASE GATE</b><p>External mode remains blocked until the NDA and privacy notice are approved, HTTPS and Secure cookies are enabled, unique production secrets are installed, and administrator MFA is mandatory.</p></div><section className="activity-panel"><header><div><p>RECENT</p><h3>Security-relevant activity</h3></div></header>{events.filter((event) => event.severity === 'SECURITY' || event.severity === 'WARNING').map((event, index) => <div className="activity-row" key={`${event.timestamp_utc}-${index}`}><StatusPill value={event.severity}/><b>{statusLabel(event.event_type)}</b><span>{event.actor_type}</span><code>{event.masked_ip}</code><time>{date(event.timestamp_utc)}</time></div>)}</section></section>;
}

function SideDetail({title, close, children}: {title: string; close: () => void; children: ReactNode}) {
  return <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><aside className="side-detail" role="dialog" aria-modal="true" aria-label={title}><header><div><p>CONTROL RECORD</p><h3>{title}</h3></div><button onClick={close} aria-label="Close detail">×</button></header>{children}</aside></div>;
}
