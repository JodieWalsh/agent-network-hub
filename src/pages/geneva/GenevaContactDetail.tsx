/**
 * GenevaContactDetail.tsx — Geneva Phase 2: the contact record.
 *
 * Top summary panel + tabs: Overview, Notes, Tasks, Timeline.
 * GENEVA is BAH's INTERNAL customer CRM (docs/GENEVA_ROADMAP.md) — admin-only
 * shared team view (route gated requiredRole="admin"; RLS enforces is_admin).
 * NO owner filtering anywhere — the team sees everything, deliberately.
 *
 * Design: quiet luxury (CLAUDE.md). Data: raw fetch via src/lib/geneva.ts.
 * Dialogs: frosted quiet-luxury modals — never window.confirm().
 * App-level rule: changing lifecycle_stage to 'inactive' REQUIRES a reason
 * (picked in the same dialog, saved to inactive_reason + timeline context).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Check,
  ChevronDown,
  Pencil,
  StickyNote,
  ClipboardList,
  History,
  UserRound,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  Hourglass,
  X,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GenevaContact,
  GenevaNote,
  GenevaTask,
  GenevaActivity,
  PROFESSIONAL_TYPE_LABELS,
  GENEVA_STAGE_LABELS,
  INACTIVE_REASON_LABELS,
  SOURCE_LABELS,
  CONSENT_LABELS,
  LAUNCH_REGION_LABELS,
  INTERVIEW_STAGE_LABELS,
  INTERVIEW_EXIT_LABELS,
  ALL_INTERVIEW_STAGE_LABELS,
  restHeaders,
  writeGenevaActivity,
  pushToMailchimp,
} from "@/lib/geneva";

/* ------------------------------------------------------------- constants */

const EVENT_LABELS: Record<string, string> = {
  contact_created: "Contact created",
  note_added: "Note added",
  stage_changed: "Stage changed",
  interview_stage_changed: "Interview stage changed",
  task_created: "Task created",
  task_completed: "Task completed",
  source_captured: "Source captured",
  consent_changed: "Consent changed",
  pushed_to_mailchimp: "Pushed to Mailchimp",
  owner_changed: "Owner changed",
  welcome_email_sent: "Welcome email sent",
};

const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

/** Interview Funnel: gentle advisory next-task suggestions per stage —
 *  offered once, dismissible, NEVER automatic (the admin always clicks). */
const INTERVIEW_TASK_SUGGESTIONS: Record<string, { prompt: string; taskTitle: string }> = {
  interview_booked: {
    prompt: "Interview booked ✦ add “Send interview questions + Zoom details” as a task?",
    taskTitle: "Send interview questions + Zoom details",
  },
  questions_sent: {
    prompt: "Questions sent ✦ add “Send reminder text a few hours before the interview” as a task?",
    taskTitle: "Send reminder text a few hours before the interview",
  },
  interviewed: {
    prompt: "Interview done ✦ add “Send thank-you email (clips coming soon)” as a task?",
    taskTitle: "Send thank-you email (clips coming soon)",
  },
  thanked: {
    prompt: "Thanked ✦ add “Send promotional clips for their own channels” as a task?",
    taskTitle: "Send promotional clips for their own channels",
  },
};

const INTERVIEW_STEP_ORDER = Object.keys(INTERVIEW_STAGE_LABELS);

/* ------------------------------------------------------- shared visuals */

const panelStyle = {
  background:
    "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 55%, rgba(246,241,234,0.72) 100%)",
  borderTop: "1px solid rgba(183,110,121,0.3)",
};
const panelClass =
  "rounded-[20px] border border-white/60 backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]";
const inputClass =
  "w-full rounded-xl border border-[#1C1917]/15 bg-white/90 px-4 py-2.5 font-sans text-sm text-[#1C1917] placeholder:text-[#8A8580] outline-none transition-colors focus:border-[#2D6350] focus:ring-2 focus:ring-[#2D6350]/15";
const labelClass =
  "mb-1.5 block font-sans text-xs font-medium uppercase tracking-[0.14em] text-[#57534E]";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-[#2D6350] px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(23,58,49,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A31] disabled:translate-y-0 disabled:opacity-60";
const subtleBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#2D6350]/25 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#2D6350] transition-colors hover:bg-[#2D6350]/[0.06]";
const quietBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#1C1917]/12 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#57534E] transition-colors hover:border-[#2D6350]/30 hover:text-[#2D6350]";
const cancelBtn =
  "rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white";

function StageBadge({ stage, onChange }: { stage: string; onChange?: () => void }) {
  const tone =
    stage === "active_customer"
      ? "border-[#2D6350]/25 bg-[#2D6350]/[0.08] text-[#2D6350]"
      : ["engaged", "qualified", "nurturing", "trial_early_access"].includes(stage)
      ? "border-[#B76E79]/30 bg-[#B76E79]/[0.09] text-[#8F4E58]"
      : stage === "inactive"
      ? "border-[#1C1917]/12 bg-white/60 text-[#57534E]"
      : "border-[#1C1917]/15 bg-[#D8C3B8]/25 text-[#57534E]"; // new
  const inner = GENEVA_STAGE_LABELS[stage] || stage;
  if (!onChange) {
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-xs font-medium ${tone}`}>
        {inner}
      </span>
    );
  }
  return (
    <button
      id="stage-badge"
      onClick={onChange}
      aria-label={`Change lifecycle stage (currently ${inner})`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-xs font-medium transition-colors hover:border-[#2D6350]/45 ${tone}`}
    >
      {inner}
      <ChevronDown size={12} strokeWidth={2.25} className="opacity-70" />
    </button>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[#1C1917]/12 bg-white/80 px-2.5 py-1 font-sans text-xs font-medium text-[#1C1917]">
      {PROFESSIONAL_TYPE_LABELS[type] || type}
    </span>
  );
}

function ConsentDot({ status }: { status: string }) {
  const dot =
    status === "subscribed"
      ? "bg-[#2D6350]"
      : status === "pending"
      ? "bg-[#D8C3B8]"
      : "bg-[#8F4E58]/60";
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-xs text-[#57534E]">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {CONSENT_LABELS[status] || status}
    </span>
  );
}

/** Frosted quiet-luxury modal — the project's elegant alternative to window.confirm. */
function Modal({
  title, open, onClose, children,
}: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#173A31]/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`${panelClass} relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-6`}
        style={{ ...panelStyle, background: "linear-gradient(150deg, #FFFFFF 0%, #FBF8F3 60%, #F6F1EA 100%)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-[#1C1917]">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-[#57534E] transition-colors hover:bg-[#1C1917]/[0.06]">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- helpers */

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function isOverdue(task: GenevaTask): boolean {
  return task.status === "open" && !!task.due_at && new Date(task.due_at).getTime() < Date.now();
}

/* ------------------------------------------------------------ component */

type TabKey = "overview" | "notes" | "tasks" | "timeline";

export default function GenevaContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contact, setContact] = useState<GenevaContact | null>(null);
  const [notes, setNotes] = useState<GenevaNote[]>([]);
  const [tasks, setTasks] = useState<GenevaTask[]>([]);
  const [activities, setActivities] = useState<GenevaActivity[]>([]);
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState(false);

  // dialogs
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [editingNote, setEditingNote] = useState<GenevaNote | null>(null);
  const [deleteNoteFor, setDeleteNoteFor] = useState<GenevaNote | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "", description: "", owner_id: "", due_at: "", priority: "medium", status: "open",
  });
  const [rescheduleTask, setRescheduleTask] = useState<GenevaTask | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [stageOpen, setStageOpen] = useState(false);
  const [stageChoice, setStageChoice] = useState("");
  const [stageReason, setStageReason] = useState("");
  // Interview Funnel (outreach contacts only)
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewChoice, setInterviewChoice] = useState("");
  const [dismissedSuggestion, setDismissedSuggestion] = useState<string | null>(null); // session-only

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const loadAll = useCallback(async () => {
    if (!user || !id) return;
    try {
      const headers = restHeaders();
      // Shared team view — NO owner filter (RLS = admin-only, deliberate)
      const [cRes, nRes, tRes, aRes, pRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/geneva_contacts?id=eq.${id}&select=*`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/geneva_notes?contact_id=eq.${id}&select=*&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/geneva_tasks?contact_id=eq.${id}&select=*&order=status.asc,due_at.asc.nullslast`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/geneva_activities?contact_id=eq.${id}&select=*&order=created_at.desc&limit=100`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/profiles?role=eq.admin&select=id,full_name&order=full_name.asc`, { headers }),
      ]);
      const [c] = cRes.ok ? await cRes.json() : [];
      setContact(c || null);
      setNotes(nRes.ok ? await nRes.json() : []);
      setTasks(tRes.ok ? await tRes.json() : []);
      setActivities(aRes.ok ? await aRes.json() : []);
      setAdmins(pRes.ok ? await pRes.json() : []);
    } catch (e) {
      console.error("Error loading Geneva contact record:", e);
    } finally {
      setLoading(false);
    }
  }, [user, id, supabaseUrl]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const adminName = useCallback(
    (userId: string | null) => {
      if (!userId) return "Team";
      if (userId === user?.id) return "You";
      return admins.find((a) => a.id === userId)?.full_name || "Team";
    },
    [admins, user]
  );

  const openTasks = useMemo(() => tasks.filter((t) => t.status === "open"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status !== "open"), [tasks]);

  /* --------------------------------------------------------- mutations */

  const saveNote = async () => {
    if (!user || !id || !noteBody.trim()) { toast.error("Write a note first."); return; }
    setBusy(true);
    try {
      if (editingNote) {
        const res = await fetch(`${supabaseUrl}/rest/v1/geneva_notes?id=eq.${editingNote.id}`, {
          method: "PATCH",
          headers: restHeaders(true),
          body: JSON.stringify({ body: noteBody.trim() }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Note updated");
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/geneva_notes`, {
          method: "POST",
          headers: restHeaders(true),
          body: JSON.stringify({ contact_id: id, body: noteBody.trim(), created_by: user.id }),
        });
        if (!res.ok) throw new Error(await res.text());
        await writeGenevaActivity(id, user.id, "note_added", { excerpt: noteBody.trim().slice(0, 120) });
        toast.success("Note added");
      }
      setNoteBody(""); setEditingNote(null); setNoteOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not save the note.");
    } finally { setBusy(false); }
  };

  const deleteNote = async () => {
    if (!deleteNoteFor) return;
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/geneva_notes?id=eq.${deleteNoteFor.id}`, {
        method: "DELETE", headers: restHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Note deleted");
      setDeleteNoteFor(null);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not delete the note.");
    } finally { setBusy(false); }
  };

  const openTaskDialog = () => {
    setTaskDraft({ title: "", description: "", owner_id: user?.id || "", due_at: "", priority: "medium", status: "open" });
    setTaskOpen(true);
  };

  const saveTask = async () => {
    if (!user || !id || !taskDraft.title.trim()) { toast.error("Give the task a title."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/geneva_tasks`, {
        method: "POST",
        headers: restHeaders(true),
        body: JSON.stringify({
          contact_id: id,
          title: taskDraft.title.trim(),
          description: taskDraft.description.trim() || null,
          owner_id: taskDraft.owner_id || null,
          due_at: taskDraft.due_at ? new Date(taskDraft.due_at).toISOString() : null,
          priority: taskDraft.priority,
          status: taskDraft.status,
          completed_at: taskDraft.status === "completed" ? new Date().toISOString() : null,
          created_by: user.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeGenevaActivity(id, user.id, "task_created", {
        title: taskDraft.title.trim(),
        owner: adminName(taskDraft.owner_id || null),
      });
      toast.success("Task created");
      setTaskOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not create the task.");
    } finally { setBusy(false); }
  };

  const completeTask = async (task: GenevaTask) => {
    if (!user || !id) return;
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/geneva_tasks?id=eq.${task.id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeGenevaActivity(id, user.id, "task_completed", { title: task.title });
      toast.success("Task completed");
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not complete the task.");
    } finally { setBusy(false); }
  };

  const applyReschedule = async () => {
    if (!rescheduleTask || !rescheduleDate) { toast.error("Pick a new due date."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/geneva_tasks?id=eq.${rescheduleTask.id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify({ due_at: new Date(rescheduleDate).toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Task rescheduled");
      setRescheduleTask(null); setRescheduleDate("");
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not reschedule the task.");
    } finally { setBusy(false); }
  };

  /** Explicit-button-only Mailchimp push (Phase 3). The edge function
   *  re-verifies admin + 'subscribed' server-side — this is just the relay. */
  const handleMailchimpPush = async () => {
    if (!contact) return;
    setBusy(true);
    try {
      const res = await pushToMailchimp(contact.id);
      if (res.ok) {
        toast.success("Pushed to Mailchimp — nurture sequence can begin");
        await loadAll();
      } else if (res.reason === "not_subscribed") {
        toast.error("Only subscribed contacts can be pushed to Mailchimp.");
      } else if (res.reason === "consent_not_recorded") {
        toast.error(
          "This outreach contact's consent isn't recorded yet — edit the contact and note how consent was obtained first."
        );
      } else {
        toast.error("Mailchimp push didn't go through — try again shortly.");
      }
    } finally {
      setBusy(false);
    }
  };

  const openStageDialog = () => {
    if (!contact) return;
    setStageChoice(contact.lifecycle_stage);
    setStageReason(contact.inactive_reason || "");
    setStageOpen(true);
  };

  /* ------------------- Interview Funnel stage change (outreach only) */

  const openInterviewDialog = () => {
    if (!contact) return;
    setInterviewChoice(contact.interview_stage || "to_contact");
    setInterviewOpen(true);
  };

  const saveInterviewStage = async () => {
    if (!user || !id || !contact) return;
    const from = contact.interview_stage;
    const to = interviewChoice;
    if (to === from) { setInterviewOpen(false); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/geneva_contacts?id=eq.${id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify({
          interview_stage: to,
          interview_stage_entered_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeGenevaActivity(id, user.id, "interview_stage_changed", { from, to });
      toast.success("Interview stage updated");
      setInterviewOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not update the interview stage.");
    } finally { setBusy(false); }
  };

  /** Accepting a suggestion just opens the normal Add Task dialog,
   *  pre-filled — the admin still clicks Create. Never automatic. */
  const acceptTaskSuggestion = (taskTitle: string, stageKey: string) => {
    setTaskDraft({
      title: taskTitle, description: "", owner_id: user?.id || "",
      due_at: "", priority: "high", status: "open",
    });
    setDismissedSuggestion(stageKey);
    setTaskOpen(true);
  };

  const saveStage = async () => {
    if (!user || !id || !contact) return;
    const from = contact.lifecycle_stage;
    const to = stageChoice;
    if (to === from) { setStageOpen(false); return; }
    // App-level rule (roadmap): inactive REQUIRES a reason.
    if (to === "inactive" && !stageReason) {
      toast.error("Choose why this contact is inactive.");
      return;
    }
    setBusy(true);
    try {
      const patch = {
        lifecycle_stage: to,
        inactive_reason: to === "inactive" ? stageReason : null,
      };
      const res = await fetch(`${supabaseUrl}/rest/v1/geneva_contacts?id=eq.${id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      const ctx: Record<string, unknown> = { from, to };
      if (to === "inactive") ctx.reason = stageReason;
      await writeGenevaActivity(id, user.id, "stage_changed", ctx);
      toast.success("Stage updated");
      setStageOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not update the stage.");
    } finally { setBusy(false); }
  };

  /* --------------------------------------------------------------- UI */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <p className="font-sans text-sm text-[#57534E]">Loading contact…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!contact) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl py-24 text-center">
          <h1 className="font-serif text-2xl font-semibold text-[#1C1917]">Contact not found</h1>
          <p className="mt-2 font-sans text-sm text-[#57534E]">This contact doesn't exist or was removed.</p>
          <button onClick={() => navigate("/geneva/contacts")} className={`${primaryBtn} mt-6`}>
            <ArrowLeft size={15} /> Back to Contacts
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const name = `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ""}`;
  const lastActivity = activities[0]?.created_at || null;

  /* --------------------- Interview Funnel derivations (outreach only) */
  const isOutreach = contact.contact_type === "interview_outreach";
  const interviewStage = contact.interview_stage || "to_contact";
  const interviewStepIdx = INTERVIEW_STEP_ORDER.indexOf(interviewStage);
  const interviewDays = (() => {
    if (!contact.interview_stage_entered_at) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(contact.interview_stage_entered_at).getTime()) / 86400000));
  })();
  const interviewLabel = ALL_INTERVIEW_STAGE_LABELS[interviewStage] || interviewStage;
  const taskSuggestion =
    isOutreach && INTERVIEW_TASK_SUGGESTIONS[interviewStage] && dismissedSuggestion !== interviewStage
      ? { ...INTERVIEW_TASK_SUGGESTIONS[interviewStage], stageKey: interviewStage }
      : null;

  const timelineDetail = (a: GenevaActivity): string => {
    const ctx = a.event_context || {};
    switch (a.event_type) {
      case "contact_created":
        return [
          ctx.professional_type ? PROFESSIONAL_TYPE_LABELS[ctx.professional_type as string] : null,
          ctx.original_source ? `via ${SOURCE_LABELS[ctx.original_source as string] || ctx.original_source}` : null,
        ].filter(Boolean).join(" · ");
      case "stage_changed":
        return `From ${GENEVA_STAGE_LABELS[ctx.from as string] || ctx.from || "—"} to ${
          GENEVA_STAGE_LABELS[ctx.to as string] || ctx.to || "—"
        }${ctx.reason ? ` · ${INACTIVE_REASON_LABELS[ctx.reason as string] || ctx.reason}` : ""}`;
      case "consent_changed":
        return `${CONSENT_LABELS[ctx.from as string] || ctx.from || "—"} → ${
          CONSENT_LABELS[ctx.to as string] || ctx.to || "—"
        }${ctx.evidence ? ` · “${ctx.evidence as string}”` : ""}`;
      case "interview_stage_changed":
        return `${ALL_INTERVIEW_STAGE_LABELS[ctx.from as string] || ctx.from || "Start"} → ${
          ALL_INTERVIEW_STAGE_LABELS[ctx.to as string] || ctx.to || "—"
        }`;
      default:
        return (
          (ctx.title as string) ||
          (ctx.excerpt as string) ||
          (ctx.owner ? `For ${ctx.owner as string}` : "") ||
          ""
        );
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: UserRound },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "tasks", label: "Tasks", icon: ClipboardList },
    { key: "timeline", label: "Timeline", icon: History },
  ];

  const taskRow = (t: GenevaTask) => {
    const overdue = isOverdue(t);
    return (
      <li key={t.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-sans text-[0.9375rem] font-semibold ${t.status === "open" ? "text-[#1C1917]" : "text-[#57534E] line-through decoration-[#B76E79]/40"}`}>
              {t.title}
            </p>
            {t.priority !== "medium" && (
              <span className="rounded-full border border-[#B76E79]/30 bg-[#B76E79]/[0.08] px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#8F4E58]">
                {t.priority}
              </span>
            )}
            {overdue && (
              <span
                data-overdue={t.title}
                className="inline-flex items-center gap-1 rounded-full border border-[#D8C3B8]/70 bg-[#D8C3B8]/[0.25] px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#8F4E58]"
              >
                <Hourglass size={9} strokeWidth={2.25} /> Overdue
              </span>
            )}
          </div>
          {t.description && <p className="mt-0.5 font-sans text-sm text-[#57534E]">{t.description}</p>}
          <p className="mt-0.5 font-sans text-xs tabular-nums text-[#57534E]">
            {t.status === "open"
              ? t.due_at ? `Due ${formatDateTime(t.due_at)}` : "No due date"
              : `Completed ${formatDateTime(t.completed_at)}`}
            {` · ${adminName(t.owner_id)}`}
          </p>
        </div>
        {t.status === "open" && (
          <div className="flex shrink-0 gap-2">
            <button
              data-task-complete={t.title}
              onClick={() => completeTask(t)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D6350] px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors hover:bg-[#173A31] disabled:opacity-60"
            >
              <Check size={13} /> Complete
            </button>
            <button
              data-task-reschedule={t.title}
              onClick={() => { setRescheduleTask(t); setRescheduleDate(""); }}
              className={quietBtn}
            >
              <CalendarClock size={13} /> Reschedule
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/geneva/contacts")}
          className="mb-6 inline-flex items-center gap-2 font-sans text-sm font-medium text-[#2D6350] transition-colors hover:text-[#173A31]"
        >
          <ArrowLeft size={15} /> Back to Contacts
        </button>

        {/* ------------------------------------------- Top summary panel */}
        <div className={`${panelClass} p-6 lg:p-8`} style={panelStyle}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#8F4E58]">
                Internal · Geneva
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1C1917] lg:text-4xl">{name}</h1>
              <p className="mt-1 font-sans text-sm text-[#57534E]">
                {[contact.company, contact.region_city].filter(Boolean).join(" · ") || "No company recorded"}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <TypeBadge type={contact.professional_type} />
                {contact.contact_type === "interview_outreach" && (
                  <span
                    data-outreach-chip
                    title="We reached out to this contact — never emailed without recorded consent"
                    className="inline-flex items-center rounded-full border border-[#D8C3B8]/80 bg-[#D8C3B8]/[0.28] px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-wider text-[#8F4E58]"
                  >
                    Outreach
                  </span>
                )}
                {/* Outreach contacts lead with the INTERVIEW pipeline; the
                    lifecycle badge is waitlist-only. */}
                {isOutreach ? (
                  <button
                    id="interview-stage-badge"
                    onClick={openInterviewDialog}
                    aria-label={`Change interview stage (currently ${interviewLabel})`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#B76E79]/30 bg-[#B76E79]/[0.09] px-2.5 py-1 font-sans text-xs font-medium text-[#8F4E58] transition-colors hover:border-[#B76E79]/55 hover:bg-[#B76E79]/[0.16]"
                  >
                    {interviewStepIdx >= 0 && (
                      <span className="tabular-nums opacity-70">{String(interviewStepIdx + 1).padStart(2, "0")}</span>
                    )}
                    {interviewLabel}
                    <ChevronDown size={12} strokeWidth={2.25} className="opacity-70" />
                  </button>
                ) : (
                  <StageBadge stage={contact.lifecycle_stage} onChange={openStageDialog} />
                )}
                {isOutreach && interviewDays !== null && (
                  <span data-interview-days className="font-sans text-xs tabular-nums text-[#57534E]">
                    in {interviewLabel} · {interviewDays} day{interviewDays === 1 ? "" : "s"}
                  </span>
                )}
                <ConsentDot status={contact.email_consent_status} />
                {contact.mailchimp_status === "synced" && contact.mailchimp_synced_at && (
                  <span
                    data-mailchimp-status
                    className="inline-flex items-center gap-1.5 font-sans text-xs text-[#57534E]"
                  >
                    <Send size={10} strokeWidth={2} className="text-[#2D6350]" />
                    In Mailchimp · <span className="tabular-nums">{formatDate(contact.mailchimp_synced_at)}</span>
                  </span>
                )}
              </div>

              {/* Gentle advisory next-task suggestion (Interview Funnel) —
                  one at a time, dismissible, NEVER automatic */}
              {taskSuggestion && (
                <div
                  data-task-suggestion={taskSuggestion.stageKey}
                  className="mt-3 flex flex-col gap-3 rounded-xl border border-[#D8C3B8]/70 bg-[#D8C3B8]/[0.22] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-sans text-xs leading-relaxed text-[#57534E]">
                    {taskSuggestion.prompt}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      id="suggestion_add_task"
                      onClick={() => acceptTaskSuggestion(taskSuggestion.taskTitle, taskSuggestion.stageKey)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D6350] px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors hover:bg-[#173A31]"
                    >
                      <Plus size={12} strokeWidth={2.5} /> Add task
                    </button>
                    <button
                      id="suggestion_dismiss"
                      onClick={() => setDismissedSuggestion(taskSuggestion.stageKey)}
                      className="rounded-lg px-2.5 py-1.5 font-sans text-xs font-semibold text-[#57534E] transition-colors hover:bg-[#1C1917]/[0.05] hover:text-[#1C1917]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Kept-on-list exit: the consent wall still applies */}
              {isOutreach && contact.interview_stage === "declined_kept_on_list" && (
                <p data-kept-on-list-note className="mt-3 font-sans text-xs leading-relaxed text-[#8F4E58]">
                  They're happy to stay on the list — remember consent must still be
                  recorded before any Mailchimp push.
                </p>
              )}

              {/* Launch regions (waitlist capture) — where they work */}
              {contact.launch_regions && contact.launch_regions.length > 0 && (
                <div data-launch-regions className="mt-3 flex flex-wrap items-center gap-1.5">
                  <MapPin size={11} strokeWidth={2} className="shrink-0 text-[#8F4E58]" />
                  {contact.launch_regions.map((token) => (
                    <span
                      key={token}
                      className="rounded-full border border-[#2D6350]/20 bg-[#2D6350]/[0.05] px-2.5 py-0.5 font-sans text-xs font-medium text-[#2D6350]"
                    >
                      {LAUNCH_REGION_LABELS[token] || token}
                    </span>
                  ))}
                </div>
              )}

              {/* Contact methods */}
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#1C1917]/12 bg-white/80 px-3 py-1 font-sans text-xs font-medium text-[#1C1917] transition-colors hover:border-[#2D6350]/35 hover:text-[#2D6350]"
                >
                  <Mail size={11} strokeWidth={2} className="text-[#8F4E58]" /> {contact.email}
                </a>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1C1917]/12 bg-white/80 px-3 py-1 font-sans text-xs font-medium text-[#1C1917] transition-colors hover:border-[#2D6350]/35 hover:text-[#2D6350]"
                  >
                    <Phone size={11} strokeWidth={2} className="text-[#8F4E58]" /> {contact.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Meta card */}
            <div className="shrink-0 rounded-2xl border border-[#1C1917]/[0.08] bg-white/70 p-4 lg:w-64">
              <p className="font-sans text-xs uppercase tracking-[0.18em] text-[#57534E]">Owner</p>
              <p className="mt-1 font-sans text-sm font-semibold text-[#1C1917]">{adminName(contact.owner_id)}</p>
              <p className="mt-3 font-sans text-xs uppercase tracking-[0.18em] text-[#57534E]">Source</p>
              <p className="font-sans text-sm text-[#1C1917]">
                {contact.original_source ? SOURCE_LABELS[contact.original_source] || contact.original_source : "Not recorded"}
              </p>
              {contact.source_detail && (
                <p className="font-sans text-xs text-[#57534E]">{contact.source_detail}</p>
              )}
              <p className="mt-3 font-sans text-xs uppercase tracking-[0.18em] text-[#57534E]">Added · Last Activity</p>
              <p className="font-sans text-xs tabular-nums text-[#1C1917]">
                {formatDate(contact.created_at)} · {formatDate(lastActivity)}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#1C1917]/[0.06] pt-5">
            <button id="qa-add-note" onClick={() => { setEditingNote(null); setNoteBody(""); setNoteOpen(true); }} className={subtleBtn}>
              <StickyNote size={13} /> Add Note
            </button>
            <button id="qa-add-task" onClick={openTaskDialog} className={subtleBtn}>
              <Plus size={13} /> Add Task
            </button>
            <button
              id="qa-edit-contact"
              onClick={() => navigate(`/geneva/contacts/${contact.id}/edit`)}
              className={quietBtn}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              id="qa-push-mailchimp"
              onClick={handleMailchimpPush}
              disabled={busy || contact.email_consent_status !== "subscribed"}
              title={
                contact.email_consent_status === "subscribed"
                  ? "Add this contact to the Mailchimp audience"
                  : "Only subscribed contacts are ever pushed to Mailchimp"
              }
              className={`${subtleBtn} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Send size={13} /> Push to Mailchimp
            </button>
          </div>
          {contact.email_consent_status !== "subscribed" && (
            <p data-mailchimp-note className="mt-2 font-sans text-xs text-[#57534E]">
              Mailchimp push is available once this contact's email consent is{" "}
              <span className="font-medium text-[#1C1917]">Subscribed</span> — only
              opted-in contacts are ever pushed.
            </p>
          )}
        </div>

        {/* --------------------------------------------------- Tab bar */}
        <div className="mt-8 flex flex-wrap items-center gap-1 border-b border-[#1C1917]/[0.08]">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`gtab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? "border-b-2 border-[#B76E79] px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917]"
                  : "border-b-2 border-transparent px-4 py-2.5 font-sans text-sm font-medium text-[#57534E] transition-colors hover:text-[#1C1917]"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------ Tab content */}
        <div className="mt-6 pb-16">
          {tab === "overview" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={`${panelClass} p-6`} style={panelStyle}>
                <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Contact Summary</h2>
                <dl className="space-y-3">
                  {[
                    isOutreach
                      ? ["Interview stage", `${interviewLabel}${interviewDays !== null ? ` · ${interviewDays} day${interviewDays === 1 ? "" : "s"} in stage` : ""}`]
                      : ["Lifecycle stage", GENEVA_STAGE_LABELS[contact.lifecycle_stage] +
                        (contact.lifecycle_stage === "inactive" && contact.inactive_reason
                          ? ` · ${INACTIVE_REASON_LABELS[contact.inactive_reason] || contact.inactive_reason}`
                          : "")],
                    ["Professional type", PROFESSIONAL_TYPE_LABELS[contact.professional_type] || contact.professional_type],
                    ["Owner", adminName(contact.owner_id)],
                    ["Source", contact.original_source
                      ? `${SOURCE_LABELS[contact.original_source] || contact.original_source}${contact.source_detail ? ` — ${contact.source_detail}` : ""}`
                      : "Not recorded"],
                    ["Email consent", CONSENT_LABELS[contact.email_consent_status]],
                    ["Open tasks", `${openTasks.length}`],
                    ["Added", formatDate(contact.created_at)],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex items-baseline justify-between gap-4">
                      <dt className="font-sans text-xs uppercase tracking-[0.14em] text-[#57534E]">{k}</dt>
                      <dd className="text-right font-sans text-sm tabular-nums text-[#1C1917]">{v}</dd>
                    </div>
                  ))}
                </dl>
                {contact.notes && (
                  <div className="mt-5 border-t border-[#1C1917]/[0.06] pt-4">
                    <p className="font-sans text-xs uppercase tracking-[0.14em] text-[#57534E]">Profile note</p>
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-[#1C1917]">{contact.notes}</p>
                  </div>
                )}
              </div>

              <div className={`${panelClass} p-6`} style={panelStyle}>
                <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Recent Activity</h2>
                {activities.slice(0, 3).map((a) => (
                  <div key={a.id} className="border-l-2 border-[#D8C3B8] py-1.5 pl-4">
                    <p className="font-sans text-sm text-[#1C1917]">{EVENT_LABELS[a.event_type] || a.event_type}</p>
                    <p className="font-sans text-xs tabular-nums text-[#57534E]">{formatDateTime(a.created_at)}</p>
                  </div>
                ))}
                {activities.length === 0 && <p className="font-sans text-sm text-[#57534E]">No activity yet.</p>}
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                  Notes <span className="tabular-nums">({notes.length})</span>
                </h2>
                <button id="add_note_btn" onClick={() => { setEditingNote(null); setNoteBody(""); setNoteOpen(true); }} className={subtleBtn}>
                  <Plus size={13} /> Add Note
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="font-sans text-sm text-[#57534E]">
                  Nothing here yet — capture the conversation while it's fresh.
                </p>
              ) : (
                <ul className="divide-y divide-[#1C1917]/[0.06]">
                  {notes.map((n) => (
                    <li key={n.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1C1917]">{n.body}</p>
                        <p className="mt-1.5 font-sans text-xs tabular-nums text-[#57534E]">
                          {adminName(n.created_by)} · {formatDateTime(n.created_at)}
                          {n.updated_at !== n.created_at ? " · edited" : ""}
                        </p>
                      </div>
                      {n.created_by === user?.id && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            data-note-edit={n.body.slice(0, 30)}
                            onClick={() => { setEditingNote(n); setNoteBody(n.body); setNoteOpen(true); }}
                            aria-label="Edit note"
                            className={quietBtn}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            data-note-delete={n.body.slice(0, 30)}
                            onClick={() => setDeleteNoteFor(n)}
                            aria-label="Delete note"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C1917]/12 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#57534E] transition-colors hover:border-[#8F4E58]/40 hover:text-[#8F4E58]"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "tasks" && (
            <div className="space-y-6">
              <div className={`${panelClass} p-6`} style={panelStyle}>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                    Open Tasks <span className="tabular-nums">({openTasks.length})</span>
                  </h2>
                  <button id="add_task_btn" onClick={openTaskDialog} className={subtleBtn}>
                    <Plus size={13} /> Add Task
                  </button>
                </div>
                {openTasks.length === 0 ? (
                  <p className="font-sans text-sm text-[#57534E]">
                    Nothing open — add a follow-up so this contact never goes quiet.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#1C1917]/[0.06]">{openTasks.map(taskRow)}</ul>
                )}
              </div>

              {doneTasks.length > 0 && (
                <div className={`${panelClass} p-6`} style={panelStyle}>
                  <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                    Completed <span className="tabular-nums">({doneTasks.length})</span>
                  </h2>
                  <ul className="divide-y divide-[#1C1917]/[0.06]">{doneTasks.map(taskRow)}</ul>
                </div>
              )}
            </div>
          )}

          {tab === "timeline" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Timeline</h2>
              {activities.length === 0 ? (
                <p className="font-sans text-sm text-[#57534E]">No activity yet.</p>
              ) : (
                <ol className="relative space-y-0 border-l-2 border-[#D8C3B8] pl-6">
                  {activities.map((a) => {
                    const detail = timelineDetail(a);
                    return (
                      <li key={a.id} className="relative pb-6">
                        <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#B76E79] bg-[#F6F1EA]" />
                        <p className="font-sans text-sm font-semibold text-[#1C1917]">
                          {EVENT_LABELS[a.event_type] || a.event_type}
                        </p>
                        {detail && <p className="font-sans text-sm text-[#57534E]">{detail}</p>}
                        <p className="mt-0.5 font-sans text-xs tabular-nums text-[#57534E]">
                          {a.actor_user_id ? adminName(a.actor_user_id) : "Landing page"} · {formatDateTime(a.created_at)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- Dialogs */}

      <Modal
        title={editingNote ? "Edit Note" : "Add Note"}
        open={noteOpen}
        onClose={() => { setNoteOpen(false); setEditingNote(null); }}
      >
        <label htmlFor="gnote_body" className={labelClass}>Note</label>
        <textarea
          id="gnote_body"
          rows={5}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="e.g. Called — very warm, wants to see pricing before the trial cohort."
          className={inputClass}
        />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => { setNoteOpen(false); setEditingNote(null); }} className={cancelBtn}>Cancel</button>
          <button id="gnote_save" onClick={saveNote} disabled={busy} className={primaryBtn}>
            {editingNote ? "Save Changes" : "Save Note"}
          </button>
        </div>
      </Modal>

      <Modal title="Delete Note" open={!!deleteNoteFor} onClose={() => setDeleteNoteFor(null)}>
        <p className="font-sans text-sm text-[#57534E]">
          Delete this note? It will be removed for the whole team — the rest of the
          timeline is untouched.
        </p>
        <p className="mt-3 rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-3 font-sans text-sm italic text-[#57534E]">
          "{deleteNoteFor?.body.slice(0, 140)}{(deleteNoteFor?.body.length || 0) > 140 ? "…" : ""}"
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteNoteFor(null)} className={cancelBtn}>Cancel</button>
          <button id="gnote_delete_confirm" onClick={deleteNote} disabled={busy} className={primaryBtn}>
            Delete Note
          </button>
        </div>
      </Modal>

      <Modal title="Add Task" open={taskOpen} onClose={() => setTaskOpen(false)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="gtask_title" className={labelClass}>Title *</label>
            <input id="gtask_title" type="text" value={taskDraft.title}
              onChange={(e) => setTaskDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. Send early-access invite" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="gtask_description" className={labelClass}>Description</label>
            <textarea id="gtask_description" rows={2} value={taskDraft.description}
              onChange={(e) => setTaskDraft((d) => ({ ...d, description: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label htmlFor="gtask_owner" className={labelClass}>Owner</label>
            <select id="gtask_owner" value={taskDraft.owner_id}
              onChange={(e) => setTaskDraft((d) => ({ ...d, owner_id: e.target.value }))} className={inputClass}>
              <option value="">Unassigned</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}{a.id === user?.id ? " (you)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gtask_due" className={labelClass}>Due</label>
            <input id="gtask_due" type="datetime-local" value={taskDraft.due_at}
              onChange={(e) => setTaskDraft((d) => ({ ...d, due_at: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="gtask_priority" className={labelClass}>Priority</label>
            <select id="gtask_priority" value={taskDraft.priority}
              onChange={(e) => setTaskDraft((d) => ({ ...d, priority: e.target.value }))} className={inputClass}>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gtask_status" className={labelClass}>Status</label>
            <select id="gtask_status" value={taskDraft.status}
              onChange={(e) => setTaskDraft((d) => ({ ...d, status: e.target.value }))} className={inputClass}>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setTaskOpen(false)} className={cancelBtn}>Cancel</button>
          <button id="gtask_save" onClick={saveTask} disabled={busy} className={primaryBtn}>Create Task</button>
        </div>
      </Modal>

      <Modal title="Reschedule Task" open={!!rescheduleTask} onClose={() => setRescheduleTask(null)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          New due date for <span className="font-semibold text-[#1C1917]">{rescheduleTask?.title}</span>:
        </p>
        <label htmlFor="greschedule_date" className={labelClass}>Due</label>
        <input id="greschedule_date" type="datetime-local" value={rescheduleDate}
          onChange={(e) => setRescheduleDate(e.target.value)} className={inputClass} />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setRescheduleTask(null)} className={cancelBtn}>Cancel</button>
          <button id="greschedule_save" onClick={applyReschedule} disabled={busy} className={primaryBtn}>Reschedule</button>
        </div>
      </Modal>

      <Modal title="Interview Journey" open={interviewOpen} onClose={() => setInterviewOpen(false)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          Where is <span className="font-semibold text-[#1C1917]">{name}</span> on the
          interview journey?
        </p>
        <div className="space-y-2">
          {INTERVIEW_STEP_ORDER.map((token, i) => {
            const isCurrent = token === (contact.interview_stage || "to_contact");
            const isSelected = token === interviewChoice;
            return (
              <button
                key={token}
                id={`istage-opt-${token}`}
                onClick={() => setInterviewChoice(token)}
                className={
                  isSelected
                    ? "flex w-full items-center justify-between rounded-xl border border-[#2D6350]/50 bg-[#2D6350]/[0.07] px-4 py-2.5 text-left font-sans text-sm font-semibold text-[#173A31]"
                    : "flex w-full items-center justify-between rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-2.5 text-left font-sans text-sm font-medium text-[#1C1917] transition-colors hover:border-[#2D6350]/30 hover:bg-[#2D6350]/[0.04]"
                }
              >
                <span className="flex items-center gap-2.5">
                  <span className="font-sans text-xs font-semibold tabular-nums text-[#8F4E58]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {INTERVIEW_STAGE_LABELS[token]}
                  {isCurrent && (
                    <span className="rounded-full bg-[#D8C3B8]/50 px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                      Current
                    </span>
                  )}
                </span>
                {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#2D6350]" />}
              </button>
            );
          })}
        </div>
        <p className="mb-2 mt-5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#57534E]">
          If they said no
        </p>
        <div className="space-y-2">
          {Object.entries(INTERVIEW_EXIT_LABELS).map(([token, label]) => {
            const isCurrent = token === contact.interview_stage;
            const isSelected = token === interviewChoice;
            return (
              <button
                key={token}
                id={`istage-opt-${token}`}
                onClick={() => setInterviewChoice(token)}
                className={
                  isSelected
                    ? "flex w-full items-center justify-between rounded-xl border border-[#8F4E58]/50 bg-[#B76E79]/[0.08] px-4 py-2.5 text-left font-sans text-sm font-semibold text-[#8F4E58]"
                    : "flex w-full items-center justify-between rounded-xl border border-[#1C1917]/10 bg-white/60 px-4 py-2.5 text-left font-sans text-sm font-medium text-[#57534E] transition-colors hover:border-[#8F4E58]/35 hover:bg-[#B76E79]/[0.05]"
                }
              >
                <span className="flex items-center gap-2">
                  {label}
                  {isCurrent && (
                    <span className="rounded-full bg-[#D8C3B8]/50 px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                      Current
                    </span>
                  )}
                </span>
                {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#8F4E58]" />}
              </button>
            );
          })}
        </div>
        {interviewChoice === "declined_kept_on_list" && (
          <p className="mt-3 font-sans text-xs leading-relaxed text-[#8F4E58]">
            Staying on the list still needs recorded consent before any Mailchimp push
            — capture it via Edit → consent when they confirm.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setInterviewOpen(false)} className={cancelBtn}>Cancel</button>
          <button
            id="istage_save"
            onClick={saveInterviewStage}
            disabled={busy || interviewChoice === (contact.interview_stage || "to_contact")}
            className={primaryBtn}
          >
            Update Stage
          </button>
        </div>
      </Modal>

      <Modal title="Change Lifecycle Stage" open={stageOpen} onClose={() => setStageOpen(false)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          Where does this contact sit on the journey to becoming a customer?
        </p>
        <div className="space-y-2">
          {Object.entries(GENEVA_STAGE_LABELS).map(([token, label]) => {
            const isCurrent = token === contact.lifecycle_stage;
            const isSelected = token === stageChoice;
            return (
              <button
                key={token}
                id={`gstage-opt-${token}`}
                onClick={() => setStageChoice(token)}
                className={
                  isSelected
                    ? "flex w-full items-center justify-between rounded-xl border border-[#2D6350]/50 bg-[#2D6350]/[0.07] px-4 py-2.5 text-left font-sans text-sm font-semibold text-[#173A31]"
                    : "flex w-full items-center justify-between rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-2.5 text-left font-sans text-sm font-medium text-[#1C1917] transition-colors hover:border-[#2D6350]/30 hover:bg-[#2D6350]/[0.04]"
                }
              >
                <span className="flex items-center gap-2">
                  {label}
                  {isCurrent && (
                    <span className="rounded-full bg-[#D8C3B8]/50 px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                      Current
                    </span>
                  )}
                </span>
                {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#2D6350]" />}
              </button>
            );
          })}
        </div>

        {/* Inactive requires a reason — app-level rule from the roadmap */}
        {stageChoice === "inactive" && (
          <div className="mt-4 rounded-xl border border-[#D8C3B8]/70 bg-[#D8C3B8]/[0.18] p-4">
            <label htmlFor="gstage_reason" className={labelClass}>Why inactive? *</label>
            <select
              id="gstage_reason"
              value={stageReason}
              onChange={(e) => setStageReason(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a reason…</option>
              {Object.entries(INACTIVE_REASON_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <p className="mt-1.5 font-sans text-xs text-[#8F4E58]">
              A reason keeps the book honest — and tells you where leads are lost.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setStageOpen(false)} className={cancelBtn}>Cancel</button>
          <button
            id="gstage_save"
            onClick={saveStage}
            disabled={busy || stageChoice === contact.lifecycle_stage || (stageChoice === "inactive" && !stageReason)}
            className={primaryBtn}
          >
            Update Stage
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
