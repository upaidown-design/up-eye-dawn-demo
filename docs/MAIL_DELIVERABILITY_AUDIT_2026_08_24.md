# UP AI DOWN mail deliverability audit - 2026-08-24

## Observed result

The production server delivered a controlled message to `upaidown@gmail.com`. Gmail returned SMTP `250 2.0.0`, but the recipient observed the message in Spam. SMTP acceptance therefore proves transport, not inbox placement.

## Authentication and transport checks

| Control         | Result                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| SPF             | Published for `upaidown.com`; authorizes `82.223.44.126` and DonDominio senders              |
| DKIM            | Published selector `default`; 2048-bit RSA; outbound message signed with `d=upaidown.com`    |
| DMARC           | Published with strict SPF/DKIM alignment and aggregate reporting; monitoring policy `p=none` |
| TLS             | Gmail delivery negotiated TLS 1.3                                                            |
| Forward DNS     | `server.aiworking.pro` resolves to `82.223.44.126`                                           |
| Reverse DNS     | `82.223.44.126` resolves to `server.aiworking.pro`                                           |
| SMTP acceptance | Gmail returned `250 2.0.0`                                                                   |

## Primary deliverability risk

The outbound IPv4 address and Postfix instance are shared with unrelated applications and sending identities. Reputation is therefore shared across every sender on that host. The PTR/HELO identity is valid in the narrow forward/reverse-DNS sense, but it is `server.aiworking.pro`, not a dedicated UP AI DOWN mail identity. A new or low-volume sending domain combined with a shared-IP reputation is the most credible explanation for spam placement when SPF, DKIM, DMARC and TLS already pass.

The production application message has been revised to use a stable investor-relations identity, bilingual transactional copy, an explicit reason for receipt, a reply path, an auto-generated classification header and a stable evidence reference. It contains no tracking pixel and no promotional unsubscribe semantics because it is a requested transactional record.

## Required reputation remediation

1. Keep volume low and send only to users who requested the investor-access record.
2. Use the same `From` identity consistently: `UP AI DOWN Investor Relations <investors@upaidown.com>`.
3. In Gmail, move the known test message out of Spam and mark it as not spam. This is mailbox-side feedback and cannot be done from the sending server.
4. Add `upaidown.com` to Google Postmaster Tools and monitor authentication, reputation, spam rate and delivery errors. Low volume may initially produce no dashboard data.
5. Obtain a dedicated outbound IP/relay for UP AI DOWN. If the existing host receives a dedicated IP, request a matching PTR such as `mail.upaidown.com` from the IP owner before changing Postfix HELO. DNS at DonDominio alone cannot set reverse DNS.
6. Do not change the current Postfix hostname to `mail.upaidown.com` while the PTR remains `server.aiworking.pro`; doing so would break the forward/reverse identity match required by Gmail.

## Evidence still needed from Gmail

For a conclusive message-level diagnosis, open the Spam message in Gmail, choose **Show original**, and preserve the `Authentication-Results`, SPF, DKIM, DMARC and Gmail spam explanation. The sender server cannot read Gmail's internal placement reason.
