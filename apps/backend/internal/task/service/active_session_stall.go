package service

import (
	"context"
	"sort"
	"time"

	"github.com/kandev/kandev/internal/events"
	"github.com/kandev/kandev/internal/events/bus"
	"github.com/kandev/kandev/internal/task/archivecascade"
	"github.com/kandev/kandev/internal/task/models"
	"go.uber.org/zap"
)

const (
	// defaultStallDetectionThreshold is the event-silence window after which
	// an execution-less active session is classified as stalled
	// (tasks.stallDetectionThreshold defaults to 2h).
	defaultStallDetectionThreshold = 2 * time.Hour
	// stallHealGraceMultiplier derives the orphaned-session healing grace
	// window from the stall threshold. Healing waits twice as long as
	// detection so an operator has a full threshold window to act on the
	// task.stalled event before the sweep cancels the orphaned session, and
	// so a live in-flight launch that has not yet registered its execution
	// never races the grace window.
	stallHealGraceMultiplier = 2
)

// stallThreshold returns the configured stall-detection threshold, falling
// back to the default when the setter was never called (zero value).
func (s *Service) stallThreshold() time.Duration {
	if s.stallDetectionThreshold > 0 {
		return s.stallDetectionThreshold
	}
	return defaultStallDetectionThreshold
}

// runActiveSessionSweep is the session reconciliation sweep's active-task
// pass: for every unarchived task that still holds an active session
// (CREATED/STARTING/RUNNING/WAITING_FOR_INPUT), it classifies each session
// against the in-memory execution store. A session with a registered live
// execution is healthy regardless of silence. A session with no live
// execution has lost its actor (backend restart, lost executor, or a launch
// that never registered) and nothing in any request path will ever advance
// it again, so the pass:
//
//   - emits one task.stalled event per stall episode once the session has
//     been event-silent beyond the stall threshold (detection only), and
//   - cancels the session via the same finalizeCancelledSessions transition
//     the archived pass uses once the silence exceeds the grace window
//     (twice the threshold), making the DB state truthful, delivering the
//     session.state_changed event clients key off, and unblocking the task's
//     step lifecycle.
//
// The execution check is fail-closed: without the registry the pass cannot
// prove "no live execution", so it skips rather than healing or alerting on
// a guess. The event-silence clock is the newest of the session row's
// updated_at and its newest task_session_messages row, so any state
// transition or message resets it.
func (s *Service) runActiveSessionSweep(ctx context.Context, now time.Time) {
	if s.sessionExecutionRegistry == nil {
		return
	}
	tasks, err := s.tasks.ListUnarchivedTasksWithActiveSessions(ctx)
	if err != nil {
		s.logger.Error("active-session sweep: failed to list candidates", zap.Error(err))
		return
	}
	if len(tasks) == 0 {
		s.clearAllStallNotifications()
		return
	}

	threshold := s.stallThreshold()
	grace := threshold * stallHealGraceMultiplier
	for _, task := range tasks {
		if task == nil || task.ID == "" {
			continue
		}
		s.sweepTaskSessions(ctx, task, now, threshold, grace)
	}
}

// sweepTaskSessions runs the sweep classification for one candidate task.
func (s *Service) sweepTaskSessions(
	ctx context.Context,
	task *models.Task,
	now time.Time,
	threshold, grace time.Duration,
) {
	activeSessions, err := s.sessions.ListActiveTaskSessionsByTaskID(ctx, task.ID)
	if err != nil {
		s.logger.Warn("active-session sweep: failed to list active sessions",
			zap.String("task_id", task.ID),
			zap.Error(err))
		return
	}
	if len(activeSessions) == 0 {
		// Reconciled by a concurrent pass between the candidate list query
		// and this read.
		return
	}

	liveSessions := s.liveSessionSet(task.ID)
	orphaned := make([]*models.TaskSession, 0, len(activeSessions))
	for _, session := range activeSessions {
		if session == nil {
			continue
		}
		if _, live := liveSessions[session.ID]; !live {
			orphaned = append(orphaned, session)
		}
	}
	if len(orphaned) == 0 {
		s.clearStallNotifications(task.ID)
		return
	}

	stalled, healable, oldestEvent := classifyOrphanedSessions(
		orphaned, s.lastSessionEventTimes(ctx, orphaned), now, threshold, grace,
	)
	s.notifyStalledSessions(ctx, task, stalled, oldestEvent, now, threshold)
	s.healOrphanedSessions(ctx, task, activeSessions, orphaned, healable)
}

// classifyOrphanedSessions splits execution-less sessions into stalled
// (event-silent beyond threshold) and healable (silent beyond the grace
// window), and reports the oldest event time across the stalled set for the
// task.stalled payload.
func classifyOrphanedSessions(
	orphaned []*models.TaskSession,
	lastEventBySession map[string]time.Time,
	now time.Time,
	threshold, grace time.Duration,
) (stalled, healable []*models.TaskSession, oldestEvent time.Time) {
	for _, session := range orphaned {
		lastEvent := lastSessionEventAt(session, lastEventBySession)
		silence := now.Sub(lastEvent)
		if silence < threshold {
			continue
		}
		stalled = append(stalled, session)
		if oldestEvent.IsZero() || lastEvent.Before(oldestEvent) {
			oldestEvent = lastEvent
		}
		if silence >= grace {
			healable = append(healable, session)
		}
	}
	return stalled, healable, oldestEvent
}

// lastSessionEventAt resolves one session's event clock: the newer of its
// newest task_session_messages row (when one exists) and the session row's
// own updated_at, so any persisted state transition resets the silence.
func lastSessionEventAt(session *models.TaskSession, lastEventBySession map[string]time.Time) time.Time {
	lastEvent := session.UpdatedAt
	if lastMessage, ok := lastEventBySession[session.ID]; ok && lastMessage.After(lastEvent) {
		lastEvent = lastMessage
	}
	return lastEvent
}

// liveSessionSet reads the registry's live-execution snapshot for one task.
func (s *Service) liveSessionSet(taskID string) map[string]struct{} {
	ids := s.sessionExecutionRegistry.LiveSessionIDsForTask(taskID)
	live := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		if id != "" {
			live[id] = struct{}{}
		}
	}
	return live
}

// lastSessionEventTimes loads the newest message time for each session in
// one batched query. A read failure degrades to the session row's own
// updated_at clock rather than skipping the pass: updated_at alone still
// classifies correctly for every stalled session whose row went quiet.
func (s *Service) lastSessionEventTimes(
	ctx context.Context, orphaned []*models.TaskSession,
) map[string]time.Time {
	ids := make([]string, 0, len(orphaned))
	for _, session := range orphaned {
		ids = append(ids, session.ID)
	}
	times, err := s.messages.GetLastMessageTimeBySessionIDs(ctx, ids)
	if err != nil {
		s.logger.Warn("active-session sweep: failed to load last message times; falling back to session updated_at",
			zap.Error(err))
		return nil
	}
	return times
}

// stallPayload field keys (task_id / workspace_id exist as constants for
// other features; these name this payload's own keys).
const (
	stallPayloadTaskIDKey      = "task_id"
	stallPayloadWorkspaceIDKey = "workspace_id"
)

// notifyStalledSessions emits the task.stalled warning and event for
// sessions not yet reported in this stall episode. See stallNotifiedSessions
// for the episode semantics.
func (s *Service) notifyStalledSessions(
	ctx context.Context,
	task *models.Task,
	stalled []*models.TaskSession,
	oldestEvent time.Time,
	now time.Time,
	threshold time.Duration,
) {
	if len(stalled) == 0 {
		s.clearStallNotifications(task.ID)
		return
	}
	if s.stallNotifiedSessions == nil {
		s.stallNotifiedSessions = make(map[string]map[string]struct{})
	}
	notified := s.stallNotifiedSessions[task.ID]
	newlyStalled := make([]*models.TaskSession, 0, len(stalled))
	for _, session := range stalled {
		if _, seen := notified[session.ID]; !seen {
			newlyStalled = append(newlyStalled, session)
		}
	}
	if notified == nil {
		notified = make(map[string]struct{}, len(stalled))
		s.stallNotifiedSessions[task.ID] = notified
	}
	for _, session := range newlyStalled {
		notified[session.ID] = struct{}{}
	}
	if len(newlyStalled) == 0 {
		return
	}

	sessionIDs := make([]string, 0, len(newlyStalled))
	for _, session := range newlyStalled {
		sessionIDs = append(sessionIDs, session.ID)
	}
	sort.Strings(sessionIDs)
	silence := now.Sub(oldestEvent)
	s.logger.Warn("stalled_task detected: active session with no live execution and no recent events",
		zap.String("task_id", task.ID),
		zap.Strings("session_ids", sessionIDs),
		zap.Duration("silent_for", silence),
		zap.Duration("threshold", threshold))
	if s.eventBus == nil {
		return
	}
	payload := map[string]interface{}{
		stallPayloadTaskIDKey:      task.ID,
		stallPayloadWorkspaceIDKey: task.WorkspaceID,
		"session_ids":              sessionIDs,
		"stalled_for":              silence.String(),
		"last_event_at":            oldestEvent.UTC().Format(time.RFC3339Nano),
		"detection_only":           true,
	}
	event := bus.NewEvent(events.TaskStalled, "task-reconciliation", payload)
	if err := s.eventBus.Publish(ctx, events.TaskStalled, event); err != nil {
		s.logger.Error("failed to publish stalled task event",
			zap.String("task_id", task.ID),
			zap.Error(err))
	}
}

// healOrphanedSessions cancels execution-less sessions that have been silent
// beyond the grace window, reusing the archived pass's
// finalizeCancelledSessions transition (cancellation with the orphaned
// reason, clarification expiry, parked-projection cleanup, ceiling release,
// and the session.state_changed event) so clients keying off that event see
// the session stop. Repeat passes are no-ops: the underlying UPDATE only
// matches rows still in an active state.
//
// The cancellation is task-scoped, so healing only runs when every active
// session of the task is execution-less and past the grace window. A task
// that still has any live or merely-stalled session keeps its rows: killing
// live work because a sibling session died is never the sweep's call, and a
// later pass heals once the remaining sessions go quiet too.
func (s *Service) healOrphanedSessions(
	ctx context.Context,
	task *models.Task,
	activeSessions, orphaned, healable []*models.TaskSession,
) {
	if len(healable) == 0 || len(orphaned) != len(activeSessions) || len(healable) != len(orphaned) {
		return
	}
	sessionIDs := make([]string, 0, len(healable))
	for _, session := range healable {
		sessionIDs = append(sessionIDs, session.ID)
	}
	s.logger.Info("active-session sweep: healing orphaned sessions",
		zap.String("task_id", task.ID),
		zap.Strings("session_ids", sessionIDs))
	deadline := archivecascade.ArchiveDeadline(ctx)
	healCtx, cancel := archivecascade.ContinuationContextUntil(ctx, deadline)
	defer cancel()
	s.finalizeCancelledSessions(healCtx, task.ID, activeSessions, deadline, models.SessionOrphanedCancelReason)
}

// clearStallNotifications ends a task's stall episode once it no longer has
// any stalled session, so a later stall on the same task reports again.
func (s *Service) clearStallNotifications(taskID string) {
	delete(s.stallNotifiedSessions, taskID)
}

// clearAllStallNotifications resets episode tracking when no candidates
// remain at all.
func (s *Service) clearAllStallNotifications() {
	s.stallNotifiedSessions = make(map[string]map[string]struct{})
}
