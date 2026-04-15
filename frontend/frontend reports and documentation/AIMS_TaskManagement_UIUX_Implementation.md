# AIMS Task Management — UI/UX Redesign Implementation Guide

> Inspired by Jira, Linear, and Notion. Dark-first, data-dense, and action-oriented.

---

## Table of Contents

1. [Design Philosophy & Direction](#1-design-philosophy--direction)
2. [Current State Analysis](#2-current-state-analysis)
3. [Proposed Improvements — Intern View (InternTasks.tsx)](#3-proposed-improvements--intern-view)
4. [Proposed Improvements — Manager View (MonitoringTasks.tsx)](#4-proposed-improvements--manager-view)
5. [New Pages to Add](#5-new-pages-to-add)
6. [Component-Level Changes](#6-component-level-changes)
7. [Implementation Steps](#7-implementation-steps)
8. [Design Tokens & Theming](#8-design-tokens--theming)

---

## 1. Design Philosophy & Direction

**Target aesthetic:** Linear + Jira hybrid — ultra-clean dark UI with crisp typographic hierarchy, strong color-coded statuses, and productivity-first density. No unnecessary gradients on text, no oversized padding, no card hover lift on every element.

**Core Principles:**
- **Scannable at a glance** — statuses, priorities, and due dates must pop immediately
- **Action-forward** — the most common action (Change Status, Create Task) should be 1 click away
- **Progressive disclosure** — show summaries by default, reveal detail on demand (drawer/modal)
- **Consistent density** — compact rows in list view, breathable cards in grid view

---

## 2. Current State Analysis

### What's Working Well ✅
- Contribution heatmap — keep exactly as-is (both views)
- Stats summary cards at the top — good information architecture
- Project grouping in Intern view — logical structure
- Status badge color system — already intuitive

### Pain Points to Fix ❌

**Intern View (InternTasks.tsx)**
- Task cards are too tall — lots of wasted vertical space per task
- "Change Status" dropdown is a generic `<Button>` — should be an inline status pill that morphs
- No quick-view / detail drawer — clicking the `ChevronRight` goes... nowhere visible
- The quality rating badge (long decimal number like `3.705606...`) looks broken — needs rounding
- Search + filter bar is plain `<select>` — should be a styled filter pill row like Jira
- No visual distinction between overdue urgency levels
- Bottom completion rate bar is understyled and easy to miss

**Manager View (MonitoringTasks.tsx)**
- Grid card view has too much empty space per card
- Task cards show raw ISO timestamps instead of formatted dates
- The "EVALUATE" button is the visual focal point but evaluation might not always be needed
- No list/table view toggle (you have the icon but it needs wiring)
- Quality score shown as raw float (e.g., `+3.70560614...`) — round to 1 decimal
- "AI GENERATOR" and "+ NEW TASK" buttons compete equally — AI Generator should be secondary
- No bulk action capability (select multiple tasks → assign, delete, change status)
- No inline task status change — manager has to go to a separate evaluate modal

---

## 3. Proposed Improvements — Intern View

### 3.1 Task Card Redesign

**Current:** Full-width tall card with padded sections.

**Proposed:** Compact row-style card (like Linear issues) with a right-side action zone.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ● In Progress  [HIGH]  SEED-10-4-e327          Due Apr 2 · by Manager  │
│   Data Modeling and Migration                           [▶ In Progress ▼] │
│   Designing complex database schemas...                        ★ 3.7/5  │
└─────────────────────────────────────────────────────────────────────────┘
```

Key changes:
- Move task ID, status, priority to the **top meta line** (smaller, muted)
- Task title is the **primary visual element** (large, white)
- Description is **truncated to 1 line** (expand on hover/click)
- Status change becomes an **inline status pill button** (click → dropdown appears anchored to pill)
- Quality rating rounded to 1 decimal: `★ 3.7/5` not `3.7056061...`
- Overdue indicator becomes a **red left border accent** instead of just a badge

```tsx
// Status pill component (replace Button + dropdown)
<button
  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium 
    border transition-all cursor-pointer
    ${statusStyles[task.status]}
  `}
  onClick={onToggleDropdown}
>
  <span className="w-1.5 h-1.5 rounded-full bg-current" />
  {statusBadge.label}
  <ChevronDown size={10} />
</button>
```

### 3.2 Filter Bar Redesign

**Current:** Raw `<select>` dropdowns.

**Proposed:** Pill-style filter chips (like Jira's filter bar).

```
[🔍 Search...]  [Status: All ▼]  [Priority: All ▼]  [Due: Any ▼]  [Clear ×]
```

```tsx
// Filter pill
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] 
  bg-[var(--bg-muted)] text-sm text-[var(--text-dim)] hover:border-purple-500/50 transition-all">
  Status: {filter === 'all' ? 'All' : filter}
  <ChevronDown size={12} />
</button>
```

### 3.3 Task Detail Drawer (New Component)

When an intern clicks on a task card row, slide in a **right-side drawer** (not a new page) showing:
- Full title + description
- Status timeline (Assigned → In Progress → Submitted → Completed)
- Quality rating with star visualization
- Mentor feedback field (read-only for intern)
- Estimated vs actual hours
- Skills required tags

```tsx
// Add to InternTasks.tsx
const [selectedTask, setSelectedTask] = useState<Task | null>(null);

// Drawer overlay
{selectedTask && (
  <TaskDetailDrawer 
    task={selectedTask} 
    onClose={() => setSelectedTask(null)} 
  />
)}
```

Drawer slides in from the right with `translateX` animation. Backdrop blur on the left portion. This eliminates the need for a separate task detail page.

### 3.4 Stats Card Polish

**Current:** All 6 stat cards are equal weight.

**Proposed:** Give "Overdue" a pulsing red glow when count > 0. Give "Total Tasks" a subtle active outline (already done). Make the overdue count click-filter the task list automatically.

```tsx
// Overdue card — add pulse ring when overdue > 0
<div className={`stat-card ${statsValues.overdue > 0 ? 'ring-1 ring-red-500/50 animate-pulse-ring' : ''}`}
  onClick={() => setFilter('OVERDUE')}
  style={{ cursor: 'pointer' }}
>
```

### 3.5 Project Group Header

Add a **collapsible toggle** to project group headers. Interns with many projects can collapse completed ones.

```tsx
const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

const toggleGroup = (groupId: number) => {
  setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(groupId) ? next.delete(groupId) : next.add(groupId);
    return next;
  });
};
```

---

## 4. Proposed Improvements — Manager View

### 4.1 List View (Wire Up the Toggle)

The list/grid toggle exists in the UI but only grid works. Implement a **compact list view** (like Jira's backlog):

```
┌──────┬──────────────────────────────┬──────────┬────────────┬──────────┬────────────┐
│  ID  │  Title                       │ Priority │  Status    │ Due Date │  Rating    │
├──────┼──────────────────────────────┼──────────┼────────────┼──────────┼────────────┤
│ S-10 │ Data Modeling and Migration  │ MEDIUM   │ ● Evaluated│ Apr 2    │  ★ 3.7    │
│ S-10 │ System Architecture...       │ MEDIUM   │ ● Evaluated│ Apr 2    │  ★ 4.5    │
└──────┴──────────────────────────────┴──────────┴────────────┴──────────┴────────────┘
```

```tsx
// Add state
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

// List view renders a <table> instead of card grid
{viewMode === 'list' ? (
  <TaskListTable tasks={filteredTasks} onEvaluate={openEvaluateModal} />
) : (
  <TaskGrid tasks={filteredTasks} onEvaluate={openEvaluateModal} />
)}
```

### 4.2 Fix Raw Timestamp Display

**Current:** `2026-04-02T05:34:30.168472Z`

**Fix:** Create a shared `formatDate` util and apply everywhere.

```tsx
// utils/dateUtils.ts
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Usage in task card
<span>{formatDate(task.completed_at || task.due_date)}</span>
```

### 4.3 Quality Score Display Fix

**Current:** `+3.7056061452564526`

**Fix:** Always round to 1 decimal and strip the `+` prefix.

```tsx
const formatRating = (rating: number | null): string => {
  if (rating === null) return '—';
  return `★ ${rating.toFixed(1)}/5`;
};
```

### 4.4 Button Hierarchy Fix

**Current:** "AI GENERATOR" (purple filled) and "+ NEW TASK" (white outline) — AI Generator is visually dominant but used less.

**Proposed:** Swap the visual weights.

```tsx
// New Task = primary (filled purple)
<Button variant="primary" icon={<Plus size={16} />}>New Task</Button>

// AI Generator = secondary (outlined with sparkles accent)
<Button variant="outline" icon={<Sparkles size={16} className="text-purple-400" />}>
  AI Generator
</Button>
```

### 4.5 Bulk Task Actions

Add a checkbox to each task card (visible on hover). When ≥1 selected, show a floating action bar:

```
┌────────────────────────────────────────┐
│  3 tasks selected  [Assign] [Delete] [Change Status ▼]  [✕ Cancel] │
└────────────────────────────────────────┘
```

```tsx
const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

const toggleTaskSelection = (id: number) => {
  setSelectedTasks(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};

// Floating bar
{selectedTasks.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 
    flex items-center gap-3 px-6 py-3 
    bg-[var(--bg-muted)] border border-purple-500/50 
    rounded-2xl shadow-2xl shadow-purple-500/20 animate-slide-up">
    <span className="text-sm font-medium">{selectedTasks.size} selected</span>
    <Button size="sm" variant="danger">Delete</Button>
    <Button size="sm" variant="outline">Change Status</Button>
    <button onClick={() => setSelectedTasks(new Set())}><X size={16} /></button>
  </div>
)}
```

### 4.6 Intern Selector — Upgrade to Searchable Combobox

**Current:** Custom dropdown with intern list.

**Proposed:** A searchable combobox with avatar initials, matching Jira's assignee picker.

```tsx
<div className="relative">
  <input
    type="text"
    placeholder="Search interns..."
    value={internSearch}
    onChange={(e) => setInternSearch(e.target.value)}
    className="w-64 px-4 py-2 pl-10 rounded-xl border ..."
  />
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 ..." />
  
  {/* Dropdown */}
  <div className="absolute top-full mt-1 w-64 bg-[var(--card-bg)] border ... rounded-xl shadow-2xl">
    {filteredInterns.map(intern => (
      <button key={intern.id} onClick={() => setSelectedIntern(intern.id)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-muted)]">
        <div className="w-7 h-7 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold">
          {intern.full_name?.[0] ?? '?'}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium">{intern.full_name}</p>
          <p className="text-xs text-[var(--text-muted)]">{intern.department}</p>
        </div>
      </button>
    ))}
  </div>
</div>
```

---

## 5. New Pages to Add

### 5.1 Task Detail Page / Drawer — `/tasks/:taskId`

**For Interns:** Accessible by clicking the ChevronRight on a task card. Currently goes nowhere.

**For Managers:** Accessible from any task card's expand button.

Contents:
- **Header:** Task title, ID badge, status pill, priority badge
- **Status Timeline:** Visual step tracker (Assigned → In Progress → Submitted → Evaluated → Completed)
- **Metadata panel** (right side): Due date, estimated/actual hours, assigned by, project/module
- **Description:** Full text with markdown support
- **Skills Tags:** Chips showing required skills
- **Quality Evaluation Card** (Manager only): Rating slider, code review score, mentor feedback textarea, rework toggle
- **Activity Log** (stretch goal): Timestamped status change history

**Implementation:** Use a slide-in drawer (preferred) or dedicated route — drawer is better UX for quick context switching.

```tsx
// TaskDetailDrawer.tsx
interface Props {
  taskId: number;
  onClose: () => void;
  role: 'intern' | 'manager';
}

// Fetch task detail on mount
// Render status stepper, metadata, evaluation form (if manager)
```

### 5.2 Kanban Board View — `/tasks/board` (Manager Only)

A **Kanban board** grouped by status columns — the most requested Jira-style feature. Fits naturally on the existing manager tasks page as a third view toggle (Grid | List | **Board**).

Columns: `Assigned` | `In Progress` | `Submitted` | `Completed` | `Blocked`

Each card: Compact, shows title + intern avatar + due date + priority dot.

Drag-and-drop to change status (use `@dnd-kit/core` or `react-beautiful-dnd`).

```tsx
// Add to view mode toggle
type ViewMode = 'grid' | 'list' | 'board';

// Board renders KanbanBoard component
<KanbanBoard 
  tasks={filteredTasks}
  onStatusChange={handleStatusChange}
/>
```

**Column structure:**
```tsx
const KANBAN_COLUMNS = [
  { id: 'ASSIGNED', label: 'Assigned', color: 'blue' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'yellow' },
  { id: 'SUBMITTED', label: 'Submitted', color: 'orange' },
  { id: 'COMPLETED', label: 'Completed', color: 'green' },
  { id: 'BLOCKED', label: 'Blocked', color: 'red' },
];
```

### 5.3 AI Task Generator Improvement (Modal → Side Panel)

**Current:** The AI Generator opens a modal.

**Proposed:** Convert to a **right-side panel** (like Copilot in VS Code) that stays open while the manager reviews existing tasks. Panel contains:
- Prompt input: "Generate 3 backend tasks for a Django REST API project"
- Generated task preview cards
- One-click "Add All" or individual "Add" per task
- Skill auto-tagging from AI output

---

## 6. Component-Level Changes

### 6.1 Status Badge → Status Pill

Replace all `<Badge>` status components with a unified `<StatusPill>` that is also a button for interns.

```tsx
// components/common/StatusPill.tsx
const STATUS_STYLES: Record<string, string> = {
  ASSIGNED:    'bg-blue-500/10 text-blue-400 border-blue-500/30',
  IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  SUBMITTED:   'bg-orange-500/10 text-orange-400 border-orange-500/30',
  COMPLETED:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  BLOCKED:     'bg-red-500/10 text-red-400 border-red-500/30',
  OVERDUE:     'bg-red-600/15 text-red-300 border-red-600/40',
  EVALUATED:   'bg-purple-500/10 text-purple-400 border-purple-500/30',
};
```

### 6.2 Priority Indicator

Swap the `<Badge>` priority chip for a **colored left-border dot + label** to reduce visual noise.

```tsx
const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-400',
  MEDIUM:   'bg-yellow-400',
  LOW:      'bg-blue-400',
};

<span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
<span className="text-xs text-[var(--text-dim)]">{task.priority}</span>
```

### 6.3 Empty State

Replace the current generic empty state with context-aware messaging:

```tsx
// No tasks assigned yet
<EmptyState
  icon={<Inbox size={40} />}
  title="No tasks yet"
  description="Your manager hasn't assigned any tasks. Check back soon."
/>

// No results from filter
<EmptyState
  icon={<SearchX size={40} />}
  title="No matching tasks"
  description="Try adjusting your filters or search query."
  action={<Button onClick={clearFilters}>Clear Filters</Button>}
/>
```

---

## 7. Implementation Steps

### Phase 1 — Quick Wins (1–2 days)

1. Fix quality rating display: `rating.toFixed(1)` everywhere — both files
2. Fix raw ISO timestamp: apply `formatDate()` to all date fields in MonitoringTasks
3. Fix button hierarchy in manager view (swap primary/secondary on New Task vs AI Generator)
4. Round/clean task IDs in display (already short, just verify truncation)
5. Wire up list/grid view toggle in MonitoringTasks — add `viewMode` state and render table when `list`

### Phase 2 — UX Improvements (3–5 days)

6. Redesign intern task card — compact row layout with inline status pill
7. Redesign manager task card — fix timestamps, clean rating display, add checkbox for bulk
8. Replace `<select>` filters with pill-style filter buttons + popover dropdowns
9. Add collapsible project group headers in intern view
10. Upgrade intern selector to searchable combobox with avatars
11. Add bulk selection UI + floating action bar in manager view

### Phase 3 — New Features (1–2 weeks)

12. Build `TaskDetailDrawer` component (used in both views)
13. Wire ChevronRight in intern task cards to open drawer
14. Build `KanbanBoard` component with `@dnd-kit/core`
15. Add Board as third view mode in manager view
16. Convert AI Generator modal to persistent side panel

### Phase 4 — Polish (2–3 days)

17. Add `animate-slide-up` for floating bulk action bar
18. Add pulse ring animation to overdue stat card
19. Add skeleton loaders (replace spinner with content-shaped skeletons)
20. Audit all spacing, ensure consistent 4px grid usage

---

## 8. Design Tokens & Theming

Add these new tokens to your CSS variables (in addition to existing ones):

```css
:root {
  /* Status colors */
  --status-assigned:    #3b82f6;
  --status-in-progress: #eab308;
  --status-submitted:   #f97316;
  --status-completed:   #10b981;
  --status-blocked:     #ef4444;
  --status-evaluated:   #a855f7;

  /* Priority colors */
  --priority-critical: #ef4444;
  --priority-high:     #f97316;
  --priority-medium:   #eab308;
  --priority-low:      #3b82f6;

  /* New surface */
  --drawer-bg:         rgba(10, 12, 20, 0.97);
  --table-row-hover:   rgba(139, 92, 246, 0.05);
  --bulk-bar-bg:       rgba(20, 20, 35, 0.95);
}
```

---

## Summary of New Files to Create

| File | Purpose |
|------|---------|
| `components/tasks/TaskDetailDrawer.tsx` | Slide-in drawer for task detail (both roles) |
| `components/tasks/KanbanBoard.tsx` | Kanban view for manager |
| `components/tasks/KanbanColumn.tsx` | Individual column within Kanban |
| `components/tasks/TaskListTable.tsx` | Table/list view for manager |
| `components/tasks/StatusPill.tsx` | Unified status pill (replaces Badge for statuses) |
| `components/tasks/BulkActionBar.tsx` | Floating bar when tasks selected |
| `components/tasks/FilterBar.tsx` | Pill-style filter row (both views) |
| `components/tasks/EmptyState.tsx` | Contextual empty states |
| `utils/dateUtils.ts` | Shared date formatting helpers |
| `utils/ratingUtils.ts` | Rating formatting / rounding helpers |

---

> **Note on Heatmap:** The `ContributionHeatmap` component is preserved exactly as-is in both views. No changes to its data fetching, rendering, or positioning. All UI changes are additive around it.
