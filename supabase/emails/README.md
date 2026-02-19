# Supabase Email Templates for WordDaily

This directory contains professional HTML email templates for your Supabase Auth configuration. Each template is designed to match the premium, modern aesthetic of WordDaily.

## How to use:
1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** > **E-mail Templates**.
3. For each category, copy the contents of the corresponding file in this directory and paste it into the HTML editor.

### Categories & Files:

- **Confirm signup**: `supabase/emails/confirm_signup.html`
- **Invite user**: `supabase/emails/invite_user.html`
- **Magic link**: `supabase/emails/magic_link.html`
- **Change email address**: `supabase/emails/change_email.html`
- **Reset password**: `supabase/emails/reset_password.html`
- **Reauthentication**: `supabase/emails/reauthentication.html`

## Customization:
- **Logo**: The templates currently use a stylized text "WordDaily". If you wish to use an image logo, replace the `<div class="logo">WordDaily</div>` line with:
  ```html
  <img src="https://your-domain.com/icons/icon-512x512.png" alt="WordDaily" style="height: 48px; width: auto;">
  ```
- **Colors**: The templates use the app's indigo primary color (`#4f46e5`).
