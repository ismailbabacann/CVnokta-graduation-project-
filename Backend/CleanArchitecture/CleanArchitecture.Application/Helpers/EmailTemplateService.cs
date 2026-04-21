using System;

namespace CleanArchitecture.Core.Helpers
{
    /// <summary>
    /// Centralized email HTML template service for CVNokta.
    /// All templates share a consistent branded layout with gradient header and clean footer.
    /// </summary>
    public static class EmailTemplateService
    {
        // ── Brand colors ──────────────────────────────────────────────────
        private const string PrimaryColor   = "#667eea";
        private const string SecondaryColor = "#764ba2";
        private const string TextDark       = "#2d3748";
        private const string TextMuted      = "#718096";
        private const string BgLight        = "#f7fafc";
        private const string BorderColor    = "#e2e8f0";
        private const string SuccessColor   = "#48bb78";
        private const string DangerColor    = "#e53e3e";

        // ══════════════════════════════════════════════════════════════════
        //  BASE LAYOUT
        // ══════════════════════════════════════════════════════════════════
        private static string WrapInLayout(string bodyContent, string preheaderText = "")
        {
            return $@"
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <meta http-equiv='X-UA-Compatible' content='IE=edge'>
    <title>CVNokta</title>
    <!--[if mso]>
    <style type='text/css'>
        body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
    <style>
        /* Reset */
        body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
        body {{ margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: {BgLight}; }}

        /* Typography */
        body, td, p {{
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: {TextDark};
        }}

        /* Container */
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }}

        /* Header */
        .email-header {{
            background: linear-gradient(135deg, {PrimaryColor} 0%, {SecondaryColor} 100%);
            padding: 40px 30px;
            text-align: center;
        }}
        .email-header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.5px;
        }}
        .email-header p {{
            margin: 8px 0 0 0;
            font-size: 14px;
            color: rgba(255,255,255,0.85);
        }}

        /* Body */
        .email-body {{
            padding: 40px 30px;
        }}
        .email-body h2 {{
            font-size: 22px;
            font-weight: 600;
            color: {TextDark};
            margin: 0 0 16px 0;
        }}
        .email-body p {{
            margin: 0 0 16px 0;
        }}

        /* CTA Button */
        .btn {{
            display: inline-block;
            padding: 14px 36px;
            background: linear-gradient(135deg, {PrimaryColor} 0%, {SecondaryColor} 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            mso-padding-alt: 14px 36px;
        }}

        /* Info Card */
        .info-card {{
            background-color: {BgLight};
            border: 1px solid {BorderColor};
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }}
        .info-card table {{
            width: 100%;
        }}
        .info-card td {{
            padding: 6px 0;
            vertical-align: top;
        }}
        .info-card .label {{
            font-size: 13px;
            font-weight: 600;
            color: {TextMuted};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            width: 140px;
        }}
        .info-card .value {{
            font-size: 15px;
            color: {TextDark};
            font-weight: 500;
        }}

        /* Status Badge */
        .badge {{
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }}
        .badge-success {{
            background-color: #f0fff4;
            color: {SuccessColor};
            border: 1px solid #c6f6d5;
        }}
        .badge-danger {{
            background-color: #fff5f5;
            color: {DangerColor};
            border: 1px solid #fed7d7;
        }}

        /* Divider */
        .divider {{
            border: none;
            border-top: 1px solid {BorderColor};
            margin: 24px 0;
        }}

        /* Footer */
        .email-footer {{
            background-color: {BgLight};
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid {BorderColor};
        }}
        .email-footer p {{
            margin: 0;
            font-size: 13px;
            color: {TextMuted};
        }}
        .email-footer a {{
            color: {PrimaryColor};
            text-decoration: none;
        }}

        /* Responsive */
        @media screen and (max-width: 640px) {{
            .email-container {{ width: 100% !important; }}
            .email-body {{ padding: 24px 20px !important; }}
            .email-header {{ padding: 30px 20px !important; }}
        }}
    </style>
</head>
<body style='margin:0; padding:0; background-color:{BgLight};'>
    <!-- Preheader text (hidden) -->
    <div style='display:none;font-size:1px;color:{BgLight};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;'>
        {preheaderText}
    </div>

    <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:{BgLight};'>
        <tr>
            <td align='center' style='padding: 30px 10px;'>
                <table role='presentation' class='email-container' width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);'>
                    {bodyContent}
                    <!-- Footer -->
                    <tr>
                        <td class='email-footer'>
                            <p>&copy; {DateTime.UtcNow.Year} <strong>CVNokta</strong>. All rights reserved.</p>
                            <p style='margin-top:8px;'>Smart HR Solutions &bull; Powered by AI</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }

        // ══════════════════════════════════════════════════════════════════
        //  1. REGISTRATION CONFIRMATION
        // ══════════════════════════════════════════════════════════════════
        public static string GetRegistrationConfirmationTemplate(string firstName, string verificationUrl)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header'>
                            <h1>Welcome to CVNokta!</h1>
                            <p>Your smart career journey starts here</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Hi {firstName} 👋</h2>
                            <p>We're thrilled to have you join the CVNokta community! You're just one step away from unlocking powerful tools to manage your career or find the perfect candidate.</p>
                            <p>Please confirm your email address by clicking the button below:</p>

                            <div style='text-align:center; margin:32px 0;'>
                                <a href='{verificationUrl}' class='btn' style='color:#ffffff;'>✉️ Verify My Account</a>
                            </div>

                            <hr class='divider' />

                            <p style='font-size:14px; color:{TextMuted};'>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style='word-break:break-all; font-size:13px; color:{PrimaryColor}; background-color:{BgLight}; padding:12px; border-radius:8px;'>{verificationUrl}</p>

                            <hr class='divider' />

                            <p style='font-size:14px; color:{TextMuted};'>If you didn't create an account with CVNokta, you can safely ignore this email.</p>

                            <p>Best regards,<br/><strong>The CVNokta Team</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, "Confirm your CVNokta account to get started.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  2. APPLICATION RECEIVED
        // ══════════════════════════════════════════════════════════════════
        public static string GetApplicationReceivedTemplate(
            string candidateName,
            string jobTitle,
            string department,
            string location,
            string workType,
            string workModel)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header'>
                            <h1>Application Received!</h1>
                            <p>We've got your application — here's what happens next</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Hi {candidateName} 👋</h2>
                            <p>Thank you for applying! We're excited to review your application. Here's a summary of the position you applied for:</p>

                            <div class='info-card'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Position</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Department</td>
                                        <td class='value'>{department ?? "—"}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Location</td>
                                        <td class='value'>{location ?? "—"}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Work Type</td>
                                        <td class='value'>{workType ?? "—"}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Work Model</td>
                                        <td class='value'>{workModel ?? "—"}</td>
                                    </tr>
                                </table>
                            </div>

                            <h2 style='font-size:18px;'>📋 What Happens Next?</h2>
                            <table role='presentation' cellpadding='0' cellspacing='0' style='margin:16px 0;'>
                                <tr>
                                    <td style='padding:8px 12px 8px 0; vertical-align:top; font-size:20px;'>1️⃣</td>
                                    <td style='padding:8px 0;'>
                                        <strong>Application Review</strong><br/>
                                        <span style='font-size:14px; color:{TextMuted};'>Our hiring team will carefully review your profile and qualifications.</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding:8px 12px 8px 0; vertical-align:top; font-size:20px;'>2️⃣</td>
                                    <td style='padding:8px 0;'>
                                        <strong>AI-Powered Analysis</strong><br/>
                                        <span style='font-size:14px; color:{TextMuted};'>Your CV will be analyzed by our smart matching system for the best fit.</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding:8px 12px 8px 0; vertical-align:top; font-size:20px;'>3️⃣</td>
                                    <td style='padding:8px 0;'>
                                        <strong>Status Update</strong><br/>
                                        <span style='font-size:14px; color:{TextMuted};'>You'll receive an email notification about the outcome of your application.</span>
                                    </td>
                                </tr>
                            </table>

                            <hr class='divider' />

                            <p style='font-size:14px; color:{TextMuted};'>We appreciate your interest and will get back to you as soon as possible. Good luck! 🍀</p>

                            <p>Warm regards,<br/><strong>The CVNokta HR Team</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"Your application for {jobTitle} has been received.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  3. APPLICATION ACCEPTED (Moved to Next Stage)
        // ══════════════════════════════════════════════════════════════════
        public static string GetApplicationAcceptedTemplate(
            string candidateName,
            string jobTitle,
            string nextStage)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header' style='background: linear-gradient(135deg, {SuccessColor} 0%, #38a169 100%);'>
                            <h1>Great News! 🎉</h1>
                            <p>Your application is progressing</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Hi {candidateName} 👋</h2>
                            <p>We have exciting news about your application!</p>

                            <div class='info-card' style='border-left: 4px solid {SuccessColor};'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Position</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Status</td>
                                        <td class='value'><span class='badge badge-success'>✅ Progressing</span></td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Next Stage</td>
                                        <td class='value' style='color:{PrimaryColor}; font-weight:600;'>{nextStage}</td>
                                    </tr>
                                </table>
                            </div>

                            <p>Your profile stood out among the applicants, and we'd like to move forward with your candidacy. Our team will be in touch shortly with further details about the <strong>{nextStage}</strong> stage.</p>

                            <h2 style='font-size:18px;'>💡 Tips for the Next Step</h2>
                            <ul style='padding-left:20px; color:{TextDark};'>
                                <li style='margin-bottom:8px;'>Keep an eye on your inbox for scheduling details</li>
                                <li style='margin-bottom:8px;'>Review the job description to prepare effectively</li>
                                <li style='margin-bottom:8px;'>Make sure your contact information is up to date</li>
                            </ul>

                            <hr class='divider' />

                            <p>We look forward to the next step in this journey with you!</p>

                            <p>Best regards,<br/><strong>The CVNokta HR Team</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"Your application for {jobTitle} is moving forward!");
        }

        // ══════════════════════════════════════════════════════════════════
        //  4. APPLICATION REJECTED
        // ══════════════════════════════════════════════════════════════════
        public static string GetApplicationRejectedTemplate(
            string candidateName,
            string jobTitle)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header'>
                            <h1>Application Update</h1>
                            <p>An update regarding your recent application</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Hi {candidateName},</h2>
                            <p>Thank you for your interest in joining our team and for taking the time to apply.</p>

                            <div class='info-card' style='border-left: 4px solid {DangerColor};'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Position</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Status</td>
                                        <td class='value'><span class='badge badge-danger'>Not Selected</span></td>
                                    </tr>
                                </table>
                            </div>

                            <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match the requirements for this particular role.</p>

                            <p>This decision was not easy, and it does not diminish the value of your experience and skills. We genuinely encourage you to apply for future positions that align with your profile.</p>

                            <div style='background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%); border-radius:12px; padding:20px; margin:24px 0; text-align:center;'>
                                <p style='margin:0; font-size:15px; color:{TextDark};'>
                                    🔔 <strong>Stay Connected!</strong><br/>
                                    <span style='font-size:14px; color:{TextMuted};'>Your CV is saved in our system. We'll notify you when new matching positions are available.</span>
                                </p>
                            </div>

                            <hr class='divider' />

                            <p>We wish you all the best in your career journey.</p>

                            <p>Kind regards,<br/><strong>The CVNokta HR Team</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"Update on your application for {jobTitle}.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  5. FORGOT PASSWORD
        // ══════════════════════════════════════════════════════════════════
        public static string GetForgotPasswordTemplate(string firstName, string resetToken)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header'>
                            <h1>Password Reset</h1>
                            <p>We received a request to reset your password</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Hi {firstName},</h2>
                            <p>We received a request to reset the password for your CVNokta account. Use the reset token below to set a new password:</p>

                            <div class='info-card' style='text-align:center;'>
                                <p style='margin:0 0 8px 0; font-size:13px; color:{TextMuted}; text-transform:uppercase; letter-spacing:1px;'>Your Reset Token</p>
                                <p style='margin:0; font-size:18px; font-weight:700; color:{PrimaryColor}; word-break:break-all; font-family:monospace; background:#ffffff; padding:12px; border-radius:8px; border:1px dashed {PrimaryColor};'>{resetToken}</p>
                            </div>

                            <p style='font-size:14px; color:{TextMuted};'>⏰ This token is valid for a limited time. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>

                            <hr class='divider' />

                            <p style='font-size:14px; color:{TextMuted};'>For security reasons, never share this token with anyone.</p>

                            <p>Best regards,<br/><strong>The CVNokta Team</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, "Your CVNokta password reset token.");
        }
        // ══════════════════════════════════════════════════════════════════
        //  6. PIPELINE — SKILLS TEST INVITE
        // ══════════════════════════════════════════════════════════════════
        public static string GetSkillsTestInviteTemplate(string candidateName, string jobTitle, int threshold)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header' style='background: linear-gradient(135deg, {PrimaryColor} 0%, {SecondaryColor} 100%);'>
                            <h1>🎯 Beceri Testi Daveti</h1>
                            <p>CV analizini başarıyla geçtiniz — sıradaki adım sizi bekliyor!</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Tebrikler, {candidateName}! 🎉</h2>
                            <p>CV analizinde <strong>%{threshold}</strong> başarı eşiğini geçtiniz. Sizi <strong>{jobTitle}</strong> pozisyonu için Genel Beceri Testi'ne davet ediyoruz.</p>

                            <div class='info-card' style='border-left: 4px solid {PrimaryColor};'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Pozisyon</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Sonraki Adım</td>
                                        <td class='value' style='color:{PrimaryColor}; font-weight:600;'>Genel Beceri Testi</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Geçiş Eşiği</td>
                                        <td class='value'>%{threshold} ve üzeri</td>
                                    </tr>
                                </table>
                            </div>

                            <p>Sisteme giriş yaparak sınavınıza başlayabilirsiniz. Başarılar! 🍀</p>

                            <hr class='divider' />
                            <p>Saygılarımızla,<br/><strong>CVNokta İK Ekibi</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"{jobTitle} için Beceri Testi daveti.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  7. PIPELINE — ENGLISH TEST INVITE
        // ══════════════════════════════════════════════════════════════════
        public static string GetEnglishTestInviteTemplate(string candidateName, string jobTitle, int threshold)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header' style='background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);'>
                            <h1>🇬🇧 İngilizce Testi Daveti</h1>
                            <p>Harika gidiyorsunuz — bir sonraki aşamaya geçtiniz!</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Mükemmel, {candidateName}! 🌟</h2>
                            <p>Genel beceri testini başarıyla tamamladınız. <strong>{jobTitle}</strong> sürecinin bir sonraki aşamasına geçtiniz: <strong>İngilizce Dil Yeterlilik Testi</strong>.</p>

                            <div class='info-card' style='border-left: 4px solid #00b4db;'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Pozisyon</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Bu Aşama</td>
                                        <td class='value' style='color:#0083b0; font-weight:600;'>İngilizce Testi</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Geçiş Eşiği</td>
                                        <td class='value'>%{threshold} ve üzeri</td>
                                    </tr>
                                </table>
                            </div>

                            <p>Sisteme giriş yaparak İngilizce testinize başlayabilirsiniz. Bol şans! 🍀</p>

                            <hr class='divider' />
                            <p>Saygılarımızla,<br/><strong>CVNokta İK Ekibi</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"{jobTitle} için İngilizce Testi daveti.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  8. PIPELINE — AI INTERVIEW INVITE
        // ══════════════════════════════════════════════════════════════════
        public static string GetAiInterviewInviteTemplate(string candidateName, string jobTitle, int threshold, string interviewUrl)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header' style='background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);'>
                            <h1>🤖 AI Mülakat Daveti</h1>
                            <p>Son aşamaya ulaştınız — muhteşem!</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>İnanılmaz, {candidateName}! 🏆</h2>
                            <p>Tüm testleri başarıyla geçtiniz ve <strong>{jobTitle}</strong> sürecinin son aşamasına ulaştınız: <strong>Yapay Zeka Destekli Mülakat</strong>.</p>

                            <div class='info-card' style='border-left: 4px solid #f5576c;'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Pozisyon</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Son Aşama</td>
                                        <td class='value' style='color:#f5576c; font-weight:600;'>AI Mülakat</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Geçiş Eşiği</td>
                                        <td class='value'>%{threshold} ve üzeri</td>
                                    </tr>
                                </table>
                            </div>

                            <div style='text-align:center; margin:32px 0;'>
                                <a href='{interviewUrl}' class='btn' style='color:#ffffff; background-color: #f5576c;'>📸 Mülakata Başla</a>
                            </div>

                            <p>Mülakat linkiniz yalnızca size özeldir. Kendinize güvenin! 💪</p>

                            <hr class='divider' />
                            <p>Saygılarımızla,<br/><strong>CVNokta İK Ekibi</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"{jobTitle} için AI Mülakat daveti.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  9. PIPELINE — COMPLETED (All stages passed)
        // ══════════════════════════════════════════════════════════════════
        public static string GetPipelineCompletedTemplate(string candidateName, string jobTitle)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header' style='background: linear-gradient(135deg, {SuccessColor} 0%, #38a169 100%);'>
                            <h1>🎉 Tebrikler!</h1>
                            <p>Tüm aşamaları başarıyla tamamladınız</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Harika iş çıkardınız, {candidateName}! 🏅</h2>
                            <p><strong>{jobTitle}</strong> başvurusu kapsamındaki tüm değerlendirme aşamalarını başarıyla tamamladınız.</p>

                            <div class='info-card' style='border-left: 4px solid {SuccessColor};'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Pozisyon</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Durum</td>
                                        <td class='value'><span class='badge badge-success'>✅ Tüm Aşamalar Tamamlandı</span></td>
                                    </tr>
                                </table>
                            </div>

                            <p>İK ekibimiz değerlendirmeleri tamamlayıp en kısa sürede sizinle iletişime geçecektir. Sabırlı olduğunuz için teşekkür ederiz.</p>

                            <div style='background: linear-gradient(135deg, rgba(72,187,120,0.1) 0%, rgba(56,161,105,0.1) 100%); border-radius:12px; padding:20px; margin:24px 0; text-align:center;'>
                                <p style='margin:0; font-size:16px; color:{TextDark};'>
                                    🌟 <strong>Süreçleri başarıyla tamamladınız!</strong><br/>
                                    <span style='font-size:14px; color:{TextMuted};'>Gerekli değerlendirmeler yapılmaktadır.</span>
                                </p>
                            </div>

                            <hr class='divider' />
                            <p>Saygı ve takdirlerimizle,<br/><strong>CVNokta İK Ekibi</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"Tebrikler! {jobTitle} süreçlerini tamamladınız.");
        }

        // ══════════════════════════════════════════════════════════════════
        //  10. PIPELINE — REJECTION (stage-aware)
        // ══════════════════════════════════════════════════════════════════
        public static string GetPipelineRejectionTemplate(
            string candidateName, string jobTitle, string stageName, int score, int threshold, string aiFeedback = null)
        {
            var body = $@"
                    <!-- Header -->
                    <tr>
                        <td class='email-header'>
                            <h1>Başvurunuz Hakkında</h1>
                            <p>Değerlendirme sonucuna ilişkin güncelleme</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td class='email-body'>
                            <h2>Merhaba {candidateName},</h2>
                            <p>Başvurunuz ve süreçlerimize gösterdiğiniz ilgi için teşekkür ederiz.</p>

                            <div class='info-card' style='border-left: 4px solid {DangerColor};'>
                                <table role='presentation' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td class='label'>Pozisyon</td>
                                        <td class='value'>{jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Aşama</td>
                                        <td class='value'>{stageName}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Skorunuz</td>
                                        <td class='value'>%{score}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Gerekli Eşik</td>
                                        <td class='value'>%{threshold}</td>
                                    </tr>
                                    <tr>
                                        <td class='label'>Durum</td>
                                        <td class='value'><span class='badge badge-danger'>Bu aşamada sonuçlandı</span></td>
                                    </tr>
                                </table>
                            </div>

                            <p><strong>{stageName}</strong> aşamasında elde ettiğiniz skor, bu pozisyon için belirlenen gerekli eşiğin altında kalmıştır.</p>
                            
                            {(!string.IsNullOrWhiteSpace(aiFeedback) ? $@"
                            <div style='background-color:#fff5f5; border-left: 4px solid {DangerColor}; padding:16px; margin:20px 0;'>
                                <p style='margin:0 0 8px 0; font-weight:600; color:{DangerColor};'>🤖 Yapay Zeka Değerlendirmesi:</p>
                                <p style='margin:0; font-size:14px; color:{TextDark};'>{aiFeedback}</p>
                            </div>" : "")}

                            <p>Bu karar, yetkinliklerinizin ve deneyimlerinizin değerini azaltmamaktadır. Kendinizi geliştirmeye devam etmenizi ve ileride uygun pozisyonlara başvurmanızı tavsiye ederiz.</p>

                            <hr class='divider' />
                            <p>Başarılar dileriz,<br/><strong>CVNokta İK Ekibi</strong></p>
                        </td>
                    </tr>";

            return WrapInLayout(body, $"{jobTitle} başvurunuz hakkında güncelleme.");
        }
    }
}
