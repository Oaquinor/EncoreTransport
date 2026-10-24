# Gmail API email delivery

Laravel now has a `gmail_api` mail transport. Booking-created notifications are queued to the lead passenger email (including guest checkout) and use the sender address configured in Admin → General.

## Google setup

1. Enable Gmail API in the Google Cloud project that owns the OAuth client.
2. Configure OAuth consent for **User data** and authorize the Gmail `gmail.send` scope for the mailbox Encore Transport will send from.
3. The supplied OAuth client is a web client with no authorized redirect URI. Add `https://developers.google.com/oauthplayground` as an approved redirect URI before authorizing it. In the [Google OAuth Playground](https://developers.google.com/oauthplayground/), use this OAuth client and request offline access so the authorization-code exchange returns a refresh token.
4. Save the refresh token as the server-side `GMAIL_REFRESH_TOKEN` secret. Do not put OAuth secrets or refresh tokens in the frontend, source control, or the Admin General form.

## Laravel runtime

Set these server environment values:

```dotenv
MAIL_MAILER=gmail_api
MAIL_FROM_ADDRESS=the-authorized-mailbox@example.com
MAIL_FROM_NAME="Encore Transport"
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

Set the same sender mailbox in Admin → General. Clear Laravel's cached config after changing environment values and run a queue worker in production so queued booking notifications are delivered.

The current payment gateway is still unconfigured. Therefore, the existing booking notification confirms a reservation hold (`pending_payment`); issuing a paid ticket by email requires the payment provider's verified success callback.
