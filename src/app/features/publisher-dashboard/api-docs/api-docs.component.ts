import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublisherHeaderComponent } from '../components/header/header.component';
import { PublisherSidebarComponent } from '../components/sidebar/sidebar.component';
import { PublisherFooterComponent } from '../components/footer/footer.component';

export type CodeLang = 'curl' | 'nodejs' | 'csharp' | 'python';

export interface ToastMsg { id: number; message: string; }

@Component({
  selector: 'app-partner-api-docs',
  standalone: true,
  imports: [CommonModule, RouterLink, PublisherHeaderComponent, PublisherSidebarComponent, PublisherFooterComponent],
  templateUrl: './api-docs.component.html',
  styleUrl: './api-docs.component.css',
})
export class PartnerApiDocsComponent {
  // ── Active language tab per section ──────────────────────────────────────
  authTab: CodeLang = 'curl';
  redeemTab: CodeLang = 'curl';
  webhookTab: CodeLang = 'curl';

  // ── Toast system ──────────────────────────────────────────────────────────
  toasts: ToastMsg[] = [];
  private toastCounter = 0;

  // ── Smooth scroll ─────────────────────────────────────────────────────────
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  copy(text: string, label = 'Copied!'): void {
    navigator.clipboard.writeText(text).then(() => this.toast(label));
  }

  toast(msg: string): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, message: msg });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 3000);
  }

  // ── Code snippets ─────────────────────────────────────────────────────────
  readonly ENDPOINT = 'https://winfloos.runasp.net/api/partner/coupons/redeem';
  readonly WEBHOOK_IPS = ['34.118.33.53', '138.68.125.171', '64.226.93.56', '74.220.53.15', '74.220.53.234', '74.220.53.235'];
  readonly REQUEST_BODY_EXAMPLE = '{\n  "code": "CPN-A1B2C3D4"\n}';
  readonly RESPONSE_EXAMPLE = '{\n  "couponId": "018f3a5b-...",\n  "code": "CPN-A1B2C3D4",\n  "usdValue": 10.00,\n  "userId": "018f3a5b-...",\n  "countryCode": "EG",\n  "status": "Redeemed",\n  "createdAt": "2026-10-28T12:00:00Z",\n  "redeemedAt": "2026-10-28T12:05:00Z"\n}';

  // S2S Auth snippets
  readonly authSnippets: Record<CodeLang, string> = {
    curl: `# Build Basic credentials
CREDENTIAL=$(echo -n "pk_live_YOUR_API_KEY:sk_live_YOUR_API_SECRET" | base64)

curl -X POST https://winfloos.runasp.net/api/partner/coupons/redeem \\
  -H "Authorization: Basic $CREDENTIAL" \\
  -H "Content-Type: application/json" \\
  -d '{"code": "CPN-A1B2C3D4"}'`,

    nodejs: `import axios from 'axios';

const apiKey    = 'pk_live_YOUR_API_KEY';
const apiSecret = 'sk_live_YOUR_API_SECRET';
const credentials = Buffer.from(\`\${apiKey}:\${apiSecret}\`).toString('base64');

const response = await axios.post(
  'https://winfloos.runasp.net/api/partner/coupons/redeem',
  { code: 'CPN-A1B2C3D4' },
  {
    headers: {
      Authorization: \`Basic \${credentials}\`,
      'Content-Type': 'application/json',
    },
  }
);

console.log(response.data);`,

    csharp: `using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var apiKey    = "pk_live_YOUR_API_KEY";
var apiSecret = "sk_live_YOUR_API_SECRET";
var credentials = Convert.ToBase64String(
    Encoding.UTF8.GetBytes($"{apiKey}:{apiSecret}"));

using var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Basic", credentials);

var body    = JsonSerializer.Serialize(new { code = "CPN-A1B2C3D4" });
var content = new StringContent(body, Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://winfloos.runasp.net/api/partner/coupons/redeem", content);

var json = await response.Content.ReadAsStringAsync();
Console.WriteLine(json);`,

    python: `import requests
import base64

api_key    = "pk_live_YOUR_API_KEY"
api_secret = "sk_live_YOUR_API_SECRET"
credentials = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()

response = requests.post(
    "https://winfloos.runasp.net/api/partner/coupons/redeem",
    headers={
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    },
    json={"code": "CPN-A1B2C3D4"},
)

print(response.json())`,
  };

  // Coupon redeem snippets (same auth, focus on parsing response)
  readonly redeemSnippets: Record<CodeLang, string> = {
    curl: `curl -X POST https://winfloos.runasp.net/api/partner/coupons/redeem \\
  -H "Authorization: Basic <Base64(ApiKey:ApiSecret)>" \\
  -H "Content-Type: application/json" \\
  -d '{"code": "CPN-A1B2C3D4"}'`,

    nodejs: `// Node.js Fetch (built-in, Node 18+)
const credentials = Buffer.from(\`\${apiKey}:\${apiSecret}\`).toString('base64');

const res = await fetch(
  'https://winfloos.runasp.net/api/partner/coupons/redeem',
  {
    method: 'POST',
    headers: {
      Authorization: \`Basic \${credentials}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: 'CPN-A1B2C3D4' }),
  }
);

if (!res.ok) {
  const err = await res.json();
  throw new Error(err.detail ?? 'Redemption failed');
}

const { usdValue } = await res.json();
// Apply usdValue as discount in your checkout ✅`,

    csharp: `var result = await client.PostAsync(endpoint, content);

if (!result.IsSuccessStatusCode) {
    var problem = await result.Content.ReadFromJsonAsync<ProblemDetails>();
    throw new Exception(problem?.Detail ?? "Redemption failed");
}

var coupon = await result.Content.ReadFromJsonAsync<RedeemResponse>();
// coupon.UsdValue → apply as discount 💰`,

    python: `response = requests.post(url, headers=headers, json={"code": "CPN-A1B2C3D4"})

if response.status_code != 200:
    err = response.json()
    raise Exception(err.get("detail", "Redemption failed"))

data = response.json()
usd_value = data["usdValue"]   # Apply as discount in checkout ✅`,
  };

  // Webhook snippets
  readonly webhookSnippets: Record<CodeLang, string> = {
    curl: `# Conversion Postback (GET example)
# Nexus calls YOUR endpoint automatically on conversion
GET https://your-app.com/postback/offerwall
  ?offer_id=oneshotaos2409
  &user_id=user_12345
  &amount=5.00
  &currency=USD
  &transaction_id=TXN-ABC123
  &status=completed
  &timestamp=2026-10-28T12:00:00Z`,

    nodejs: `// Express.js handler — receive Nexus webhook
import express from 'express';

const ALLOWED_IPS = [
  '34.118.33.53', '138.68.125.171', '64.226.93.56',
  '74.220.53.15',  '74.220.53.234',  '74.220.53.235',
];

app.post('/postback/offerwall', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'];
  if (!ALLOWED_IPS.includes(ip)) {
    return res.status(403).send('Forbidden');
  }

  const { user_id, amount, status, transaction_id } = req.body;

  if (status === 'completed') {
    // Credit the user's balance in your system
    creditUser(user_id, parseFloat(amount));
  }

  res.status(200).send('OK');  // Must respond 200
});`,

    csharp: `[HttpPost("postback/offerwall")]
public IActionResult ReceivePostback([FromBody] PostbackPayload payload)
{
    var allowedIps = new[]
    {
        "34.118.33.53", "138.68.125.171", "64.226.93.56",
        "74.220.53.15",  "74.220.53.234",  "74.220.53.235"
    };

    var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
    if (!allowedIps.Contains(clientIp))
        return StatusCode(403);

    if (payload.Status == "completed")
        _walletService.CreditUser(payload.UserId, payload.Amount);

    return Ok();   // Must respond 200
}`,

    python: `from flask import Flask, request, abort

ALLOWED_IPS = {
    "34.118.33.53", "138.68.125.171", "64.226.93.56",
    "74.220.53.15",  "74.220.53.234",  "74.220.53.235",
}

@app.route("/postback/offerwall", methods=["POST"])
def receive_postback():
    client_ip = request.remote_addr
    if client_ip not in ALLOWED_IPS:
        abort(403)

    data = request.get_json()
    if data.get("status") == "completed":
        credit_user(data["user_id"], float(data["amount"]))

    return "OK", 200   # Must respond 200`,
  };

  // Readable labels
  readonly langLabels: Record<CodeLang, string> = {
    curl: 'cURL',
    nodejs: 'Node.js',
    csharp: 'C#',
    python: 'Python',
  };

  readonly langs: CodeLang[] = ['curl', 'nodejs', 'csharp', 'python'];
}
