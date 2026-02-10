import { ServerClient } from 'postmark';

let _client: ServerClient | null = null;

function getClient(): ServerClient {
  if (!_client) {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    if (!token) throw new Error('POSTMARK_SERVER_TOKEN not configured');
    _client = new ServerClient(token);
  }
  return _client;
}

const DEFAULT_FROM = process.env.POSTMARK_FROM_EMAIL || 'noreply@innovareai.com';

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
  replyTo?: string;
  tag?: string;
  metadata?: Record<string, string>;
  messageStream?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  return getClient().sendEmail({
    From: options.from || DEFAULT_FROM,
    To: options.to,
    Subject: options.subject,
    HtmlBody: options.htmlBody,
    TextBody: options.textBody,
    ReplyTo: options.replyTo,
    Tag: options.tag,
    Metadata: options.metadata,
    MessageStream: options.messageStream || 'outbound',
  });
}

export async function sendBatchEmails(emails: SendEmailOptions[]) {
  const messages = emails.map(e => ({
    From: e.from || DEFAULT_FROM,
    To: e.to,
    Subject: e.subject,
    HtmlBody: e.htmlBody,
    TextBody: e.textBody,
    ReplyTo: e.replyTo,
    Tag: e.tag,
    Metadata: e.metadata,
    MessageStream: e.messageStream || 'outbound',
  }));
  // Postmark allows max 500 per batch
  const results = [];
  for (let i = 0; i < messages.length; i += 500) {
    const batch = messages.slice(i, i + 500);
    const result = await getClient().sendEmailBatch(batch);
    results.push(...result);
  }
  return results;
}

export async function sendTemplateEmail(to: string, templateAlias: string, templateModel: Record<string, unknown>, from?: string) {
  return getClient().sendEmailWithTemplate({
    From: from || DEFAULT_FROM,
    To: to,
    TemplateAlias: templateAlias,
    TemplateModel: templateModel,
  });
}
