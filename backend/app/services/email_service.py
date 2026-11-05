"""
SOR SENTINEL — Resend Email Delivery Service
Delivers transactional emails (Signup OTP, Password Reset OTP, and Security Notifications)
using the official Resend Python SDK.
"""
from datetime import datetime, timezone
from typing import Optional, Tuple
import resend

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class EmailDeliveryError(Exception):
    """Raised when an email cannot be delivered via Resend API."""
    pass


def _init_resend() -> None:
    """Ensure Resend API key is configured."""
    api_key = settings.RESEND_API_KEY
    if not api_key or api_key.startswith("re_placeholder"):
        logger.warning("RESEND_API_KEY is not configured or is a placeholder")
        raise EmailDeliveryError("Email delivery service is not configured (missing RESEND_API_KEY).")
    resend.api_key = api_key


def _resolve_delivery_recipient(to_email: str) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Resolves the actual SMTP/API delivery recipient.

    Because Resend's default sender 'onboarding@resend.dev' only permits sending
    to the verified account holder (RESEND_TEST_RECIPIENT_EMAIL), in testing mode
    all outgoing emails are securely dispatched to this authorized address,
    while preserving the user's entered email in Oracle records and sessions.

    Returns:
        (delivery_recipient, routing_notice_html, routing_notice_text)
    """
    test_recip = (settings.RESEND_TEST_RECIPIENT_EMAIL or "").strip()
    from_addr = (settings.RESEND_FROM_EMAIL or "").strip().lower()

    if test_recip and (from_addr == "onboarding@resend.dev" or from_addr.endswith("@resend.dev")):
        if to_email.strip().lower() != test_recip.lower():
            routing_notice_html = f"""
              <div style="margin: 0 0 20px 0; padding: 12px 14px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 11px; color: #475569; line-height: 1.5;">
                <div style="font-weight: 700; color: #334155; margin-bottom: 2px;">
                  [Resend Testing Mode Routing]
                </div>
                Target Account: <strong>{to_email}</strong><br>
                Dispatched to authorized Resend test recipient: <strong>{test_recip}</strong>
              </div>
            """
            routing_notice_text = f"[Resend Testing Mode] Intended target: {to_email} | Dispatched to: {test_recip}\n\n"
            return test_recip, routing_notice_html, routing_notice_text
        return test_recip, None, None

    return to_email, None, None


def _handle_resend_exception(exc: Exception, attempted_recipient: str) -> None:
    """Provides actionable diagnostics for Resend recipient and domain constraints."""
    err_str = str(exc)
    err_lower = err_str.lower()

    if "only send testing emails to your own email address" in err_lower or "validation_error" in err_lower:
        authorized = settings.RESEND_TEST_RECIPIENT_EMAIL or "aayushshirode2007@gmail.com"
        msg = (
            f"Resend testing restriction: The default testing sender '{settings.RESEND_FROM_EMAIL}' "
            f"can only deliver to the verified Resend account email ({authorized}). "
            f"Set RESEND_TEST_RECIPIENT_EMAIL={authorized} in your .env or verify your domain in Resend to send to arbitrary recipients."
        )
        logger.error(msg, attempted_recipient=attempted_recipient, original_error=err_str)
        raise EmailDeliveryError(msg) from exc

    logger.error("Failed to deliver email via Resend", recipient=attempted_recipient, error=err_str)
    raise EmailDeliveryError(f"Email delivery failed: {err_str}") from exc


def _get_base_template(title: str, content_html: str) -> str:
    """Standard responsive email wrapper with SOR SENTINEL cybersecurity branding."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #29212b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1329; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); border: 1px solid #1e293b;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px; text-align: center; border-bottom: 2px solid #06b6d4;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <div style="width: 36px; height: 36px; line-height: 36px; background-color: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; border-radius: 8px; text-align: center; font-size: 18px; color: #06b6d4;">
                      🛡️
                    </div>
                  </td>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 18px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">
                      SOR SENTINEL
                    </div>
                    <div style="font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #06b6d4; text-transform: uppercase;">
                      Security Operations Enclave
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px; background-color: #ffffff;">
              {content_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                This automated transmission was dispatched by the <strong>SOR SENTINEL</strong> Security Enclave.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                &copy; {datetime.now(timezone.utc).year} SOR SENTINEL &bull; AI-Powered Source Credibility and Threat Intelligence
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_signup_otp_email(to_email: str, otp: str, full_name: Optional[str] = None) -> bool:
    """
    Sends a 6-digit OTP email to verify a newly registered user account.
    """
    _init_resend()

    delivery_email, routing_notice_html, routing_notice_text = _resolve_delivery_recipient(to_email)

    greeting = f"Hello <strong>{full_name}</strong>," if full_name else "Hello,"
    subject = "Verify Your SOR SENTINEL Account — One-Time Password"

    notice_block = routing_notice_html or ""

    content_html = f"""
      {notice_block}
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
        Verify Your Account
      </h1>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        {greeting}<br>
        Thank you for registering with <strong>SOR SENTINEL</strong>. To activate your security profile and access the intelligence dashboard, please submit the following one-time verification code:
      </p>

      <!-- OTP Display -->
      <div style="margin: 28px 0; padding: 20px; background-color: #f0fdf4; border: 1.5px dashed #22c55e; border-radius: 10px; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #15803d; text-transform: uppercase; margin-bottom: 8px;">
          Your 6-Digit Verification Code
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
          {otp}
        </div>
        <div style="font-size: 12px; color: #166534; margin-top: 8px; font-weight: 500;">
          Expires in <strong>5 minutes</strong> &bull; Single-use only
        </div>
      </div>

      <!-- Security Notice -->
      <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #9f1239; margin-bottom: 4px;">
          CRITICAL SECURITY NOTICE
        </div>
        <div style="font-size: 12px; color: #be123c; line-height: 1.5;">
          Never disclose this code to anyone. Sentinel administrators and engineers will never contact you requesting your verification code.
        </div>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
        If you did not request this account registration, please ignore this transmission.
      </p>
    """

    content_text = f"""{routing_notice_text or ''}SOR SENTINEL — Verify Your Account

{greeting}
Thank you for registering with SOR SENTINEL.

Your 6-digit verification code is: {otp}

This code expires in 5 minutes.
SECURITY NOTICE: Never share this code with anyone.

If you did not register for an account, please disregard this email.
"""

    html = _get_base_template("Verify Your SOR SENTINEL Account", content_html)

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [delivery_email],
        "subject": subject,
        "html": html,
        "text": content_text,
    }

    try:
        response = resend.Emails.send(params)
        logger.info(
            "Signup OTP email sent successfully via Resend",
            intended_recipient=to_email,
            delivery_recipient=delivery_email,
            resend_id=getattr(response, "id", None),
        )
        return True
    except Exception as exc:
        _handle_resend_exception(exc, delivery_email)
        return False


def send_password_reset_otp_email(to_email: str, otp: str, full_name: Optional[str] = None) -> bool:
    """
    Sends a 6-digit OTP email to authorize a password recovery operation.
    """
    _init_resend()

    delivery_email, routing_notice_html, routing_notice_text = _resolve_delivery_recipient(to_email)

    greeting = f"Hello <strong>{full_name}</strong>," if full_name else "Hello,"
    subject = "Password Reset Request — SOR SENTINEL"

    notice_block = routing_notice_html or ""

    content_html = f"""
      {notice_block}
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
        Password Recovery Request
      </h1>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        {greeting}<br>
        We received a request to reset the password associated with your <strong>SOR SENTINEL</strong> account. Use the one-time code below to authenticate this operation:
      </p>

      <!-- OTP Display -->
      <div style="margin: 28px 0; padding: 20px; background-color: #eff6ff; border: 1.5px dashed #3b82f6; border-radius: 10px; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #1d4ed8; text-transform: uppercase; margin-bottom: 8px;">
          Password Reset Authorization Code
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
          {otp}
        </div>
        <div style="font-size: 12px; color: #1e40af; margin-top: 8px; font-weight: 500;">
          Expires in <strong>5 minutes</strong> &bull; Valid for a single password reset
        </div>
      </div>

      <!-- Security Notice -->
      <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #9f1239; margin-bottom: 4px;">
          SECURITY ADVISORY
        </div>
        <div style="font-size: 12px; color: #be123c; line-height: 1.5;">
          If you did NOT initiate this password reset, your account credentials may be compromised. Please sign in and review your security settings immediately.
        </div>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
        Never share this recovery code with anyone.
      </p>
    """

    content_text = f"""{routing_notice_text or ''}SOR SENTINEL — Password Recovery Request

{greeting}
We received a request to reset your password.

Your 6-digit password reset code is: {otp}

This code expires in 5 minutes.
SECURITY ADVISORY: If you did not initiate this request, your account may be under attack.

Never share this code with anyone.
"""

    html = _get_base_template("Password Reset Request — SOR SENTINEL", content_html)

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [delivery_email],
        "subject": subject,
        "html": html,
        "text": content_text,
    }

    try:
        response = resend.Emails.send(params)
        logger.info(
            "Password reset OTP email sent successfully via Resend",
            intended_recipient=to_email,
            delivery_recipient=delivery_email,
            resend_id=getattr(response, "id", None),
        )
        return True
    except Exception as exc:
        _handle_resend_exception(exc, delivery_email)
        return False


def send_password_reset_success_email(to_email: str, full_name: Optional[str] = None) -> bool:
    """
    Sends a security notification confirming that the user's password has been updated.
    """
    _init_resend()

    delivery_email, routing_notice_html, routing_notice_text = _resolve_delivery_recipient(to_email)

    greeting = f"Hello <strong>{full_name}</strong>," if full_name else "Hello,"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    subject = "Security Alert: Password Changed Successfully — SOR SENTINEL"

    notice_block = routing_notice_html or ""

    content_html = f"""
      {notice_block}
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
        Password Changed Successfully
      </h1>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        {greeting}<br>
        This transmission confirms that your password for <strong>SOR SENTINEL</strong> was successfully updated on <strong>{now_str}</strong>.
      </p>

      <!-- Confirmation Banner -->
      <div style="margin: 24px 0; padding: 18px 20px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px;">
          ✔ Status: Password Updated
        </div>
        <div style="font-size: 12px; color: #15803d; line-height: 1.5;">
          You can now authenticate across all SOR SENTINEL consoles using your new password. All prior password-reset tokens have been permanently invalidated.
        </div>
      </div>

      <!-- Warning if unexpected -->
      <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">
          DID NOT PERFORM THIS ACTION?
        </div>
        <div style="font-size: 12px; color: #b91c1c; line-height: 1.5;">
          If you did not authorize this change, someone else may have gained access to your account. Contact the SOR SENTINEL security response team immediately to lock your account.
        </div>
      </div>
    """

    content_text = f"""{routing_notice_text or ''}SOR SENTINEL — Password Changed Successfully

{greeting}
Your password for SOR SENTINEL was successfully changed on {now_str}.

You can now log in with your new password.

If you did not perform this action, please contact security support immediately.
"""

    html = _get_base_template("Password Changed Successfully — SOR SENTINEL", content_html)

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [delivery_email],
        "subject": subject,
        "html": html,
        "text": content_text,
    }

    try:
        response = resend.Emails.send(params)
        logger.info(
            "Password change success confirmation email sent via Resend",
            intended_recipient=to_email,
            delivery_recipient=delivery_email,
            resend_id=getattr(response, "id", None),
        )
        return True
    except Exception as exc:
        logger.error("Failed to send password reset confirmation email via Resend", recipient=delivery_email, error=str(exc))
        return False
