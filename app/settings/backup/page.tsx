"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, Database, FileText } from "lucide-react";

export default function BackupPage() {
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/backup/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("エクスポートしました");
    } catch {
      toast.error("エクスポートに失敗しました");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup/import", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("インポートしました。ページをリロードしてください。");
      } else {
        toast.error("インポートに失敗しました");
      }
    } catch {
      toast.error("インポートエラー");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            データエクスポート
          </CardTitle>
          <CardDescription>
            データベースに加え、アップロード画像とPDFを ZIP バックアップします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} className="gap-1">
            <Download className="h-4 w-4" />
            ZIPエクスポート
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            データインポート
          </CardTitle>
          <CardDescription>
            ZIP は画像と PDF も含めて復元します。JSON はデータベースのみ復元します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".zip,.json"
            onChange={handleImport}
            disabled={importing}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データベース
          </CardTitle>
          <CardDescription>SQLiteデータベースの場所</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-2 py-1 text-sm">data/db.sqlite</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDFファイル
          </CardTitle>
          <CardDescription>生成したPDFの保存先</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-2 py-1 text-sm">data/pdfs/</code>
        </CardContent>
      </Card>
    </div>
  );
}
