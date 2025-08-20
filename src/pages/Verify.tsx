// src/pages/Verify.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type CodeRow = {
  id: string;
  code: string;
  is_registered: boolean;
  registered_at?: string | null;
  fan_name?: string | null;
  fan_email?: string | null;
  created_at: string;
};

type ViewState = "idle" | "loading" | "ok" | "notfound" | "error";

export default function Verify() {
  const [params] = useSearchParams();
  const initialCode = useMemo(
    () => (params.get("code") || params.get("c") || "").trim(),
    [params]
  );

  const [code, setCode] = useState<string>(initialCode);
  const [state, setState] = useState<ViewState>(initialCode ? "loading" : "idle");
  const [row, setRow] = useState<CodeRow | null>(null);
  const [message, setMessage] = useState<string>("");

  async function check(codeToCheck: string) {
    try {
      setState("loading");
      setMessage("");
      setRow(null);

      const { data, error } = await supabase
        .from("codes")
        .select("*")
        .eq("code", codeToCheck)
        .maybeSingle();

      if (error) {
        console.error(error);
        setMessage(error.message || "Unbekannter Fehler");
        setState("error");
        return;
      }
      if (!data) {
        setMessage(`Code ${codeToCheck} ist unbekannt.`);
        setState("notfound");
        return;
      }

      setRow(data as CodeRow);
      setState("ok");
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || "Fehler bei der Prüfung");
      setState("error");
    }
  }

  // Automatische Prüfung, wenn ?code=… in der URL steht
  useEffect(() => {
    if (initialCode) {
      check(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    check(c);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">FanCard Verifizierung</h1>
        <p className="text-sm text-muted-foreground">
          Diese Seite wird auch automatisch geöffnet, wenn du eine NFC-Karte
          mit einer hinterlegten Verify-URL antippst.
        </p>
      </header>

      {/* Manuelle Eingabe (falls keine ?code= in der URL) */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Code eingeben (z. B. FCABC123...)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button
          type="submit"
          className="px-4 rounded bg-emerald-600 text-white hover:opacity-90"
        >
          Prüfen
        </button>
      </form>

      {/* Statusausgabe */}
      {state === "idle" && (
        <div className="text-sm text-muted-foreground">
          Tipp: Übergib den Code als <code>?code=</code> oder <code>?c=</code> in der URL.
        </div>
      )}

      {state === "loading" && (
        <div className="border rounded p-4 bg-muted/30">Prüfe Karte…</div>
      )}

      {state === "error" && (
        <div className="border rounded p-4 bg-red-50 border-red-200 text-red-700">
          Fehler: {message}
        </div>
      )}

      {state === "notfound" && (
        <div className="border rounded p-4 bg-red-50 border-red-200 text-red-700">
          ❌ {message}
        </div>
      )}

      {state === "ok" && row && (
        <div
          className={`border rounded p-4 ${
            row.is_registered
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="font-mono text-sm">Code: {row.code}</div>
          {row.is_registered ? (
            <div className="mt-2">
              <div className="font-semibold text-green-700">✅ Gültig & registriert</div>
              {row.fan_name && (
                <div>
                  Fan: <strong>{row.fan_name}</strong>
                </div>
              )}
              {row.registered_at && (
                <div>
                  Seit: {new Date(row.registered_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <div className="font-semibold text-yellow-700">
                ⚠️ Code existiert, ist aber (noch) nicht registriert
              </div>
            </div>
          )}
        </div>
      )}

      <section className="text-sm text-muted-foreground">
        <h2 className="font-semibold mb-1">NFC-Tag Format (zum Beschreiben)</h2>
        <p>
          Schreibe eine URL als NDEF-URI auf den Tag, z. B.:{" "}
          <code className="bg-muted px-1 rounded">
            {`${window.location.origin}/verify?code=FC...`}
          </code>
          . Beim Antippen öffnet sich diese Seite und prüft den Code.
        </p>
      </section>
    </div>
  );
}
