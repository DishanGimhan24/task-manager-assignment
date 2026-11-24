'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  Check,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskFormDialog } from '@/components/task-form-dialog';
import { createTask, deleteTask, getTasks, updateTask } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CreateTaskPayload, Task, TaskStatus } from '@/types/task';

type Filter = 'ALL' | TaskStatus;

// Same labels and colors as the task form, so a status looks the same everywhere.
const STATUS_META: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  TODO: {
    label: 'To do',
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  IN_PROGRESS: {
    label: 'In progress',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  DONE: {
    label: 'Done',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

// Parse the date part as a local day. new Date('2026-11-27') is read as UTC
// and can display as the previous day in some time zones.
function parseDay(value: string): Date {
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysFromToday(value: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDay(value).getTime() - today.getTime()) / 86_400_000);
}

function formatDue(value: string): string {
  const diff = daysFromToday(value);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const date = parseDay(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

function isOverdue(task: Task): boolean {
  return Boolean(task.dueDate) && task.status !== 'DONE' && daysFromToday(task.dueDate!) < 0;
}

function toPayload(task: Task, status: TaskStatus): CreateTaskPayload {
  return {
    title: task.title,
    description: task.description || undefined,
    status,
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : undefined,
  };
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.TODO;
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 whitespace-nowrap font-medium', meta.badge)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string | number>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t load your tasks.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleSave(payload: CreateTaskPayload) {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Task updated');
    } else {
      const created = await createTask(payload);
      setTasks((prev) => [created, ...prev]);
      toast.success('Task created');
    }
  }

  // One-click done / not done from the list. Updates instantly, rolls back on failure.
  async function handleToggleDone(task: Task) {
    const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    setTogglingIds((prev) => new Set(prev).add(task.id));
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      const updated = await updateTask(task.id, toPayload(task, nextStatus));
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(err instanceof Error ? err.message : 'We couldn’t update this task.');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTask) return;
    setDeleting(true);
    try {
      await deleteTask(deletingTask.id);
      setTasks((prev) => prev.filter((t) => t.id !== deletingTask.id));
      toast.success('Task deleted');
      setDeletingTask(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'We couldn’t delete this task.');
    } finally {
      setDeleting(false);
    }
  }

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { ALL: tasks.length, TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const t of tasks) result[t.status] = (result[t.status] ?? 0) + 1;
    return result;
  }, [tasks]);

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);
  const openCount = counts.TODO + counts.IN_PROGRESS;

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter !== 'ALL' && t.status !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [tasks, filter, query]);

  const hasActiveFilters = filter !== 'ALL' || query.trim() !== '';

  let summary = 'Track what needs doing, and by when.';
  if (!loading && tasks.length > 0) {
    if (openCount === 0) {
      summary = 'Everything is done. Nice work.';
    } else {
      summary = `${openCount} ${openCount === 1 ? 'task' : 'tasks'} left`;
      if (overdueCount > 0) summary += `, ${overdueCount} overdue`;
      summary += '.';
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          New task
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <Button variant="outline" size="sm" onClick={loadTasks}>
            Try again
          </Button>
        </div>
      )}

      {/* Filters */}
      {!loading && tasks.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const selected = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected
                      ? 'border-foreground bg-accent font-medium text-foreground'
                      : 'border-input text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {f.label}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {counts[f.value]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              aria-label="Search tasks"
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="divide-y rounded-lg border" aria-busy="true" aria-label="Loading tasks">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : visibleTasks.length === 0 ? (
        !(error && tasks.length === 0) && (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-14 text-center">
            <div className="mb-4 rounded-full bg-muted p-3">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            {hasActiveFilters ? (
              <>
                <h2 className="font-medium">No matching tasks</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try a different search or status filter.
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setFilter('ALL');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <h2 className="font-medium">No tasks yet</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Create your first task to start tracking what needs doing.
                </p>
                <Button className="mt-5" onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  New task
                </Button>
              </>
            )}
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Done</span>
                </TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTasks.map((task) => {
                const done = task.status === 'DONE';
                const overdue = isOverdue(task);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="w-10 pr-0">
                      <button
                        type="button"
                        aria-pressed={done}
                        aria-label={`Mark “${task.title}” as done`}
                        disabled={togglingIds.has(task.id)}
                        onClick={() => handleToggleDone(task)}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <p
                        className={cn(
                          'truncate font-medium',
                          done && 'text-muted-foreground line-through'
                        )}
                        title={task.title}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={task.description}
                        >
                          {task.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {task.dueDate ? (
                        <span
                          className={cn(
                            'text-sm',
                            overdue ? 'font-medium text-red-600' : 'text-muted-foreground'
                          )}
                        >
                          {formatDue(task.dueDate)}
                          {overdue && <span className="sr-only"> (overdue)</span>}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No date</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit “${task.title}”`}
                          title="Edit"
                          onClick={() => openEdit(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete “${task.title}”`}
                          title="Delete"
                          className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeletingTask(task)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialTask={editingTask}
        onSubmit={handleSave}
      />

      <AlertDialog
        open={Boolean(deletingTask)}
        onOpenChange={(open) => !open && !deleting && setDeletingTask(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletingTask?.title}” will be permanently deleted. You can’t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
              onClick={(e) => {
                // Keep the dialog open until the request finishes.
                e.preventDefault();
                handleConfirmDelete();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}