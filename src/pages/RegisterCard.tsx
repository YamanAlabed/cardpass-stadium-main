import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, QrCode, Check, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { fetchCodes, registerCode } from "@/lib/fancard";
import type { GeneratedCode as DbCode } from "@/lib/fancard";
import { supabase } from "@/lib/supabaseClient";
import { getVerifyUrl } from "@/lib/verifyUrl";

interface GeneratedCode {
  id: string;
  code: string;
  createdAt: string;
  isRegistered: boolean;
  registeredAt?: string;
  fanName?: string;
  fanEmail?: string;
}

function mapFromDb(row: DbCode): GeneratedCode {
  return {
    id: row.id,
    code: row.code,
    createdAt: row.created_at,
    isRegistered: row.is_registered,
    registeredAt: row.registered_at ?? undefined,
    fanName: row.fan_name ?? undefined,
    fanEmail: row.fan_email ?? undefined
  };
}

const RegisterCard = () => {
  const [codes, setCodes] = useState<GeneratedCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [fanName, setFanName] = useState<string>("");
  const [fanEmail, setFanEmail] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [verifyUrl, setVerifyUrl] = useState<string>("");
  const [lastReg, setLastReg] = useState<{ code: string; fanName: string } | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await fetchCodes();
      setCodes(data.map(mapFromDb));
    } catch (e: any) {
      toast({ title: "Load error", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    load();
  }, []);

  // optional: Realtime, damit neue Registrierungen sofort sichtbar
  useEffect(() => {
    const channel = supabase
      .channel("codes-realtime-register")
      .on("postgres_changes", { event: "*", schema: "public", table: "codes" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const availableCodes = codes.filter((c) => !c.isRegistered);

  const generateQRCode = async (code: string) => {
    const qrData = JSON.stringify({
      type: "fancard",
      code: code,
      timestamp: Date.now(),
    });
    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1f4d2f",
        light: "#ffffff",
      },
    });
    setQrDataUrl(dataUrl);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "URL kopiert", description: text });
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", description: "Bitte manuell kopieren.", variant: "destructive" });
    }
  };

  const registerCardHandler = async () => {
    if (!selectedCode || !fanName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a code and enter fan name.",
        variant: "destructive",
      });
      return;
    }

    try {
      await registerCode(selectedCode, fanName.trim(), fanEmail.trim() || undefined);

      // URL & QR erzeugen – und die zuletzt registrierten Daten im State halten
      const url = getVerifyUrl(selectedCode);
      setVerifyUrl(url);
      setLastReg({ code: selectedCode, fanName: fanName.trim() });
      await generateQRCode(selectedCode);

      // Liste neu laden
      await load();

      toast({
        title: "Card Registered!",
        description: `Successfully registered card for ${fanName}.`,
      });

      // Formular zurücksetzen – Anzeige nutzt lastReg/verifyUrl
      setSelectedCode("");
      setFanName("");
      setFanEmail("");
    } catch (e: any) {
      toast({ title: "Register error", description: e.message, variant: "destructive" });
    }
  };

  const printQRCode = () => {
    if (!qrDataUrl || !lastReg) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fan Card QR Code</title>
            <style>
              body { display:flex; flex-direction:column; align-items:center; padding:20px; font-family: Arial, sans-serif; }
              .qr-container { text-align:center; border:2px solid #1f4d2f; padding:20px; border-radius:10px; margin:20px; }
              h2 { color:#1f4d2f; margin-bottom:10px; }
              .code { font-family: monospace; font-size: 18px; font-weight: bold; margin: 10px 0; padding: 10px; background: #f0f9f0; border-radius: 5px; }
              .url { font-size: 12px; word-break: break-all; color: #234; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>FanCard Pro</h2>
              <img src="${qrDataUrl}" alt="QR Code" />
              <div class="code">${lastReg.code}</div>
              <p>Fan: ${lastReg.fanName}</p>
              <p>Registered: ${new Date().toLocaleDateString()}</p>
              ${verifyUrl ? `<p class="url">${verifyUrl}</p>` : ""}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Register New Card
            </CardTitle>
            <CardDescription>
              Assign a code to a physical NFC card and register it to a fan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code-select">Select Available Code</Label>
              <select
                id="code-select"
                className="w-full p-3 border border-input rounded-md bg-background"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
              >
                <option value="">Choose a code...</option>
                {availableCodes.map((code) => (
                  <option key={code.id} value={code.code}>
                    {code.code} (Created: {new Date(code.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
              {availableCodes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No available codes. Generate some codes first in the Admin Dashboard.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fan-name">Fan Name *</Label>
              <Input
                id="fan-name"
                placeholder="Enter fan's full name"
                value={fanName}
                onChange={(e) => setFanName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fan-email">Fan Email (Optional)</Label>
              <Input
                id="fan-email"
                type="email"
                placeholder="Enter fan's email"
                value={fanEmail}
                onChange={(e) => setFanEmail(e.target.value)}
              />
            </div>

            <Button
              onClick={registerCardHandler}
              disabled={!selectedCode || !fanName.trim()}
              className="w-full bg-gradient-to-r from-field to-primary hover:from-field/90 hover:to-primary/90"
            >
              <Check className="w-4 h-4 mr-2" />
              Register Card
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Generated QR Code & Verify URL
            </CardTitle>
            <CardDescription>
              QR + Link für die Karte – direkt kopierbar und druckbar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verify URL Block: erscheint nach Registrierung */}
            {lastReg && verifyUrl ? (
              <div className="space-y-2">
                <Label>Verify URL</Label>
                <div className="flex gap-2">
                  <Input value={verifyUrl} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="outline" onClick={() => copyToClipboard(verifyUrl)} title="Copy URL">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.open(verifyUrl, "_blank")} title="Open URL">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Diese URL in <strong>NFC Tools → Write → URL/URI</strong> schreiben.
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Registriere eine Karte, dann erscheint hier die Verify-URL.
              </div>
            )}

            {/* QR-Block */}
            {qrDataUrl && lastReg ? (
              <div className="text-center space-y-4">
                <div className="border-2 border-field/20 rounded-lg p-4 bg-gradient-to-br from-field/5 to-primary/5">
                  <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-4 rounded" />
                  <code className="block px-3 py-2 bg-muted rounded font-mono text-sm">
                    {lastReg.code}
                  </code>
                  <div className="text-sm text-muted-foreground">Fan: {lastReg.fanName}</div>
                </div>
                <Button onClick={printQRCode} variant="outline" className="w-full">
                  Print QR Code
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Register a card to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Registered Cards</CardTitle>
          <CardDescription>Overview of recently registered fan cards.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {codes
              .filter((c) => c.isRegistered)
              .slice()
              .reverse()
              .map((code) => (
                <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                  <div className="flex items-center gap-4">
                    <code className="px-3 py-1 bg-field/10 rounded font-mono text-sm">{code.code}</code>
                    <div className="text-sm">
                      <div className="font-medium">{code.fanName}</div>
                      {code.fanEmail && <div className="text-muted-foreground">{code.fanEmail}</div>}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <Badge variant="default" className="mb-1">
                      Registered
                    </Badge>
                    <div className="text-muted-foreground">
                      {code.registeredAt && new Date(code.registeredAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            {codes.filter((c) => c.isRegistered).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No registered cards yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterCard;
