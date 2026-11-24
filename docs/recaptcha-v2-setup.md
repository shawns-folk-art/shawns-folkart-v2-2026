# Set up reCAPTCHA v2 Checkbox for Shawn’s Folk Art

The Comments page uses Google’s reCAPTCHA v2 Checkbox and sends the challenge response to Formspree. Use a dedicated key for local and staging tests. If you set up reCAPTCHA for the GRASP site, you can sign in with the same Google account and create a separate key for Shawn’s Folk Art.

## 1. Register the test key with Google

1. Open the [reCAPTCHA registration form](https://www.google.com/recaptcha/admin/create) and sign in with the Google account that should manage the key.
2. In **Label**, enter `Shawn’s Folk Art - Comments Test`.
3. Under **reCAPTCHA type**, choose **Challenge (v2)**. If Google offers v2 variants, select **“I’m not a robot” Checkbox**. In Google Cloud, the resulting key should read **Website • checkbox**.
4. Enter each host below as a separate domain. Enter the host by itself, without a protocol, port, or path.

   | Host | Used for |
   | --- | --- |
   | `localhost` | Live Server at `http://localhost:5500/comments/index.html` |
   | `shawnsfolkart.studio` | Staging Comments page |

   If you open a staging URL on `shawnsfolkart.dev` and it redirects to `shawnsfolkart.studio`, the checkbox runs on `.studio`. If `.dev` actually serves the Comments page under its own hostname, add `shawnsfolkart.dev` too. Use `localhost` in your Live Server URL so the address matches the registered host.
5. If Google prompts for a Cloud project, select a project managed for Shawn’s Folk Art or create one. Accept the terms if prompted, then click **Submit**.
6. Copy the **Site key** and **Secret key** if Google shows them. If the screen opens Google Cloud or shows only a key ID, follow section 3.

[Google’s key creation guide](https://docs.cloud.google.com/recaptcha/docs/create-key-website)

## 2. Create the key in Google Cloud Console if that is the screen you have open

1. Open the [Google Cloud reCAPTCHA page](https://console.cloud.google.com/security/recaptcha). In current Google documentation, this area is called **Fraud Defense**.
2. Use the top project selector to select a Shawn’s Folk Art project or create one with **New project**. If prompted, [enable the reCAPTCHA Enterprise API](https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com) for that project.
3. Open **Keys → Create key**. Enter `Shawn’s Folk Art - Comments Test` as the display name and choose **Web**.
4. Leave **Disable domain verification** switched off. Under **Domain list**, click **Add a domain** for each host in section 1.
5. Click **Next Step (optional)** to open **Additional settings**. Turn on **Will you use challenges?**, then choose a **Challenge security** setting. Leave **Are you creating this key for testing purposes only?** off for an end-to-end test using normal challenge behavior.
6. Click **Create key**. On **Keys**, check that the result is **Website • checkbox**. If the console asks for a score threshold that triggers challenges, that is the policy-based setup. Use the registration form in section 1 to select the v2 checkbox explicitly.

[Google Cloud setup and permissions](https://docs.cloud.google.com/recaptcha/docs/prepare-environment) · [Google’s checkbox key instructions](https://docs.cloud.google.com/recaptcha/docs/create-key-website)

## 3. Retrieve the matching site key and legacy secret

1. On the [Google Cloud reCAPTCHA page](https://console.cloud.google.com/security/recaptcha), select the correct project and go to **Keys**.
2. Open the entry you just created. In card view, click **Key details**. Copy the **Key ID** from the top of the details page. This is the public site key.
3. Open the **Integration** tab. Click **Use legacy key** or **Integrate with a third-party service or plugin**, whichever Google shows.
4. Copy the **legacy secret key** from the dialog. Google also documents **Edit key → Reveal** as a way to retrieve it.
5. Record the configuration in `docs/recaptcha-v2-setup.local.md`. Store the secret itself in your password manager and record its entry name in the worksheet.

[Google’s site key and secret retrieval steps](https://docs.cloud.google.com/recaptcha/docs/reconcile-legacy-terminology)

## 4. Connect Formspree and the Comments page

| Google value | Where it goes |
| --- | --- |
| Public site key (**Key ID**) | `data-recaptcha-site-key` on `<main id="comments">` in [`comments/index.html`](../comments/index.html) |
| Matching legacy secret key | **Custom reCAPTCHA** in the Formspree test form’s CAPTCHA settings |

1. Sign into [Formspree](https://formspree.io/forms) and open the test form whose endpoint is `https://formspree.io/f/mjywplve`.
2. Select **Settings**. Under **Spam protection**, enable **CAPTCHA** and click **Adjust settings**.
3. Under **CAPTCHA solution**, choose **Custom reCAPTCHA**. Paste the matching **legacy secret key** and save.
4. In `comments/index.html`, fill the empty `data-recaptcha-site-key=""` attribute with the public site key. GitHub Pages serves this HTML to visitors, so keep the legacy secret in Formspree and your password manager.

[Formspree’s custom reCAPTCHA setup](https://help.formspree.io/articles/form-and-project-settings/adding-a-custom-recaptcha-v2-key/)

## 5. Test locally, then on staging

1. Start Live Server and open [the local Comments page](http://localhost:5500/comments/index.html).
2. Enter `Test Visitor`, `visitor@example.com`, and `Shawn’s Folk Art - reCAPTCHA test` in the Flash form. Click **Submit**. The checkbox should appear in a dialog over Flash.
3. Click **Cancel** first. Confirm that the Flash fields stay editable, the thank-you screen stays hidden, and no submission appears in the Formspree dashboard.
4. Click **Submit** again, tick **I’m not a robot**, and complete Google's image challenge if one appears. After Formspree accepts the message, the dialog should close and the Flash thank-you should appear.
5. Confirm the test message in the Formspree dashboard and the notification in the configured test inbox. Look for the three visitor fields `name`, `email`, and `message`.
6. Repeat on the [staging Comments page](https://shawnsfolkart.studio/comments/index.html) once the branch’s Comments changes and public site key are deployed there. Record both results in the worksheet.

| Symptom | What to check |
| --- | --- |
| Google reports an invalid domain | Compare the browser hostname with the Google key’s allowed domains. Changes can take up to 30 minutes to apply. |
| Google reports an invalid key type | Check that Google lists the key as **Website • checkbox**. |
| The checkbox loads but Formspree rejects the message | Confirm the test endpoint and **Custom reCAPTCHA** settings. Check that the legacy secret belongs to the same Google key as the public site key in the page, then complete a fresh challenge. |

[Google’s integration troubleshooting](https://docs.cloud.google.com/recaptcha/docs/troubleshoot-recaptcha-issues)

## 6. Configure production

Create a separate reCAPTCHA v2 Checkbox key for `shawnsfolkart.com` and a separate Formspree form. Verify the production recipient in Formspree and configure that form with the matching legacy secret.

Set `data-production-recaptcha-site-key` and `data-production-formspree-endpoint` in `comments/index.html` to the production public site key and form endpoint. The page selects those values on `shawnsfolkart.com`. Localhost and staging use the test configuration.

After the production deployment, submit a test through `https://shawnsfolkart.com/comments/index.html` and confirm the Flash thank-you, submission in the production Formspree dashboard, and delivery to the production inbox.
