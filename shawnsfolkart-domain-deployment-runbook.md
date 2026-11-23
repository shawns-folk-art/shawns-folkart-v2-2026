# Shawn’s Folkart domain and deployment runbook

This runbook connects `shawnsfolkart.com` to the organization’s GitHub Pages site using Cloudflare DNS. Use it to reproduce the setup, recover from a cutover problem, or publish a new production release.

## Deployment map

| Address | Repository or service | Source |
|---|---|---|
| [shawnsfolkart.com](https://shawnsfolkart.com) | [Organization fork](https://github.com/shawns-folk-art/shawns-folkart-v2-2026) | GitHub Pages from `main` → `/(root)` |
| [www.shawnsfolkart.com](https://www.shawnsfolkart.com) | GitHub Pages | Redirects to the `.com` apex |
| [shawnsfolkart.studio](https://shawnsfolkart.studio) | [Upstream repository](https://github.com/eapostol/shawns-folkart-v2-2026) | GitHub Pages from `develop` → `/(root)` |
| [shawnsfolkart.dev](https://shawnsfolkart.dev) | Cloudflare redirect | Sends visitors to `.studio` |

The `.com` domain registration stays with BlueGenesis/Tucows. Cloudflare manages DNS for `.com`, and GitHub Pages serves the site. The `touchwooddesign.com` mail service uses a separate DNS zone. No `@shawnsfolkart.com` mail service is configured as part of this setup.

## 1. Prepare GitHub and Cloudflare

1. Confirm that you can administer the `shawns-folk-art` GitHub organization and fork, edit the `.com` zone in Cloudflare, and update the domain’s registered nameservers through BlueGenesis.
2. For a rebuild of the GitHub side, use the existing organization and fork if available. To recreate the fork, fork `eapostol/shawns-folkart-v2-2026` into `shawns-folk-art` with **Copy the DEFAULT branch only** checked. The upstream default branch is `main`; its Pages publishing branch is `develop`.
3. In Cloudflare, choose **Add a domain → Connect a domain**, enter `shawnsfolkart.com`, and select **Free**. Review the scanned DNS records against the current provider’s records. Preserve any records needed by existing services.
4. If moving DNS while an older website is still active, stage its current `@` and `www` web records in Cloudflare with **DNS only** enabled. The old records at the original cutover pointed to `216.251.43.8`. Use the live values at the time of a future migration.
5. Record the nameservers the dashboard assigns to this zone. The working setup was observed using `aspen.ns.cloudflare.com` and `dan.ns.cloudflare.com`. Use the pair shown for the zone you are configuring.

[Cloudflare primary DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) · [GitHub fork setup](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo)

## 2. Move DNS to Cloudflare and verify the domain

1. In the [organization’s Pages settings](https://github.com/organizations/shawns-folk-art/settings/pages), select **Add a domain** and enter `shawnsfolkart.com`. Copy the TXT record name and value GitHub provides.
2. In **Cloudflare → shawnsfolkart.com → DNS → Records**, add the TXT record. The relative name for this organization is `_github-pages-challenge-shawns-folk-art`. Use the exact value from GitHub and leave the record in place after verification.
3. If the domain already delegates to the assigned Cloudflare nameservers, continue to step 5. Otherwise, save the current nameservers and web records for rollback. Check for an existing DNSSEC DS record before switching. If there is one tied to the old DNS provider, follow Cloudflare’s instructions to remove it through the registrar before proceeding.
4. In BlueGenesis’s domain registration settings for `shawnsfolkart.com`, replace the entire old nameserver list with the assigned Cloudflare pair. If the editor is unavailable, ask BlueGenesis support to apply the pair. The original delegation used `ns1.meganameservers.com`, `ns2.meganameservers.com`, and `ns3.meganameservers.com`.
5. Wait for Cloudflare to show **Active**. Return to the GitHub organization’s Pages settings, select **Verify** or **Continue verifying**, and confirm that `shawnsfolkart.com` is verified. If verification is already active, confirm the TXT record still exists.

[GitHub domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages) · [Cloudflare nameserver and DNSSEC troubleshooting](https://developers.cloudflare.com/dns/zone-setups/full-setup/troubleshooting/)

## 3. Configure Pages in the fork

1. Open the [fork’s Settings → Pages](https://github.com/shawns-folk-art/shawns-folkart-v2-2026/settings/pages).
2. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/(root)`, then save.
3. Under **Custom domain**, enter `shawnsfolkart.com` and save. With branch publishing, GitHub creates or updates the root `CNAME` file. Check that the fork’s `main` has a `CNAME` containing only `shawnsfolkart.com`. The upstream repository uses `shawnsfolkart.studio`.
4. Check **Actions** in the fork for the Pages deployment. The custom-domain DNS check can remain pending until the web records point to GitHub.

[GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 4. Point the website to GitHub Pages

In **Cloudflare → DNS → Records**, replace the old apex and `www` web records with the following. Use **Auto** TTL and **DNS only** (gray cloud). Clear any stale apex `AAAA` records pointing to the old host and any `www` records that conflict with the new CNAME. Keep the GitHub verification TXT record and other unrelated records.

| Type | Name | Target | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| CNAME | `www` | `shawns-folk-art.github.io` | DNS only |

The CNAME target is the organization’s GitHub Pages hostname. GitHub handles the `www` redirect to the apex when the apex is configured as the custom domain. The `.com` zone needs no Cloudflare redirect rule for this setup.

[GitHub Pages apex and www records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 5. Verify HTTPS and site behavior

1. Wait for the DNS check to pass in the fork’s **Settings → Pages**. When GitHub issues the certificate, enable **Enforce HTTPS**. GitHub says the option can take up to 24 hours to become available.
2. From PowerShell, check the delegation and web records.

   ```powershell
   Resolve-DnsName shawnsfolkart.com -Type NS -Server 1.1.1.1 -DnsOnly
   Resolve-DnsName shawnsfolkart.com -Type A -Server 1.1.1.1 -DnsOnly
   Resolve-DnsName www.shawnsfolkart.com -Type CNAME -Server 1.1.1.1 -DnsOnly
   Resolve-DnsName _github-pages-challenge-shawns-folk-art.shawnsfolkart.com -Type TXT -Server 1.1.1.1 -DnsOnly
   ```

3. Open the HTTPS apex and `www` in a private browser window. Both should end on `shawnsfolkart.com`. HTTP should upgrade to HTTPS once enforced.
4. Open a deep link such as `https://shawnsfolkart.com/theart/index.html?check=1`. Confirm the page loads under `.com`, navigation works, and at least one Ruffle scene loads its SWF assets.
5. Confirm `.studio` still serves the upstream preview and `.dev` still redirects to `.studio`.

[GitHub Pages HTTPS setup](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

## Troubleshooting and rollback

| Symptom | Check or action |
|---|---|
| Cloudflare remains pending | Compare the public NS results with the two assigned nameservers. Confirm BlueGenesis replaced the old list and check for an old DNSSEC DS record. |
| GitHub DNS check fails | Confirm the four apex A records, the `www` CNAME target, and gray-cloud status. Check for conflicting records and allow time for cached answers to expire. |
| Domain shows a GitHub 404 | Check that the fork’s Pages deployment succeeded, its source is `main` → `/(root)`, and Settings → Pages and the root `CNAME` both use `shawnsfolkart.com`. |
| HTTPS is pending | Confirm DNS is correct and allow up to 24 hours. If the delay persists and the zone has CAA records, confirm they allow GitHub’s certificate authority using the HTTPS documentation. |
| The new site needs to be taken out of service during cutover | If the prior host still serves the site, restore its saved `@` and `www` records in Cloudflare. If the problem is with Cloudflare delegation itself, restore the previous nameserver set only if the old DNS zone is still intact. Allow time for DNS caches. |

[GitHub custom-domain troubleshooting](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)

## Publish a production update

1. Merge the feature into upstream `develop` and review the deployed preview at `shawnsfolkart.studio`.
2. In the upstream repository, open a PR with **base `main`** and **compare `develop`**. Use **Create a merge commit** when the preview is approved so Git tracks which changes have already reached upstream `main`.
3. In the organization fork, switch to `main` and choose **Sync fork → Update branch**. If GitHub reports a conflict in `CNAME`, resolve it with `shawnsfolkart.com` in the fork. Avoid a force sync that discards the fork’s custom-domain commit.
4. Confirm that the Pages deployment succeeded in the fork and test the production URL. Routine releases require no DNS edits.

[GitHub fork sync](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)

