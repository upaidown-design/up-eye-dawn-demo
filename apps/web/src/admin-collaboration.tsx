import type {FormEvent} from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {QRCodeSVG} from 'qrcode.react';
import {portalApi} from './portal-api';

export type TeamMember = {id: string; email: string; display_name: string; role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'; status: string; mfa_enabled: boolean; created_at: string; last_login_at: string | null; disabled_at: string | null};
export type TeamInvitation = {id: string; email: string; display_name: string; role: string; status: string; created_at: string; expires_at: string};
export type Team = {current: {id: string; email: string; role: string}; members: TeamMember[]; invitations: TeamInvitation[]};
export type ProjectDecision = {id: string; title: string; context: string; decision: string; alternatives: string; consequences: string; owner_admin_id: string | null; owner_name: string | null; status: string; decision_at: string | null; created_at: string; updated_at: string};
export type ProjectComment = {id: string; entity_type: string; entity_id: string; body: string; author_name: string; author_email: string; created_at: string};

export type MeetingKitItem = {id: string; item_type: string; language: string; title: string; body: string; classification: string; sort_order: number; status: string; linked_event_id: string | null; created_by: string; created_by_name: string; updated_at: string};
export type CrmOrganisation = {id: string; name: string; org_type: string; country: string; stage: string; owner_id: string | null; owner_name: string | null; last_interaction_at: string | null; next_action: string; next_action_at: string | null; notes: string; status: string; contact_count: number; updated_at: string};
export type CrmContact = {id: string; organisation_id: string; organisation_name: string; visitor_id: string | null; first_name: string; last_name: string; email: string; role_title: string; phone: string; is_primary: boolean; status: string};
export type MaterialItem = {id: string; title: string; material_type: string; version: string; language: string; classification: string; status: string; provenance: string; owner_name: string | null; gcs_object: string | null; external_url: string | null; approval_note: string | null; approved_by_name: string | null; notes: string; updated_at: string};

const label = (value: string) => value.replaceAll('_', ' ');
const when = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';
const Badge = ({value}: {value: string}) => <em className={`portal-status ${value.toLowerCase()}`}>{label(value)}</em>;

export function TeamView({team, reload, setError}: {team: Team; reload: () => Promise<void>; setError: (value: string) => void}) {
  const [shareUrl, setShareUrl] = useState(''); const [recoveryUrl, setRecoveryUrl] = useState(''); const [mfa, setMfa] = useState<{secret: string; otpauthUri: string} | null>(null); const [mfaCode, setMfaCode] = useState('');
  const defaultExpiry = useMemo(() => { const value = new Date(Date.now() + 7 * 86400000); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 16); }, []);
  const invite = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); try { const result = await portalApi<{shareUrl: string}>('/admin/team/invitations', {method: 'POST', body: JSON.stringify({email: data.get('email'), displayName: data.get('displayName'), role: data.get('role'), expiresAt: new Date(String(data.get('expiresAt'))).toISOString()})}); setShareUrl(result.shareUrl); form.reset(); await reload(); } catch (reason) { setError(label((reason as Error).message)); } };
  const updateMember = async (id: string, body: Record<string, unknown>) => { try { await portalApi(`/admin/team/${id}`, {method: 'PATCH', body: JSON.stringify(body)}); await reload(); } catch (reason) { setError(label((reason as Error).message)); } };
  const revoke = async (id: string) => { try { await portalApi(`/admin/team/invitations/${id}/revoke`, {method: 'POST', body: '{}'}); await reload(); } catch (reason) { setError(label((reason as Error).message)); } };
  const createRecovery = async (id: string) => { try { const result = await portalApi<{shareUrl: string}>(`/admin/team/${id}/recovery`, {method: 'POST', body: JSON.stringify({expiresAt: new Date(Date.now() + 24 * 3600000).toISOString()})}); setRecoveryUrl(result.shareUrl); } catch (reason) { setError(label((reason as Error).message)); } };
  const beginMfa = async () => { try { setMfa(await portalApi('/admin/mfa/begin', {method: 'POST', body: '{}'})); } catch (reason) { setError(label((reason as Error).message)); } };
  const confirmMfa = async () => { try { await portalApi('/admin/mfa/confirm', {method: 'POST', body: JSON.stringify({code: mfaCode})}); setMfa(null); setMfaCode(''); await reload(); } catch (reason) { setError(label((reason as Error).message)); } };
  const current = team.members.find((member) => member.id === team.current.id);
  return <section className="admin-page"><header className="admin-page-heading"><div><p>INDIVIDUAL ACCOUNTS &amp; ROLES</p><h2>Team access</h2></div><span>One identity, password, MFA factor and audit trail per person.</span></header>
    <div className="team-security-banner"><div><b>{current?.mfa_enabled ? 'MFA ACTIVE' : 'MFA ENROLLMENT REQUIRED'}</b><p>{current?.mfa_enabled ? 'Your account uses an individual authenticator factor.' : 'Enroll your owner account before enabling external production access.'}</p></div>{!current?.mfa_enabled && <button onClick={() => void beginMfa()}>ENROLL MFA</button>}</div>
    {mfa && <section className="mfa-enrollment"><QRCodeSVG value={mfa.otpauthUri} size={168} marginSize={2}/><div><h3>Scan with your authenticator app</h3><p>Then enter the current six-digit code. The secret is not shown again after confirmation.</p><code>{mfa.secret}</code><div><input aria-label="Authenticator code" inputMode="numeric" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}/><button disabled={mfaCode.length !== 6} onClick={() => void confirmMfa()}>CONFIRM MFA</button></div></div></section>}
    <div className="team-layout">{team.current.role === 'OWNER' && <form className="portal-form workspace-form" onSubmit={invite}><h3>Invite a partner</h3><label>Name<input name="displayName" required/></label><label>Email<input name="email" type="email" required/></label><label>Role<select name="role" defaultValue="EDITOR"><option value="ADMIN">Admin · investors &amp; project</option><option value="EDITOR">Editor · project workspace</option><option value="VIEWER">Viewer · read only</option></select></label><label>Expires<input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required/></label><button className="secure-primary">CREATE ONE-TIME INVITATION</button><small>The recipient creates a strong password and enrolls a unique TOTP factor before the account is activated.</small>{shareUrl && <div className="one-time-link"><b>PRIVATE TEAM LINK · SHOWN ONCE</b><code>{shareUrl}</code><button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)}>COPY PRIVATE LINK</button></div>}</form>}
      <div className="team-ledger">{recoveryUrl && <div className="one-time-link"><b>RECOVERY LINK · SHOWN ONCE</b><code>{recoveryUrl}</code><button type="button" onClick={() => navigator.clipboard.writeText(recoveryUrl)}>COPY RECOVERY LINK</button></div>}<h3>Active team</h3>{team.members.map((member) => <article key={member.id}><div><b>{member.display_name || member.email}</b><span>{member.email}</span><small>Last login {when(member.last_login_at)}</small></div><Badge value={member.role}/><Badge value={member.status}/><Badge value={member.mfa_enabled ? 'MFA ACTIVE' : 'MFA MISSING'}/>{team.current.role === 'OWNER' && member.id !== team.current.id && <div className="workspace-actions"><select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => void updateMember(member.id, {role: event.target.value})}><option>OWNER</option><option>ADMIN</option><option>EDITOR</option><option>VIEWER</option></select><button onClick={() => void createRecovery(member.id)}>RESET ACCESS</button>{member.status === 'ACTIVE' ? <button className="danger-action" onClick={() => void updateMember(member.id, {status: 'DISABLED'})}>DISABLE</button> : <button onClick={() => void updateMember(member.id, {status: 'ACTIVE'})}>ENABLE</button>}</div>}</article>)}
      {team.current.role === 'OWNER' && team.invitations.length > 0 && <><h3>Pending invitations</h3>{team.invitations.map((item) => <article key={item.id}><div><b>{item.display_name}</b><span>{item.email}</span><small>Expires {when(item.expires_at)}</small></div><Badge value={item.role}/><Badge value={item.status}/>{item.status === 'ACTIVE' && <button className="danger-action" onClick={() => void revoke(item.id)}>REVOKE</button>}</article>)}</>}</div></div>
  </section>;
}

export function DecisionsView({decisions, comments, team, mutate}: {decisions: ProjectDecision[]; comments: ProjectComment[]; team: Team; mutate: (path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) => Promise<boolean>}) {
  const create = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); if (await mutate('/admin/decisions', 'POST', {title: data.get('title'), context: data.get('context'), decision: data.get('decision'), alternatives: data.get('alternatives'), consequences: data.get('consequences'), ownerAdminId: data.get('ownerAdminId') || null, status: data.get('status')})) form.reset(); };
  const comment = async (event: FormEvent<HTMLFormElement>, id: string) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); if (await mutate('/admin/comments', 'POST', {entityType: 'DECISION', entityId: id, body: data.get('body')})) form.reset(); };
  return <section className="admin-page"><header className="admin-page-heading"><div><p>DECISION LOG</p><h2>Decisions</h2></div><span>Context, alternatives, outcome and consequences remain visible to every partner.</span></header><div className="decision-layout"><form className="portal-form workspace-form" onSubmit={create}><h3>Record a decision</h3><label>Title<input name="title" required/></label><label>Context<textarea name="context" rows={4}/></label><label>Decision / proposal<textarea name="decision" rows={5} required/></label><label>Alternatives considered<textarea name="alternatives" rows={3}/></label><label>Consequences &amp; follow-up<textarea name="consequences" rows={3}/></label><label>Owner<select name="ownerAdminId" defaultValue=""><option value="">Unassigned</option>{team.members.filter((member) => member.status === 'ACTIVE').map((member) => <option key={member.id} value={member.id}>{member.display_name || member.email}</option>)}</select></label><label>Status<select name="status" defaultValue="PROPOSED"><option>PROPOSED</option><option>DECIDED</option><option>REVISIT</option></select></label><button className="secure-primary">SAVE DECISION</button></form><div className="decision-list">{decisions.map((item) => <article key={item.id}><header><div><Badge value={item.status}/><span>Updated {when(item.updated_at)}</span></div><h3>{item.title}</h3><small>{item.owner_name || 'Unassigned'}</small></header>{item.context && <section><b>CONTEXT</b><p>{item.context}</p></section>}<section><b>{item.status === 'PROPOSED' ? 'PROPOSAL' : 'DECISION'}</b><p>{item.decision}</p></section>{item.alternatives && <section><b>ALTERNATIVES</b><p>{item.alternatives}</p></section>}{item.consequences && <section><b>CONSEQUENCES</b><p>{item.consequences}</p></section>}<div className="workspace-actions">{item.status !== 'DECIDED' && <button onClick={() => void mutate(`/admin/decisions/${item.id}`, 'PATCH', {status: 'DECIDED'})}>MARK DECIDED</button>}{item.status !== 'REVISIT' && <button onClick={() => void mutate(`/admin/decisions/${item.id}`, 'PATCH', {status: 'REVISIT'})}>REVISIT</button>}<button onClick={() => void mutate(`/admin/decisions/${item.id}`, 'PATCH', {status: 'ARCHIVED'})}>ARCHIVE</button></div><div className="comment-thread">{comments.filter((entry) => entry.entity_id === item.id && entry.entity_type === 'DECISION').map((entry) => <p key={entry.id}><b>{entry.author_name || entry.author_email}</b><span>{entry.body}</span><time>{when(entry.created_at)}</time></p>)}<form onSubmit={(event) => void comment(event, item.id)}><input name="body" required placeholder="Add context or follow-up…"/><button>COMMENT</button></form></div></article>)}{!decisions.length && <p className="workspace-empty">No decisions yet. Record the first proposal, alternative and owner.</p>}</div></div></section>;
}

type JoinPreparation = {email: string; displayName: string; role: string; expiresAt: string; totpSecret: string; otpauthUri: string};

export function TeamJoinPage() {
  const nav = useNavigate(); const [token, setToken] = useState(''); const [prepared, setPrepared] = useState<JoinPreparation | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { const fragment = new URLSearchParams(window.location.hash.replace(/^#/, '')); const raw = fragment.get('token') ?? ''; if (!raw) { setError('TEAM_INVITATION_UNAVAILABLE'); return; } setToken(raw); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`); portalApi<JoinPreparation>('/admin/team-invitations/prepare', {method: 'POST', body: JSON.stringify({token: raw})}).then(setPrepared).catch((reason) => setError((reason as Error).message)); }, []);
  const accept = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(''); try { await portalApi('/admin/team-invitations/accept', {method: 'POST', body: JSON.stringify({token, displayName: data.get('displayName'), password: data.get('password'), mfaCode: data.get('mfaCode')})}); setToken(''); nav('/admin/login', {replace: true}); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  if (!prepared) return <main className="secure-shell"><section className="secure-brand"><p>UP AI DOWN · PRIVATE TEAM</p><h1>Individual account activation.</h1><span>Every partner receives an independent identity, MFA factor, permissions and audit trail.</span></section><section className="secure-panel login-panel"><h2>{error ? label(error) : 'Checking invitation…'}</h2><p>{error ? 'Ask the portal owner for a new private team invitation.' : 'This invitation is being validated.'}</p></section></main>;
  return <main className="secure-shell"><section className="secure-brand"><p>UP AI DOWN · PRIVATE TEAM</p><h1>Activate your account.</h1><span>{prepared.email}<br/>{label(prepared.role)} access · expires {when(prepared.expiresAt)}</span></section><section className="secure-panel team-join-panel"><div><p className="secure-kicker">PASSWORD + INDIVIDUAL MFA</p><h2>Secure your identity</h2></div><div className="join-mfa"><QRCodeSVG value={prepared.otpauthUri} size={150} marginSize={2}/><div><p>Scan this code in your authenticator app before submitting the form.</p><code>{prepared.totpSecret}</code></div></div><form onSubmit={accept}><label>Name<input name="displayName" defaultValue={prepared.displayName} required/></label><label>Email<input value={prepared.email} disabled/></label><label>Strong password<input name="password" type="password" autoComplete="new-password" minLength={14} required/><small>At least 14 characters with uppercase, lowercase, number and symbol.</small></label><label>Authenticator code<input name="mfaCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>{error && <p className="form-error">{label(error)}</p>}<button className="secure-primary" disabled={busy}>{busy ? 'ACTIVATING…' : 'ACTIVATE INDIVIDUAL ACCOUNT'}</button></form></section></main>;
}

export function AdminRecoveryPage() {
  const nav = useNavigate(); const [token, setToken] = useState(''); const [prepared, setPrepared] = useState<JoinPreparation | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { const fragment = new URLSearchParams(window.location.hash.replace(/^#/, '')); const raw = fragment.get('token') ?? ''; if (!raw) { setError('RECOVERY_UNAVAILABLE'); return; } setToken(raw); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`); portalApi<JoinPreparation>('/admin/recovery/prepare', {method: 'POST', body: JSON.stringify({token: raw})}).then(setPrepared).catch((reason) => setError((reason as Error).message)); }, []);
  const accept = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(''); try { await portalApi('/admin/recovery/accept', {method: 'POST', body: JSON.stringify({token, password: data.get('password'), mfaCode: data.get('mfaCode')})}); setToken(''); nav('/admin/login', {replace: true}); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  if (!prepared) return <main className="secure-shell"><section className="secure-brand"><p>UP AI DOWN · ACCOUNT RECOVERY</p><h1>Rotate credentials securely.</h1><span>The owner-issued link is single-use and replaces both the password and authenticator factor.</span></section><section className="secure-panel login-panel"><h2>{error ? label(error) : 'Checking recovery link…'}</h2><p>{error ? 'Ask the portal owner for a new one-time recovery link.' : 'The secure recovery context is being validated.'}</p></section></main>;
  return <main className="secure-shell"><section className="secure-brand"><p>UP AI DOWN · ACCOUNT RECOVERY</p><h1>Create new credentials.</h1><span>{prepared.displayName || prepared.email}<br/>The previous sessions and MFA factor will be invalidated.</span></section><section className="secure-panel team-join-panel"><div><p className="secure-kicker">PASSWORD + NEW MFA FACTOR</p><h2>Recover your identity</h2></div><div className="join-mfa"><QRCodeSVG value={prepared.otpauthUri} size={150} marginSize={2}/><div><p>Scan this replacement factor in your authenticator app.</p><code>{prepared.totpSecret}</code></div></div><form onSubmit={accept}><label>Email<input value={prepared.email} disabled/></label><label>New strong password<input name="password" type="password" autoComplete="new-password" minLength={14} required/><small>At least 14 characters with uppercase, lowercase, number and symbol.</small></label><label>New authenticator code<input name="mfaCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>{error && <p className="form-error">{label(error)}</p>}<button className="secure-primary" disabled={busy}>{busy ? 'ROTATING…' : 'ROTATE PASSWORD & MFA'}</button></form></section></main>;
}

// ── Meeting Kit View ─────────────────────────────────────────────────────────

export function MeetingKitView({role}: {role: string}) {
  const [items, setItems] = useState<MeetingKitItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canWrite = ['OWNER', 'ADMIN', 'EDITOR'].includes(role);
  const canArchive = ['OWNER', 'ADMIN'].includes(role);

  const load = useCallback(async () => {
    try { setItems(await portalApi<MeetingKitItem[]>('/admin/meeting-kit')); } catch { setError('Failed to load meeting kit.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await portalApi('/admin/meeting-kit', {method: 'POST', body: JSON.stringify({
        itemType: form.get('itemType'), language: form.get('language'),
        title: form.get('title'), body: form.get('body'),
        classification: form.get('classification'),
        sortOrder: Number(form.get('sortOrder') || 0),
      })});
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };

  const reorder = async (id: string, delta: -1 | 1) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newOrder = Math.max(0, item.sort_order + delta * 10);
    try { await portalApi(`/admin/meeting-kit/${id}/reorder`, {method: 'POST', body: JSON.stringify({sortOrder: newOrder})}); await load(); }
    catch (reason) { setError((reason as Error).message); }
  };

  const archive = async (id: string) => {
    if (!confirm('Archive this item?')) return;
    try { await portalApi(`/admin/meeting-kit/${id}/archive`, {method: 'POST', body: '{}'}); await load(); }
    catch (reason) { setError((reason as Error).message); }
  };

  return (
    <section className="admin-page">
      <header className="admin-page-heading">
        <div><p>MEETING KIT · EDITABLE</p><h2>Meeting Kit</h2></div>
        <span>Agenda, speech cues, questions and materials. Plain text only.</span>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="decision-layout">
        {canWrite && (
          <form className="portal-form workspace-form" onSubmit={create}>
            <h3>Add item</h3>
            <label>Type<select name="itemType" defaultValue="AGENDA">
              <option value="AGENDA">Agenda</option><option value="SPEECH">Speech cue</option>
              <option value="QUESTION">Question</option><option value="MATERIAL">Material reference</option>
              <option value="CHECKLIST">Checklist</option><option value="NOTE">Note</option>
            </select></label>
            <label>Language<select name="language" defaultValue="BOTH">
              <option value="BOTH">Both</option><option value="ES">ES</option><option value="EN">EN</option>
            </select></label>
            <label>Title<input name="title" required maxLength={220}/></label>
            <label>Body (plain text)<textarea name="body" rows={4} maxLength={20000}/></label>
            <label>Classification<select name="classification" defaultValue="INTERNAL">
              <option value="PUBLIC">Public</option><option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option><option value="SYNTHETIC">Synthetic</option>
              <option value="CONCEPT_RENDER">Concept render</option><option value="LEGAL_REVIEW">Legal review</option>
            </select></label>
            <label>Sort order<input name="sortOrder" type="number" min="0" max="9999" defaultValue="0"/></label>
            <button className="secure-primary" disabled={busy}>{busy ? 'SAVING…' : 'ADD ITEM'}</button>
          </form>
        )}
        <div className="decision-list">
          {items.length === 0 && <p className="workspace-empty">No items yet. Add agenda points, speech cues or questions.</p>}
          {items.map((item) => (
            <article key={item.id}>
              <header>
                <div><Badge value={item.item_type}/><Badge value={item.classification}/><Badge value={item.language}/></div>
                <h3>{item.title}</h3>
                <small>Order {item.sort_order} · {when(item.updated_at)}</small>
              </header>
              {item.body && <p style={{whiteSpace: 'pre-wrap'}}>{item.body}</p>}
              {canWrite && (
                <div className="workspace-actions">
                  <button aria-label="Move up" onClick={() => void reorder(item.id, -1)}>↑</button>
                  <button aria-label="Move down" onClick={() => void reorder(item.id, 1)}>↓</button>
                  {canArchive && <button className="danger-action" onClick={() => void archive(item.id)}>ARCHIVE</button>}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Investor CRM View ────────────────────────────────────────────────────────

const CRM_STAGES = ['PROSPECT','INTRO','MEETING','DILIGENCE','TERM_SHEET','CLOSED_WON','CLOSED_LOST','ON_HOLD'];

export function InvestorCrmView({role}: {role: string}) {
  const [orgs, setOrgs] = useState<CrmOrganisation[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [selected, setSelected] = useState<CrmOrganisation | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canWrite = ['OWNER', 'ADMIN', 'EDITOR'].includes(role);

  const load = useCallback(async () => {
    try {
      const [os, cs] = await Promise.all([
        portalApi<CrmOrganisation[]>('/admin/crm/organisations'),
        portalApi<CrmContact[]>('/admin/crm/contacts'),
      ]);
      setOrgs(os); setContacts(cs);
    } catch { setError('Failed to load CRM data.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const createOrg = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await portalApi('/admin/crm/organisations', {method: 'POST', body: JSON.stringify({
        name: form.get('name'), orgType: form.get('orgType'),
        country: form.get('country'), stage: form.get('stage'),
        notes: form.get('notes'),
      })});
      (event.target as HTMLFormElement).reset(); setSelected(null); await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };

  const updateStage = async (id: string, stage: string) => {
    try { await portalApi(`/admin/crm/organisations/${id}`, {method: 'PATCH', body: JSON.stringify({stage})}); await load(); }
    catch (reason) { setError((reason as Error).message); }
  };

  const orgContacts = contacts.filter((c) => c.organisation_id === selected?.id);

  return (
    <section className="admin-page">
      <header className="admin-page-heading">
        <div><p>INVESTOR CRM</p><h2>Organisations &amp; Contacts</h2></div>
        <span>{orgs.length} organisations · {contacts.length} contacts</span>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="decision-layout">
        {canWrite && (
          <form className="portal-form workspace-form" onSubmit={createOrg}>
            <h3>Add organisation</h3>
            <label>Name<input name="name" required maxLength={220}/></label>
            <label>Type<select name="orgType" defaultValue="INVESTOR">
              <option value="INVESTOR">Investor</option><option value="FAMILY_OFFICE">Family office</option>
              <option value="VC">VC</option><option value="CORPORATE">Corporate</option>
              <option value="GOVERNMENT">Government</option><option value="OTHER">Other</option>
            </select></label>
            <label>Country<input name="country" maxLength={80}/></label>
            <label>Stage<select name="stage" defaultValue="PROSPECT">
              {CRM_STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select></label>
            <label>Notes<textarea name="notes" rows={3} maxLength={10000}/></label>
            <button className="secure-primary" disabled={busy}>{busy ? 'SAVING…' : 'ADD ORGANISATION'}</button>
          </form>
        )}
        <div className="decision-list">
          {orgs.map((org) => (
            <article key={org.id} style={{cursor: 'pointer'}} onClick={() => setSelected(selected?.id === org.id ? null : org)}>
              <header>
                <div><Badge value={org.stage}/><Badge value={org.org_type}/></div>
                <h3>{org.name}</h3>
                <small>{org.country || 'No country'} · {org.contact_count} contacts · updated {when(org.updated_at)}</small>
              </header>
              {org.notes && <p>{org.notes}</p>}
              {canWrite && (
                <div className="workspace-actions" onClick={(e) => e.stopPropagation()}>
                  {CRM_STAGES.map((s) => (
                    <button key={s} className={org.stage === s ? 'secure-primary' : ''} onClick={() => void updateStage(org.id, s)}>
                      {label(s)}
                    </button>
                  ))}
                </div>
              )}
              {selected?.id === org.id && orgContacts.length > 0 && (
                <div style={{marginTop: '1rem'}}>
                  <b>Contacts</b>
                  {orgContacts.map((c) => (
                    <p key={c.id}><b>{c.first_name} {c.last_name}</b> · {c.email} · {c.role_title || 'No title'}{c.is_primary && ' · PRIMARY'}</p>
                  ))}
                </div>
              )}
            </article>
          ))}
          {!orgs.length && <p className="workspace-empty">No organisations yet. Add the first investor, family office or partner.</p>}
        </div>
      </div>
    </section>
  );
}

// ── Materials View ────────────────────────────────────────────────────────────

const MATERIAL_STATUS_ORDER: Record<string, number> = {DRAFT: 0, APPROVED: 1, DISTRIBUTED: 2, RETIRED: 3};

export function MaterialsView({role}: {role: string}) {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canWrite = ['OWNER', 'ADMIN', 'EDITOR'].includes(role);
  const canChangeStatus = ['OWNER', 'ADMIN'].includes(role);

  const load = useCallback(async () => {
    try { setMaterials(await portalApi<MaterialItem[]>('/admin/materials')); }
    catch { setError('Failed to load materials.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await portalApi('/admin/materials', {method: 'POST', body: JSON.stringify({
        title: form.get('title'), materialType: form.get('materialType'),
        version: form.get('version'), language: form.get('language'),
        classification: form.get('classification'),
        provenance: form.get('provenance'), notes: form.get('notes'),
        externalUrl: form.get('externalUrl') || null,
      })});
      (event.target as HTMLFormElement).reset(); await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };

  const advance = async (id: string, current: string) => {
    const order = MATERIAL_STATUS_ORDER;
    const next = Object.entries(order).find(([, v]) => v === (order[current] ?? 0) + 1)?.[0];
    if (!next) return;
    const approvalNote = next === 'DISTRIBUTED' ? prompt('Approval note required to distribute:') : undefined;
    if (next === 'DISTRIBUTED' && !approvalNote) return;
    try {
      await portalApi(`/admin/materials/${id}`, {method: 'PATCH', body: JSON.stringify({status: next, approvalNote: approvalNote ?? undefined})});
      await load();
    } catch (reason) { setError((reason as Error).message); }
  };

  const retire = async (id: string) => {
    if (!confirm('Retire this material?')) return;
    try { await portalApi(`/admin/materials/${id}`, {method: 'PATCH', body: JSON.stringify({status: 'RETIRED'})}); await load(); }
    catch (reason) { setError((reason as Error).message); }
  };

  return (
    <section className="admin-page">
      <header className="admin-page-heading">
        <div><p>MATERIAL REGISTRY</p><h2>Materials</h2></div>
        <span>{materials.length} documents · distribution requires OWNER/ADMIN approval</span>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="decision-layout">
        {canWrite && (
          <form className="portal-form workspace-form" onSubmit={register}>
            <h3>Register material</h3>
            <label>Title<input name="title" required maxLength={220}/></label>
            <label>Type<select name="materialType" defaultValue="DOCUMENT">
              <option value="DOCUMENT">Document</option><option value="PRESENTATION">Presentation</option>
              <option value="SPREADSHEET">Spreadsheet</option><option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option><option value="DATASET">Dataset</option><option value="OTHER">Other</option>
            </select></label>
            <label>Version<input name="version" defaultValue="1.0" maxLength={40}/></label>
            <label>Language<select name="language" defaultValue="BOTH">
              <option value="BOTH">Both</option><option value="ES">ES</option><option value="EN">EN</option><option value="OTHER">Other</option>
            </select></label>
            <label>Classification<select name="classification" defaultValue="INTERNAL">
              <option value="PUBLIC">Public</option><option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option><option value="REVIEW_REQUIRED">Review required</option>
              <option value="SYNTHETIC">Synthetic</option><option value="CONCEPT_RENDER">Concept render</option>
            </select></label>
            <label>Provenance / source<input name="provenance" maxLength={2000}/></label>
            <label>External URL (optional)<input name="externalUrl" type="url" maxLength={2048}/></label>
            <label>Notes<textarea name="notes" rows={2} maxLength={10000}/></label>
            <button className="secure-primary" disabled={busy}>{busy ? 'SAVING…' : 'REGISTER MATERIAL'}</button>
          </form>
        )}
        <div className="decision-list">
          {materials.map((item) => (
            <article key={item.id}>
              <header>
                <div><Badge value={item.status}/><Badge value={item.classification}/><Badge value={item.material_type}/></div>
                <h3>{item.title}</h3>
                <small>v{item.version} · {item.language} · {item.owner_name || 'No owner'} · updated {when(item.updated_at)}</small>
              </header>
              {item.provenance && <p><b>Source:</b> {item.provenance}</p>}
              {item.notes && <p>{item.notes}</p>}
              {item.external_url && <p><a href={item.external_url} target="_blank" rel="noreferrer">Open document ↗</a></p>}
              {item.approval_note && <p><b>Approval note:</b> {item.approval_note} (by {item.approved_by_name})</p>}
              {canChangeStatus && item.status !== 'RETIRED' && (
                <div className="workspace-actions">
                  {item.status !== 'DISTRIBUTED' && (
                    <button onClick={() => void advance(item.id, item.status)}>
                      ADVANCE TO {Object.keys(MATERIAL_STATUS_ORDER).find((k) => MATERIAL_STATUS_ORDER[k] === (MATERIAL_STATUS_ORDER[item.status] ?? 0) + 1) ?? '…'}
                    </button>
                  )}
                  <button className="danger-action" onClick={() => void retire(item.id)}>RETIRE</button>
                </div>
              )}
            </article>
          ))}
          {!materials.length && <p className="workspace-empty">No materials registered. Add the first document, presentation or dataset.</p>}
        </div>
      </div>
    </section>
  );
}

