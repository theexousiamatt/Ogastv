# Account activation checklist

1. Keep first administrator bootstrap disabled until the new CMS deployment succeeds and access is restricted at the hosting layer.
2. Set SMTP variables privately in Hostinger using an OgasTV-owned verified sender mailbox; do not add secrets to GitHub or chat.
3. Test email delivery, email verification and password reset.
4. Create the first administrator during a controlled setup with restricted access, then immediately disable bootstrap and restart.
5. Confirm unauthenticated requests cannot create staff, access internal submissions or read drafts.
6. Keep `READER_SIGNUP_ENABLED=false` until public forms have anti-bot protection and verification email is tested.
