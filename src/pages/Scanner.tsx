import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Camera, CameraOff, Check, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QrScanner from "qr-scanner";
import { fetchCodes, logScan } from "@/lib/fancard";
import type { GeneratedCode as DbCode } from "@/lib/fancard";

interface GeneratedCode {
    id: string;
    code: string;
    createdAt: string;
    isRegistered: boolean;
    registeredAt?: string;
    fanName?: string;
    fanEmail?: string;
}

interface ScanResult {
    code: string;
    fanName?: string;
    status: 'registered' | 'unregistered' | 'invalid';
    timestamp: string;
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

const Scanner = () => {
    const [codes, setCodes] = useState<GeneratedCode[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const qrScannerRef = useRef<QrScanner | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchCodes()
            .then(data => setCodes(data.map(mapFromDb)))
            .catch(e => toast({ title: "Load error", description: e.message, variant: "destructive" }));

        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.destroy();
            }
        };
    }, []);

    const startScanning = async () => {
        if (!videoRef.current) return;

        try {
            qrScannerRef.current = new QrScanner(
                videoRef.current,
                (result) => {
                    handleScanResult(result.data);
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    preferredCamera: 'environment',
                }
            );

            await qrScannerRef.current.start();
            setIsScanning(true);

            toast({
                title: "Scanner Started",
                description: "Point your camera at a QR code to scan.",
            });
        } catch (error) {
            console.error("Error starting scanner:", error);
            toast({
                title: "Scanner Error",
                description: "Could not access camera. Please check permissions.",
                variant: "destructive",
            });
        }
    };

    const stopScanning = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop();
            qrScannerRef.current.destroy();
            qrScannerRef.current = null;
        }
        setIsScanning(false);

        toast({
            title: "Scanner Stopped",
            description: "Camera has been turned off.",
        });
    };

    const handleScanResult = (data: string) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.type === "fancard" && parsed.code) {
                processCode(parsed.code);
                return;
            }
        } catch {
            // ignore JSON parse error → treat as plain code
        }
        processCode(data);
    };

    const processCode = async (code: string) => {
        const foundCode = codes.find(c => c.code === code);

        let result: ScanResult;

        if (!foundCode) {
            result = {
                code,
                status: 'invalid',
                timestamp: new Date().toISOString(),
            };
            await logScan(code, 'invalid');
            toast({
                title: "Invalid Code",
                description: `Code ${code} is not recognized.`,
                variant: "destructive",
            });
        } else if (foundCode.isRegistered) {
            result = {
                code,
                fanName: foundCode.fanName,
                status: 'registered',
                timestamp: new Date().toISOString(),
            };
            await logScan(code, 'registered', foundCode.fanName);
            toast({
                title: "✅ Valid Fan Card",
                description: `Welcome ${foundCode.fanName}!`,
            });
        } else {
            result = {
                code,
                status: 'unregistered',
                timestamp: new Date().toISOString(),
            };
            await logScan(code, 'unregistered');
            toast({
                title: "⚠️ Unregistered Card",
                description: `Code ${code} exists but is not registered to a fan.`,
                variant: "destructive",
            });
        }

        setScanResults(prev => [result, ...prev]);
    };

    const handleManualScan = () => {
        if (!manualCode.trim()) return;

        processCode(manualCode.trim().toUpperCase());
        setManualCode("");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'registered':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'unregistered':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'invalid':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'registered':
                return <Check className="w-4 h-4" />;
            case 'unregistered':
            case 'invalid':
                return <X className="w-4 h-4" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            QR Code Scanner
                        </CardTitle>
                        <CardDescription>
                            Scan QR codes or NFC cards to verify fan registration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                style={{ display: isScanning ? 'block' : 'none' }}
                            />
                            {!isScanning && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center text-white">
                                        <Smartphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p className="text-sm opacity-75">Click Start Scanning to begin</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {!isScanning ? (
                                <Button
                                    onClick={startScanning}
                                    className="flex-1 bg-gradient-to-r from-field to-primary hover:from-field/90 hover:to-primary/90"
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Start Scanning
                                </Button>
                            ) : (
                                <Button
                                    onClick={stopScanning}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    <CameraOff className="w-4 h-4 mr-2" />
                                    Stop Scanning
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Manual Code Entry
                        </CardTitle>
                        <CardDescription>
                            Enter a code manually if scanning is not available.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter fan card code (e.g., FC1234567890)"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                            />
                            <Button
                                onClick={handleManualScan}
                                disabled={!manualCode.trim()}
                                className="w-full"
                                variant="outline"
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Check Code
                            </Button>
                        </div>

                        <div className="mt-8 space-y-4">
                            <h3 className="font-semibold text-lg">Quick Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-2xl font-bold text-green-600">
                                        {scanResults.filter(r => r.status === 'registered').length}
                                    </div>
                                    <div className="text-sm text-green-700">Valid Scans</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                                    <div className="text-2xl font-bold text-red-600">
                                        {scanResults.filter(r => r.status !== 'registered').length}
                                    </div>
                                    <div className="text-sm text-red-700">Invalid Scans</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Scan History</CardTitle>
                    <CardDescription>
                        Recent scan attempts and their results.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {scanResults.map((result, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
                            >
                                <div className="flex items-center gap-4">
                                    <code className="px-3 py-1 bg-muted rounded font-mono text-sm">
                                        {result.code}
                                    </code>
                                    {result.fanName && (
                                        <span className="font-medium">{result.fanName}</span>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(result.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <Badge
                                    className={`${getStatusColor(result.status)} flex items-center gap-1`}
                                    variant="outline"
                                >
                                    {getStatusIcon(result.status)}
                                    {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                                </Badge>
                            </div>
                        ))}
                        {scanResults.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No scans yet. Start scanning to see results here.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Scanner;
