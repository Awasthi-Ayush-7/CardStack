"""
Email service abstraction.
For dev: logs to console. For production: configure SMTP env vars.
"""
from ..config import settings

SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USER = settings.smtp_user
SMTP_PASSWORD = settings.smtp_password
FROM_EMAIL = settings.from_email
FRONTEND_URL = settings.frontend_url


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Send password reset email.
    When SMTP is not configured, logs the link to console (dev).
    """
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        _send_via_smtp(to_email, reset_link)
    else:
        # Dev stub: log to console
        print(f"[Email] Password reset for {to_email}")
        print(f"[Email] Reset link: {reset_link}")


def _send_via_smtp(to_email: str, reset_link: str) -> None:
    """Send via SMTP when configured."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your password"
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email

    text = f"Use this link to reset your password: {reset_link}"
    html = f"<p>Use this link to reset your password:</p><p><a href='{reset_link}'>{reset_link}</a></p>"
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
