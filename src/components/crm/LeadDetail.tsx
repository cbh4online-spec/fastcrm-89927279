import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLead, useUpdateLead, useDeleteLead, LeadStatus } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Mail, Phone, Calendar, Edit2, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
};

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<{
    name: string;
    email: string;
    phone: string;
    source: string;
    status: LeadStatus;
  } | null>(null);

  const handleEdit = () => {
    if (lead) {
      setEditedLead({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        source: lead.source || "",
        status: lead.status,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!lead || !editedLead) return;

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: editedLead.name,
        email: editedLead.email || undefined,
        phone: editedLead.phone || undefined,
        source: editedLead.source || undefined,
        status: editedLead.status,
      });
      toast.success("Lead updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update lead");
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Lead deleted successfully");
      navigate("/dashboard/leads");
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lead not found</h2>
        <p className="text-muted-foreground mb-4">
          The lead you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate("/dashboard/leads")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/leads")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isEditing ? "Edit Lead" : lead.name}
            </h1>
            <p className="text-muted-foreground">
              Created on {new Date(lead.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateLead.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateLead.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this lead? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Lead Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              {isEditing ? (
                <Input
                  value={editedLead?.name}
                  onChange={(e) =>
                    setEditedLead((prev) => prev && { ...prev, name: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground">{lead.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                Email
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editedLead?.email}
                  onChange={(e) =>
                    setEditedLead((prev) => prev && { ...prev, email: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground">{lead.email || "—"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                Phone
              </label>
              {isEditing ? (
                <Input
                  value={editedLead?.phone}
                  onChange={(e) =>
                    setEditedLead((prev) => prev && { ...prev, phone: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground">{lead.phone || "—"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lead Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Source</label>
              {isEditing ? (
                <Input
                  value={editedLead?.source}
                  onChange={(e) =>
                    setEditedLead((prev) => prev && { ...prev, source: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground">{lead.source || "—"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              {isEditing ? (
                <Select
                  value={editedLead?.status}
                  onValueChange={(value) =>
                    setEditedLead((prev) => prev && { ...prev, status: value as LeadStatus })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  <Badge variant="outline" className={statusColors[lead.status]}>
                    {statusLabels[lead.status]}
                  </Badge>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-foreground">
                {new Date(lead.updated_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
