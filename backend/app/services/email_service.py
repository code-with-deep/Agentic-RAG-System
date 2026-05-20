import logging
import smtplib
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger("agentic_rag.services.email")

def send_reset_password_email(to_email: str, reset_link: str) -> None:
    """Send a password reset email using the configured SMTP server."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning(f"Mail credentials not set. Simulated email to {to_email} with link: {reset_link}")
        return

    msg = EmailMessage()
    msg["Subject"] = "Password Reset - DocMind AI"
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to_email

    body = f"""Hello,

You recently requested to reset your password for your DocMind AI account.
Please click the link below to securely reset it:

{reset_link}

This link will expire in 15 minutes.
If you did not request a password reset, please ignore this email.

Best regards,
The DocMind AI Team
"""
    msg.set_content(body)
    
    html_body = f"""
    <html>
      <head></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hello,</p>
        <p>You recently requested to reset your password for your DocMind AI account. Please click the button below to securely reset it:</p>
        <p>
          <a href="{reset_link}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #0a0a0a; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="{reset_link}">{reset_link}</a></p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The DocMind AI Team</p>
      </body>
    </html>
    """
    msg.add_alternative(html_body, subtype='html')

    try:
        logger.info(f"Sending password reset email to {to_email} via {settings.smtp_host}:{settings.smtp_port}")
        # Gmail uses SMTP on port 587 with STARTTLS
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info(f"Successfully sent password reset email to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        raise
