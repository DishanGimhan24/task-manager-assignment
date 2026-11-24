'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CreateTaskPayload, Task, TaskStatus } from '@/types/task';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTask?: Task | null;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
}

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 500;

const STATUS_OPTIONS: { value: TaskStatus; label: string; dot: string }[] = [
  { value: 'TODO', label: 'To do', dot: 'bg-slate-400' },
  { value: 'IN_PROGRESS', label: 'In progress', dot: 'bg-amber-500' },
  { value: 'DONE', label: 'Done', dot: 'bg-emerald-500' },
];

// Format as YYYY-MM-DD in the user's local time zone.
// (toISOString() uses UTC and can show the wrong day late at night.)
function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

function describeDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function TaskFormDialog({
  open,
  onOpenChange,
  initialTask,
  onSubmit,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setStatus(initialTask.status);
      setDueDate(initialTask.dueDate ? initialTask.dueDate.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setDueDate('');
    }
    setTitleError(null);
    setFormError(null);
  }, [initialTask, open]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      setTitleError('Give your task a title');
      titleRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        dueDate: dueDate || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'We couldn’t save this task. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Ctrl/Cmd + Enter saves from anywhere in the form (handy inside the textarea).
  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  const isEditing = Boolean(initialTask);
  const [todayStr, setTodayStr] = useState('');

  const [shortcuts, setShortcuts] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    setTodayStr(fromToday(0));
    setShortcuts([
      { label: 'Today', value: fromToday(0) },
      { label: 'Tomorrow', value: fromToday(1) },
      { label: 'Next week', value: fromToday(7) },
    ]);
  }, []);

  const isOverdue = Boolean(dueDate) && status !== 'DONE' && Boolean(todayStr) && dueDate < todayStr;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl">
            {isEditing ? 'Edit task' : 'New task'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details below, then save your changes.'
              : 'Add what needs doing. Only the title is required.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleFormSubmit}
          onKeyDown={handleKeyDown}
          noValidate
          className="space-y-5"
        >
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="title">Title</Label>
              <span
                className={cn(
                  'text-xs tabular-nums text-muted-foreground',
                  title.length >= TITLE_MAX && 'text-red-600'
                )}
              >
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <Input
              id="title"
              ref={titleRef}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="e.g. Send the project proposal"
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? 'title-error' : undefined}
              className={cn(
                titleError && 'border-red-500 focus-visible:ring-red-500'
              )}
            />
            {titleError && (
              <p id="title-error" className="text-sm text-red-600">
                {titleError}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="description">
                Description{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              {description.length > DESCRIPTION_MAX * 0.8 && (
                <span
                  className={cn(
                    'text-xs tabular-nums text-muted-foreground',
                    description.length >= DESCRIPTION_MAX && 'text-red-600'
                  )}
                >
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              )}
            </div>
            <Textarea
              id="description"
              value={description}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes, links, or anything you’ll need later"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label id="status-label">Status</Label>
            <div
              role="radiogroup"
              aria-labelledby="status-label"
              className="grid grid-cols-3 gap-2"
            >
              {STATUS_OPTIONS.map((option) => {
                const selected = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'border-foreground bg-accent font-medium text-foreground'
                        : 'border-input text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', option.dot)} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">
              Due date{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {shortcuts.map((shortcut) => (
                <Button
                  key={shortcut.label}
                  type="button"
                  size="sm"
                  variant={dueDate === shortcut.value ? 'secondary' : 'outline'}
                  onClick={() => setDueDate(shortcut.value)}
                  className="h-8"
                >
                  {shortcut.label}
                </Button>
              ))}
              {dueDate && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDueDate('')}
                  className="h-8 text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {dueDate && (
              <p
                className={cn(
                  'flex items-center gap-1.5 text-sm',
                  isOverdue ? 'text-red-600' : 'text-muted-foreground'
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {isOverdue ? 'Overdue since' : 'Due'} {describeDate(dueDate)}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Create task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}