import {
  expect,
  request as requestFactory,
  test,
  type APIRequestContext,
} from "@playwright/test";
import { totp } from "../../api/src/portal-core";
import {
  adminMutation,
  invitationToken,
  loginAsTestAdmin,
} from "./portal-test-helpers";

const origin = process.env.E2E_ORIGIN ?? "http://127.0.0.1:8090";
const apiOrigin = process.env.E2E_API_ORIGIN ?? "http://127.0.0.1:4011";
const expiresAt = () => new Date(Date.now() + 60 * 60_000).toISOString();

async function body(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
  status: number,
) {
  expect(response.status(), await response.text()).toBe(status);
  return response.headers()["content-type"]?.includes("application/json")
    ? response.json()
    : response.text();
}

async function isolatedClient(
  name: string,
  ip = "198.51.100.10",
  storageState?: Awaited<ReturnType<APIRequestContext["storageState"]>>,
) {
  return requestFactory.newContext({
    baseURL: apiOrigin,
    storageState,
    extraHTTPHeaders: {
      origin,
      "user-agent": `UP-EYE-DAWN-E2E/${name}`,
      "x-forwarded-for": ip,
    },
  });
}

async function registerVisitor(
  client: APIRequestContext,
  token: string,
  email: string,
  fullName: string,
  language: "en" | "es" = "en",
) {
  await body(
    await client.post("/api/v1/access/invitations/prepare", {
      data: { token },
    }),
    200,
  );
  const document = (await body(
    await client.get(`/api/v1/access/document?lang=${language}`),
    200,
  )) as Record<string, unknown>;
  expect(document.status).toBe("DRAFT_FOR_WORKFLOW_TESTING");
  expect((document.privacy as { legalStatus: string }).legalStatus).toBe(
    "DRAFT",
  );
  expect(document.language).toBe(language);
  if (language === "es")
    expect(document.title).toBe("Reconocimiento de confidencialidad");
  expect(
    (
      await client.post("/api/v1/access/email/start", { data: { email } })
    ).status(),
  ).toBe(503);
  return body(
    await client.post("/api/v1/access/register", {
      data: {
        fullName,
        email,
        organisation: "E2E Capital",
        role: "Partner",
        country: "United States",
        registeredAddress: "1 Test Avenue, New York, NY",
        typedSignature: fullName,
        ndaConfirmed: true,
        privacyConfirmed: true,
        signatureIntentConfirmed: true,
        language,
      },
    }),
    200,
  ) as Promise<Record<string, unknown>>;
}

test("private portal workflows enforce identity, permissions, NDA and immutable evidence", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const anonymous = await isolatedClient("anonymous");
  expect(
    await body(await anonymous.get("/api/v1/admin/session"), 200),
  ).toMatchObject({ authenticated: false });
  const gatewayAnonymous = await requestFactory.newContext({ baseURL: origin });
  expect((await gatewayAnonymous.get("/demo/")).status()).toBe(200);
  const legacyInvestor = await gatewayAnonymous.get("/investor/", {
    maxRedirects: 0,
  });
  expect(legacyInvestor.status()).toBe(302);
  expect(legacyInvestor.headers().location).toBe("/demo/investor");
  const gated = await gatewayAnonymous.get("/demo/preflight", {
    maxRedirects: 0,
  });
  expect(gated.status()).toBe(302);
  expect(gated.headers().location).toBe("/demo/access");
  await gatewayAnonymous.dispose();
  await anonymous.dispose();

  await loginAsTestAdmin(page);
  const request = page.request;
  const session = (await body(
    await request.get("/api/v1/admin/session"),
    200,
  )) as { role: string; authenticated: boolean };
  expect(session).toMatchObject({ role: "OWNER", authenticated: true });

  const missingCsrf = await request.post("/api/v1/admin/tasks", {
    headers: { origin },
    data: { title: "Must be rejected" },
  });
  expect(missingCsrf.status()).toBe(403);

  const event = (await body(
    await adminMutation(request, "post", "/api/v1/admin/events", {
      title: "E2E investor meeting",
      startsAt: "2026-09-10T10:00:00.000Z",
      endsAt: "2026-09-10T11:00:00.000Z",
      priority: "HIGH",
    }),
    201,
  )) as { id: string };
  const invalidInterval = await adminMutation(
    request,
    "patch",
    `/api/v1/admin/events/${event.id}`,
    { startsAt: "2026-09-10T12:00:00.000Z" },
  );
  expect(invalidInterval.status()).toBe(400);
  expect(await invalidInterval.json()).toMatchObject({
    error: "INVALID_EVENT_INTERVAL",
  });

  const task = (await body(
    await adminMutation(request, "post", "/api/v1/admin/tasks", {
      title: "E2E prepare room",
      priority: "CRITICAL",
      linkedEventId: event.id,
    }),
    201,
  )) as { id: string };
  const note = (await body(
    await adminMutation(request, "post", "/api/v1/admin/notes", {
      title: "E2E meeting note",
      body: "First immutable note body.",
      category: "MEETING",
      pinned: true,
    }),
    201,
  )) as { id: string };
  await body(
    await adminMutation(request, "patch", `/api/v1/admin/notes/${note.id}`, {
      body: "Second immutable note body.",
    }),
    200,
  );
  const decision = (await body(
    await adminMutation(request, "post", "/api/v1/admin/decisions", {
      title: "E2E release decision",
      decision: "Keep release gated.",
      status: "PROPOSED",
    }),
    201,
  )) as { id: string };
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/decisions/${decision.id}`,
      { status: "DECIDED" },
    ),
    200,
  );
  await body(
    await adminMutation(request, "post", "/api/v1/admin/comments", {
      entityType: "DECISION",
      entityId: decision.id,
      body: "E2E approval comment.",
    }),
    201,
  );

  const noteVersions = (await body(
    await request.get(`/api/v1/admin/notes/${note.id}/versions`),
    200,
  )) as Array<{ version_number: number; snapshot: { body: string } }>;
  expect(noteVersions.map((item) => item.version_number)).toEqual([2, 1]);
  expect(noteVersions[0]?.snapshot.body).toBe("Second immutable note body.");
  const decisionVersions = (await body(
    await request.get(`/api/v1/admin/decisions/${decision.id}/versions`),
    200,
  )) as Array<{ version_number: number }>;
  expect(decisionVersions.map((item) => item.version_number)).toEqual([2, 1]);

  const workspace = (await body(
    await request.get("/api/v1/admin/workspace"),
    200,
  )) as {
    comments: Array<{ entity_id: string }>;
    history: Array<{ entity_id: string }>;
  };
  expect(
    workspace.comments.some((item) => item.entity_id === decision.id),
  ).toBe(true);
  expect(workspace.history.some((item) => item.entity_id === decision.id)).toBe(
    true,
  );

  const kit = (await body(
    await adminMutation(request, "post", "/api/v1/admin/meeting-kit", {
      title: "E2E opening speech",
      itemType: "SPEECH",
      body: "Welcome.",
      classification: "INTERNAL",
    }),
    201,
  )) as { id: string };
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/meeting-kit/${kit.id}/reorder`,
      { sortOrder: 7 },
    ),
    200,
  );

  const organisation = (await body(
    await adminMutation(request, "post", "/api/v1/admin/crm/organisations", {
      name: "E2E Capital",
      stage: "MEETING",
      country: "US",
    }),
    201,
  )) as { id: string };
  const contact = (await body(
    await adminMutation(request, "post", "/api/v1/admin/crm/contacts", {
      organisationId: organisation.id,
      firstName: "Alex",
      lastName: "Tester",
      email: "alex@example.invalid",
      isPrimary: true,
    }),
    201,
  )) as { id: string };
  const organisationDetail = (await body(
    await request.get(`/api/v1/admin/crm/organisations/${organisation.id}`),
    200,
  )) as { contacts: Array<{ id: string }> };
  expect(
    organisationDetail.contacts.some((item) => item.id === contact.id),
  ).toBe(true);

  const material = (await body(
    await adminMutation(request, "post", "/api/v1/admin/materials", {
      title: "E2E investor deck",
      classification: "REVIEW_REQUIRED",
      materialType: "PRESENTATION",
    }),
    201,
  )) as { id: string };
  const unsafeDistribution = await adminMutation(
    request,
    "patch",
    `/api/v1/admin/materials/${material.id}`,
    { status: "DISTRIBUTED" },
  );
  expect(unsafeDistribution.status()).toBe(400);
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/materials/${material.id}`,
      { status: "DISTRIBUTED", approvalNote: "E2E approval only" },
    ),
    200,
  );

  const ndaVersion = `NDA-E2E-${Date.now()}`;
  const ndaDocument = (await body(
    await adminMutation(request, "post", "/api/v1/admin/nda-documents", {
      version: ndaVersion,
      title: "E2E diligence NDA",
      jurisdiction: "UNITED_STATES",
      governingLaw: "E2E TEST ONLY",
      signatureProfile: "SIMPLE_ELECTRONIC_SIGNATURE_WORKFLOW",
      purpose: "TECHNICAL_DILIGENCE",
      disclosingParty: "UP AI DOWN E2E",
      notice: "E2E workflow draft. Not for external use.",
      paragraphs: [
        "First controlled paragraph.",
        "Second controlled paragraph.",
      ],
      changeNote: "Initial E2E draft",
    }),
    201,
  )) as { id: string };
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/nda-documents/${ndaDocument.id}`,
      {
        paragraphs: [
          "First controlled paragraph.",
          "Second revised paragraph.",
        ],
        changeNote: "Verify revision history",
      },
    ),
    200,
  );
  const ndaDetail = (await body(
    await request.get(`/api/v1/admin/nda-documents/${ndaDocument.id}`),
    200,
  )) as { revisions: Array<{ revision_number: number }> };
  expect(ndaDetail.revisions.map((item) => item.revision_number)).toEqual([
    2, 1,
  ]);
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/nda-documents/${ndaDocument.id}/status`,
      {
        status: "LEGAL_REVIEW",
        changeNote: "Send through controlled review",
        approvalConfirmed: false,
        counselReference: "",
      },
    ),
    200,
  );
  const skippedReview = await adminMutation(
    request,
    "post",
    `/api/v1/admin/nda-documents/${ndaDocument.id}/status`,
    {
      status: "RETIRED",
      changeNote: "Must fail",
      approvalConfirmed: false,
      counselReference: "",
    },
  );
  expect(skippedReview.status()).toBe(409);
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/nda-documents/${ndaDocument.id}/status`,
      {
        status: "APPROVED",
        changeNote: "E2E lifecycle only",
        approvalConfirmed: true,
        counselReference: "E2E-NOT-LEGAL-APPROVAL",
      },
    ),
    200,
  );
  expect(
    (
      await adminMutation(
        request,
        "patch",
        `/api/v1/admin/nda-documents/${ndaDocument.id}`,
        { title: "Must remain immutable", changeNote: "Must fail" },
      )
    ).status(),
  ).toBe(409);
  const clone = (await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/nda-documents/${ndaDocument.id}/clone`,
      {
        version: `${ndaVersion}-CLONE`,
        purpose: "STRATEGIC_PARTNER",
        changeNote: "Independent E2E variant",
      },
    ),
    201,
  )) as { id: string };
  expect(
    (await request.get(`/api/v1/admin/nda-documents/${clone.id}`)).status(),
  ).toBe(200);

  const mailThread = (await body(
    await adminMutation(request, "post", "/api/v1/admin/mail/threads", {
      subject: "E2E investor follow-up",
      contactEmail: "followup@example.invalid",
      organisation: "E2E Capital",
      priority: "HIGH",
      nextFollowUpAt: expiresAt(),
      notes: "Initial context",
    }),
    201,
  )) as { id: string };
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/mail/threads/${mailThread.id}`,
      { status: "WAITING_REPLY" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/mail/threads/${mailThread.id}/notes`,
      { body: "E2E internal follow-up note" },
    ),
    201,
  );
  const mailCenter = (await body(
    await request.get("/api/v1/admin/mail"),
    200,
  )) as {
    mailbox: { configured: boolean };
    threads: Array<{ id: string; status: string }>;
  };
  expect(mailCenter.mailbox.configured).toBe(false);
  expect(
    mailCenter.threads.find((item) => item.id === mailThread.id)?.status,
  ).toBe("WAITING_REPLY");
  expect(
    (
      await adminMutation(request, "post", "/api/v1/admin/mail/sync", {})
    ).status(),
  ).toBe(503);

  const teamInvitation = (await body(
    await adminMutation(request, "post", "/api/v1/admin/team/invitations", {
      email: "editor-e2e@example.invalid",
      displayName: "E2E Editor",
      role: "EDITOR",
      expiresAt: expiresAt(),
    }),
    201,
  )) as { shareUrl: string };
  const teamToken = invitationToken(teamInvitation.shareUrl);
  const teamClient = await isolatedClient("team-activation", "198.51.100.20");
  const preparedTeam = (await body(
    await teamClient.post("/api/v1/admin/team-invitations/prepare", {
      data: { token: teamToken },
    }),
    200,
  )) as { totpSecret: string };
  const editorPassword = "Editor-E2E-Password-2026!";
  await body(
    await teamClient.post("/api/v1/admin/team-invitations/accept", {
      data: {
        token: teamToken,
        displayName: "E2E Editor",
        password: editorPassword,
        mfaCode: totp(preparedTeam.totpSecret),
      },
    }),
    201,
  );
  expect(
    (
      await teamClient.post("/api/v1/admin/team-invitations/accept", {
        data: {
          token: teamToken,
          displayName: "Replay",
          password: editorPassword,
          mfaCode: totp(preparedTeam.totpSecret),
        },
      })
    ).status(),
  ).toBe(404);

  const editor = await isolatedClient("editor", "198.51.100.21");
  await body(
    await editor.post("/api/v1/admin/login", {
      data: {
        email: "editor-e2e@example.invalid",
        password: editorPassword,
        mfaCode: totp(preparedTeam.totpSecret),
      },
    }),
    200,
  );
  const editorTask = (await body(
    await adminMutation(editor, "post", "/api/v1/admin/tasks", {
      title: "E2E editor task",
    }),
    201,
  )) as { id: string };
  const editorForbidden = await adminMutation(
    editor,
    "post",
    "/api/v1/admin/team/invitations",
    {
      email: "forbidden@example.invalid",
      displayName: "Forbidden",
      role: "VIEWER",
      expiresAt: expiresAt(),
    },
  );
  expect(editorForbidden.status()).toBe(403);

  const team = (await body(await request.get("/api/v1/admin/team"), 200)) as {
    members: Array<{ id: string; email: string }>;
  };
  const editorId = team.members.find(
    (member) => member.email === "editor-e2e@example.invalid",
  )?.id;
  expect(editorId).toBeTruthy();
  const recovery = (await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/team/${editorId}/recovery`,
      { expiresAt: expiresAt() },
    ),
    201,
  )) as { shareUrl: string };
  const recoveryToken = invitationToken(recovery.shareUrl);
  const recoveryClient = await isolatedClient("recovery", "198.51.100.22");
  const preparedRecovery = (await body(
    await recoveryClient.post("/api/v1/admin/recovery/prepare", {
      data: { token: recoveryToken },
    }),
    200,
  )) as { totpSecret: string };
  const recoveredPassword = "Recovered-E2E-Password-2026!";
  await body(
    await recoveryClient.post("/api/v1/admin/recovery/accept", {
      data: {
        token: recoveryToken,
        password: recoveredPassword,
        mfaCode: totp(preparedRecovery.totpSecret),
      },
    }),
    200,
  );
  expect(
    await body(await editor.get("/api/v1/admin/session"), 200),
  ).toMatchObject({ authenticated: false });
  expect(
    (
      await editor.post("/api/v1/admin/login", {
        data: {
          email: "editor-e2e@example.invalid",
          password: editorPassword,
          mfaCode: totp(preparedTeam.totpSecret),
        },
      })
    ).status(),
  ).toBe(401);
  await body(
    await editor.post("/api/v1/admin/login", {
      data: {
        email: "editor-e2e@example.invalid",
        password: recoveredPassword,
        mfaCode: totp(preparedRecovery.totpSecret),
      },
    }),
    200,
  );

  const briefing = (await body(
    await request.get("/api/v1/admin/briefing"),
    200,
  )) as { nda: { version: string } };
  const investorInvitation = (await body(
    await adminMutation(request, "post", "/api/v1/admin/invitations", {
      name: "E2E shared investor link",
      description: "Shared-link test",
      organisationName: "E2E Capital",
      policy: "MULTI_VISITOR",
      maxRegistrations: 2,
      expiresAt: expiresAt(),
      manualApprovalRequired: true,
      ndaVersion: briefing.nda.version,
      scopes: ["INVESTOR"],
      internalNotes: "Automated test",
    }),
    201,
  )) as { id: string; shareUrl: string };
  const investorToken = invitationToken(investorInvitation.shareUrl);

  const visitorOne = await isolatedClient("visitor-one", "203.0.113.10");
  const firstRegistration = await registerVisitor(
    visitorOne,
    investorToken,
    "first-investor@example.invalid",
    "First Investor",
    "es",
  );
  expect(firstRegistration).toMatchObject({
    granted: false,
    reason: "PENDING_APPROVAL",
    emailStatus: "SENT",
  });
  const visitors = (await body(
    await request.get(
      "/api/v1/admin/visitors?search=first-investor%40example.invalid",
    ),
    200,
  )) as Array<{ id: string; email: string }>;
  const firstVisitorId = visitors.find(
    (item) => item.email === "first-investor@example.invalid",
  )?.id;
  expect(firstVisitorId).toBeTruthy();
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/visitors/${firstVisitorId}/approve`,
      {},
    ),
    200,
  );
  expect(
    await body(await visitorOne.get("/api/v1/access/status"), 200),
  ).toMatchObject({ granted: true, reason: "APPROVED" });
  const ndaCopy = await visitorOne.get("/api/v1/access/nda-copy");
  expect(ndaCopy.status()).toBe(200);
  expect(ndaCopy.headers()["content-type"]).toContain("application/pdf");
  expect((await ndaCopy.body()).byteLength).toBeGreaterThan(1_000);
  expect((await visitorOne.get("/api/v1/demo/scenarios")).status()).toBe(200);
  const ndaLedger = (await body(
    await request.get("/api/v1/admin/nda"),
    200,
  )) as Array<{ id: string; email: string }>;
  const firstAcceptanceId = ndaLedger.find(
    (item) => item.email === "first-investor@example.invalid",
  )?.id;
  expect(firstAcceptanceId).toBeTruthy();
  const adminNdaCopy = await request.get(
    `/api/v1/admin/nda/${firstAcceptanceId}/pdf`,
  );
  expect(adminNdaCopy.status()).toBe(200);
  expect(adminNdaCopy.headers()["content-type"]).toContain("application/pdf");
  const visitorExport = await request.get("/api/v1/admin/visitors.csv");
  expect(visitorExport.status()).toBe(200);
  expect(await visitorExport.text()).toContain(
    "first-investor@example.invalid",
  );

  const copiedState = await visitorOne.storageState();
  const sharedSession = await isolatedClient(
    "shared-session",
    "203.0.113.99",
    copiedState,
  );
  expect(
    await body(await sharedSession.get("/api/v1/access/status"), 200),
  ).toMatchObject({ granted: false, reason: "NETWORK_CHANGED" });
  expect((await visitorOne.get("/api/v1/demo/scenarios")).status()).toBe(401);

  const visitorTwo = await isolatedClient("visitor-two", "203.0.113.11");
  const secondRegistration = await registerVisitor(
    visitorTwo,
    investorToken,
    "second-investor@example.invalid",
    "Second Investor",
  );
  expect(secondRegistration).toMatchObject({
    granted: false,
    reason: "PENDING_APPROVAL",
  });
  const secondVisitors = (await body(
    await request.get(
      "/api/v1/admin/visitors?search=second-investor%40example.invalid",
    ),
    200,
  )) as Array<{ id: string }>;
  const secondVisitorId = secondVisitors[0]?.id;
  expect(secondVisitorId).toBeTruthy();
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/visitors/${secondVisitorId}/approve`,
      {},
    ),
    200,
  );
  expect(
    await body(await visitorTwo.get("/api/v1/access/status"), 200),
  ).toMatchObject({ granted: true, reason: "APPROVED" });
  const secondDetail = (await body(
    await request.get(`/api/v1/admin/visitors/${secondVisitorId}`),
    200,
  )) as { sessions: Array<{ id: string }> };
  expect(secondDetail.sessions[0]?.id).toBeTruthy();
  expect(
    (
      await adminMutation(
        request,
        "post",
        "/api/v1/admin/sessions/not-a-uuid/revoke",
        { reason: "Invalid id must be rejected safely" },
      )
    ).status(),
  ).toBe(400);
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/sessions/${secondDetail.sessions[0]?.id}/revoke`,
      { reason: "E2E explicit session revocation" },
    ),
    200,
  );
  expect(
    await body(await visitorTwo.get("/api/v1/access/status"), 200),
  ).toMatchObject({ granted: false, reason: "REGISTRATION_REQUIRED" });
  const visitorThree = await isolatedClient("visitor-three", "203.0.113.12");
  expect(
    (
      await visitorThree.post("/api/v1/access/invitations/prepare", {
        data: { token: investorToken },
      })
    ).status(),
  ).toBe(409);

  const directInvitation = (await body(
    await adminMutation(request, "post", "/api/v1/admin/invitations", {
      name: "E2E immediate controlled access",
      description: "Automatic workflow-test activation",
      organisationName: "E2E Direct Capital",
      policy: "SINGLE_VISITOR",
      maxRegistrations: 1,
      expiresAt: expiresAt(),
      manualApprovalRequired: false,
      ndaVersion: briefing.nda.version,
      scopes: ["INVESTOR"],
      internalNotes: "Automated direct-access test",
    }),
    201,
  )) as { id: string; shareUrl: string };
  const directVisitor = await isolatedClient("direct-visitor", "203.0.113.13");
  const directRegistration = await registerVisitor(
    directVisitor,
    invitationToken(directInvitation.shareUrl),
    "direct-investor@example.invalid",
    "Direct Investor",
    "es",
  );
  expect(directRegistration).toMatchObject({
    granted: true,
    reason: "ACCESS_VERIFIED",
    emailStatus: "SENT",
  });
  expect((await directVisitor.get("/api/v1/demo/scenarios")).status()).toBe(
    200,
  );

  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/nda/${firstAcceptanceId}/revoke`,
      { reason: "E2E cleanup" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/invitations/${investorInvitation.id}/revoke`,
      { reason: "E2E cleanup" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/invitations/${directInvitation.id}/revoke`,
      { reason: "E2E cleanup" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/tasks/${editorTask.id}`,
      { status: "ARCHIVED" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/meeting-kit/${kit.id}/archive`,
      {},
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/crm/contacts/${contact.id}`,
      { status: "ARCHIVED" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/crm/organisations/${organisation.id}`,
      { status: "ARCHIVED" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/materials/${material.id}`,
      { status: "RETIRED" },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "post",
      `/api/v1/admin/nda-documents/${ndaDocument.id}/status`,
      {
        status: "RETIRED",
        changeNote: "E2E cleanup",
        approvalConfirmed: false,
        counselReference: "",
      },
    ),
    200,
  );
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/mail/threads/${mailThread.id}`,
      { status: "ARCHIVED" },
    ),
    200,
  );
  await body(
    await adminMutation(request, "patch", `/api/v1/admin/events/${event.id}`, {
      status: "ARCHIVED",
    }),
    200,
  );
  await body(
    await adminMutation(request, "patch", `/api/v1/admin/tasks/${task.id}`, {
      status: "ARCHIVED",
    }),
    200,
  );
  await body(
    await adminMutation(request, "patch", `/api/v1/admin/notes/${note.id}`, {
      status: "ARCHIVED",
    }),
    200,
  );
  await body(
    await adminMutation(
      request,
      "patch",
      `/api/v1/admin/decisions/${decision.id}`,
      { status: "ARCHIVED" },
    ),
    200,
  );

  const security = (await body(
    await request.get("/api/v1/admin/security"),
    200,
  )) as { adminMfa: string };
  expect(security.adminMfa).toContain("1/2 ENROLLED");
  await body(
    await adminMutation(request, "patch", `/api/v1/admin/team/${editorId}`, {
      status: "DISABLED",
    }),
    200,
  );
  await body(
    await adminMutation(request, "post", "/api/v1/admin/logout", {}),
    200,
  );
  expect(
    await body(await request.get("/api/v1/admin/session"), 200),
  ).toMatchObject({ authenticated: false });

  for (const client of [
    teamClient,
    editor,
    recoveryClient,
    visitorOne,
    sharedSession,
    visitorTwo,
    visitorThree,
  ])
    await client.dispose();
});
