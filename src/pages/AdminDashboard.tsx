import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Download,
  Users,
  CreditCard,
  CheckCircle,
  Trash2,
  Copy,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCodes,
  createCodes,
  deleteCodeById,
  deletePendingCodes,
  deleteAllCodes,
  GeneratedCode as DbCode,
} from "@/lib/fancard";
import { supabase } from "@/lib/supabaseClient";
import { getVerifyUrl } from "@/lib/verifyUrl";
import QRCode from "qrcode";

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
    fanEmail: row.fan_email ?? undefined,
  };
}

const AdminDashboard = () => {
  const [codes, setCodes] = useState<GeneratedCode[]>([]);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // QR-Overlay-Status
  const [qrState, setQrState] = useState<{
    id: string | null;
    url: string;
    dataUrl: string | null;
  }>({ id: null, url: "", dataUrl: null });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCodes();
      setCodes(data.map(mapFromDb));
    } catch (e: any) {
      toast({ title: "Load error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("codes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "codes" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateCodes = async () => {
    try {
      const inserted = await createCodes(batchSize);
      setCodes((prev) => [...prev, ...inserted.map(mapFromDb)]);
      toast({
        title: "Codes Generated!",
        description: `Successfully generated ${batchSize} new codes.`,
      });
    } catch (e: any) {
      toast({ title: "Create error", description: e.message, variant: "destructive" });
    }
  };

  const exportCodes = () => {
    const csv =
      "Code,Created Date,Status,Registered Date,Name,Email\n" +
      codes
        .map((code) =>
          [
            code.code,
            new Date(code.createdAt).toLocaleDateString(),
            code.isRegistered ? "Registered" : "Pending",
            code.registeredAt ? new Date(code.registeredAt).toLocaleDateString() : "",
            code.fanName ?? "",
            code.fanEmail ?? "",
          ].join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fancard_codes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete!",
      description: "Codes have been exported to CSV file.",
    });
  };

  const handleDeleteCode = async (id: string) => {
    const code = codes.find((c) => c.id === id);
    const label = code ? `${code.code}` : "this code";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    try {
      await deleteCodeById(id);
      setCodes((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Code deleted", description: `${label} has been removed.` });
    } catch (e: any) {
      toast({ title: "Delete error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeletePending = async () => {
    if (!window.confirm("Delete ALL pending (unregistered) codes?")) return;
    try {
      await deletePendingCodes();
      setCodes((prev) => prev.filter((c) => c.isRegistered));
      toast({ title: "Pending codes deleted", description: "All unregistered codes have been removed." });
    } catch (e: any) {
      toast({ title: "Delete error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL codes? This cannot be undone.")) return;
    try {
      await deleteAllCodes();
      setCodes([]);
      toast({ title: "All codes deleted", description: "All codes have been removed." });
    } catch (e: any) {
      toast({ title: "Delete error", description: e.message, variant: "destructive" });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "URL kopiert", description: text });
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", description: "Bitte manuell kopieren.", variant: "destructive" });
    }
  };

  const showQrFor = async (codeItem: GeneratedCode) => {
    try {
      const url = getVerifyUrl(codeItem.code);
      const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 1 });
      setQrState({ id: codeItem.id, url, dataUrl });
    } catch (e: any) {
      toast({ title: "QR error", description: e.message, variant: "destructive" });
    }
  };
  const closeQr = () => setQrState({ id: null, url: "", dataUrl: null });

  const totalCodes = codes.length;
  const registeredCodes = codes.filter((c) => c.isRegistered).length;
  const pendingCodes = totalCodes - registeredCodes;

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-field/10 to-primary/10 border-field/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <CreditCard className="h-4 w-4 text-field" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-field">{loading ? "…" : totalCodes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-whistle/10 to-whistle/20 border-whistle/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <CheckCircle className="h-4 w-4 text-whistle" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-whistle">{loading ? "…" : registeredCodes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-muted/50 to-muted border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{loading ? "…" : pendingCodes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate New Codes
          </CardTitle>
          <CardDescription>Create unique codes for NFC cards that can be registered to football fans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Batch Size</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <Button onClick={generateCodes} className="bg-gradient-to-r from-field to-primary hover:from-field/90 hover:to-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Generate Codes
            </Button>
            {codes.length > 0 && (
              <Button variant="outline" onClick={exportCodes}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {codes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Generated Codes</CardTitle>
              <CardDescription>Alle Codes inkl. Verify-Links und Aktionen.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDeletePending} disabled={pendingCodes === 0} title="Delete all unregistered codes">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Pending
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={codes.length === 0} title="Delete all codes">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {codes
                .slice()
                .reverse()
                .map((codeItem) => {
                  const url = getVerifyUrl(codeItem.code);
                  return (
                    <div key={codeItem.id} className="p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-4">
                          <code className="px-3 py-1 bg-muted rounded font-mono text-sm">{codeItem.code}</code>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                            <span className="text-sm text-muted-foreground">
                              Created: {new Date(codeItem.createdAt).toLocaleDateString()}
                            </span>
                            {codeItem.isRegistered && codeItem.fanName && (
                              <span className="text-sm text-foreground">
                                Name: <strong>{codeItem.fanName}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={codeItem.isRegistered ? "default" : "secondary"}>
                            {codeItem.isRegistered ? "Registered" : "Pending"}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(url)} title="Copy Verify URL">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => window.open(url, "_blank")} title="Open Verify URL">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => showQrFor(codeItem)} title="Show QR">
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCode(codeItem.id)}
                            title={`Delete ${codeItem.code}`}
                            aria-label={`Delete ${codeItem.code}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Verify-URL dauerhaft sichtbar */}
                      <div className="mt-3 flex items-center gap-2">
                        <Input value={url} readOnly className="font-mono text-xs" />
                        <Button variant="outline" onClick={() => copyToClipboard(url)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Overlay */}
      {qrState.id && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl p-5 w-full max-w-xs">
            <h3 className="font-semibold mb-3">Verify QR</h3>
            {qrState.dataUrl ? (
              <img src={qrState.dataUrl} alt="QR" className="w-64 h-64 mx-auto rounded" />
            ) : (
              <div className="text-center py-12 text-muted-foreground">Generating…</div>
            )}
            <div className="mt-3 text-xs text-muted-foreground break-all text-center">{qrState.url}</div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => copyToClipboard(qrState.url)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy URL
              </Button>
              <Button variant="outline" onClick={() => window.open(qrState.url, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
              <Button className="ml-auto" onClick={closeQr}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
