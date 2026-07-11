"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  LegalDocument,
  getAllLegalDocuments,
  saveLegalDocumentDraft,
  publishLegalDocument,
} from "@/services/legal-service";

export default function LegalSettingsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [type, setType] = useState<"TERMS" | "PRIVACY" | "COOKIES">("TERMS");
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await getAllLegalDocuments();
      setDocuments(data);
    } catch (error) {
      toast.error("Failed to load legal documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSaveDraft = async () => {
    if (!version || !title || !content) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSaving(true);
    try {
      await saveLegalDocumentDraft({ type, version, title, content });
      toast.success("Draft saved successfully");
      setIsEditing(false);
      loadDocuments();
    } catch (error) {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (id: number) => {
    if (!confirm("Are you sure you want to publish this document? This will archive previous versions and force users to consent again.")) {
      return;
    }
    try {
      await publishLegalDocument(id);
      toast.success("Document published successfully");
      loadDocuments();
    } catch (error) {
      toast.error("Failed to publish document");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "PUBLISHED") return <Badge className="bg-emerald-500 hover:bg-emerald-600">Published</Badge>;
    if (status === "DRAFT") return <Badge variant="secondary">Draft</Badge>;
    return <Badge variant="outline">Archived</Badge>;
  };

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Legal Documents</h2>
          <p className="text-sm text-muted-foreground">
            Manage Terms of Use, Privacy Policy, and Cookie policies.
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => {
            setType("TERMS");
            setVersion("");
            setTitle("");
            setContent("");
            setIsEditing(true);
          }}>
            <Plus className="mr-2 size-4" />
            New Version
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Create/Edit Document Draft</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TERMS">Terms of Use</SelectItem>
                  <SelectItem value="PRIVACY">Privacy Policy</SelectItem>
                  <SelectItem value="COOKIES">Cookies Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Version</label>
              <Input
                placeholder="e.g. 1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g. Terms of Use"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content (HTML or Markdown supported by your renderer)</label>
            <Textarea
              className="min-h-[300px] font-mono"
              placeholder="<p>Enter the legal text here...</p>"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Draft
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="mb-4 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">No legal documents found</p>
              <p className="text-sm text-muted-foreground">Create your first legal document version to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {doc.title} <span className="text-muted-foreground">({doc.type})</span>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Version {doc.version} &bull; Created {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(doc.status)}
                    {doc.status === "DRAFT" && (
                      <Button size="sm" onClick={() => handlePublish(doc.id)} className="bg-brand">
                        <CheckCircle2 className="mr-2 size-4" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
