//! Pensaer CRDT Module
//!
//! Conflict-free Replicated Data Types for multi-user collaboration.
//! Enables real-time collaborative editing where multiple users can
//! edit the same building model simultaneously without conflicts.
//!
//! # Features
//!
//! - VectorClock for causal ordering of operations
//! - LWW (Last-Writer-Wins) register for simple value conflict resolution
//! - MergeResult tracking for audit and debugging
//! - Self-healing merge operations with overflow protection
//!
//! # Example
//!
//! ```
//! use pensaer_crdt::{VectorClock, LWWRegister, ReplicaId};
//!
//! let replica_id = ReplicaId::new("user-1");
//! let mut clock = VectorClock::new();
//! clock.increment(&replica_id);
//!
//! let mut register = LWWRegister::new("initial_value".to_string());
//! register.set("new_value".to_string(), &replica_id, &clock);
//! ```

use std::collections::HashMap;
use std::fmt;

/// Unique identifier for a replica (user/session).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ReplicaId(String);

impl ReplicaId {
    /// Create a new replica ID.
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    /// Get the ID as a string slice.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ReplicaId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Vector clock for causal ordering of distributed operations.
///
/// Each replica maintains a counter. When comparing two clocks:
/// - If all counters in A <= B and at least one <, then A happened-before B
/// - If some counters in A > B and some <, the events are concurrent
#[derive(Debug, Clone, Default)]
pub struct VectorClock {
    clocks: HashMap<String, u64>,
}

impl VectorClock {
    /// Create a new empty vector clock.
    pub fn new() -> Self {
        Self {
            clocks: HashMap::new(),
        }
    }

    /// Increment the clock for a replica.
    ///
    /// Uses saturating_add to prevent overflow panics.
    pub fn increment(&mut self, replica_id: &ReplicaId) {
        let entry = self.clocks.entry(replica_id.0.clone()).or_insert(0);
        *entry = entry.saturating_add(1);
    }

    /// Get the current time for a replica.
    pub fn get(&self, replica_id: &ReplicaId) -> u64 {
        self.clocks.get(&replica_id.0).copied().unwrap_or(0)
    }

    /// Merge with another vector clock (point-wise maximum).
    ///
    /// Self-healing: uses saturating operations to prevent overflow.
    pub fn merge(&mut self, other: &Self) {
        for (id, &time) in &other.clocks {
            let current = self.clocks.entry(id.clone()).or_insert(0);
            *current = (*current).max(time);
        }
    }

    /// Check if this clock happened-before another.
    pub fn happened_before(&self, other: &Self) -> bool {
        let mut dominated = false;

        // Check all keys in self
        for (id, &time) in &self.clocks {
            let other_time = other.clocks.get(id).copied().unwrap_or(0);
            if time > other_time {
                return false; // Self has a larger value
            }
            if time < other_time {
                dominated = true;
            }
        }

        // Check keys only in other
        for (id, &time) in &other.clocks {
            if !self.clocks.contains_key(id) && time > 0 {
                dominated = true;
            }
        }

        dominated
    }

    /// Check if this clock is concurrent with another.
    pub fn is_concurrent(&self, other: &Self) -> bool {
        !self.happened_before(other) && !other.happened_before(self) && self != other
    }

    /// Get all replica IDs in this clock.
    pub fn replicas(&self) -> impl Iterator<Item = &String> {
        self.clocks.keys()
    }
}

impl PartialEq for VectorClock {
    fn eq(&self, other: &Self) -> bool {
        // Equal if all non-zero entries match
        let all_keys: std::collections::HashSet<_> =
            self.clocks.keys().chain(other.clocks.keys()).collect();

        for key in all_keys {
            let self_val = self.clocks.get(key).copied().unwrap_or(0);
            let other_val = other.clocks.get(key).copied().unwrap_or(0);
            if self_val != other_val {
                return false;
            }
        }
        true
    }
}

impl Eq for VectorClock {}

/// Result of merging concurrent operations.
#[derive(Debug, Clone)]
pub enum MergeResult<T> {
    /// Operations were compatible, result is clean.
    Clean(T),
    /// Operations conflicted, result is best-effort resolution.
    Conflict {
        resolved: T,
        description: String,
    },
}

impl<T> MergeResult<T> {
    /// Get the resolved value regardless of conflict.
    pub fn value(self) -> T {
        match self {
            Self::Clean(v) => v,
            Self::Conflict { resolved, .. } => resolved,
        }
    }

    /// Check if merge was clean (no conflict).
    pub fn is_clean(&self) -> bool {
        matches!(self, Self::Clean(_))
    }

    /// Get conflict description if any.
    pub fn conflict_description(&self) -> Option<&str> {
        match self {
            Self::Clean(_) => None,
            Self::Conflict { description, .. } => Some(description),
        }
    }
}

/// Last-Writer-Wins Register for conflict resolution.
///
/// Stores a value with a timestamp. When merging, the value with
/// the higher timestamp wins. Ties are broken by replica ID.
#[derive(Debug, Clone)]
pub struct LWWRegister<T> {
    value: T,
    timestamp: u64,
    replica_id: String,
}

impl<T: Clone> LWWRegister<T> {
    /// Create a new register with an initial value.
    pub fn new(value: T) -> Self {
        Self {
            value,
            timestamp: 0,
            replica_id: String::new(),
        }
    }

    /// Get the current value.
    pub fn get(&self) -> &T {
        &self.value
    }

    /// Get the timestamp of the current value.
    pub fn timestamp(&self) -> u64 {
        self.timestamp
    }

    /// Set a new value with the given replica and clock.
    pub fn set(&mut self, value: T, replica_id: &ReplicaId, clock: &VectorClock) {
        let timestamp = clock.get(replica_id);
        if timestamp > self.timestamp
            || (timestamp == self.timestamp && replica_id.0 > self.replica_id)
        {
            self.value = value;
            self.timestamp = timestamp;
            self.replica_id = replica_id.0.clone();
        }
    }

    /// Merge with another register.
    ///
    /// Returns a MergeResult indicating if there was a conflict.
    pub fn merge(&mut self, other: &Self) -> MergeResult<T> {
        if self.timestamp > other.timestamp {
            MergeResult::Clean(self.value.clone())
        } else if other.timestamp > self.timestamp {
            self.value = other.value.clone();
            self.timestamp = other.timestamp;
            self.replica_id = other.replica_id.clone();
            MergeResult::Clean(self.value.clone())
        } else if self.replica_id == other.replica_id {
            // Same timestamp, same replica - no conflict
            MergeResult::Clean(self.value.clone())
        } else {
            // Same timestamp, different replicas - conflict!
            // Resolve by replica ID ordering
            let (winner, loser) = if self.replica_id > other.replica_id {
                (&self.value, &other.value)
            } else {
                self.value = other.value.clone();
                self.replica_id = other.replica_id.clone();
                (&self.value, &other.value)
            };
            MergeResult::Conflict {
                resolved: winner.clone(),
                description: format!(
                    "Concurrent writes at timestamp {}. Resolved by replica ID ordering.",
                    self.timestamp
                ),
            }
        }
    }
}

/// Operation type for the operation log.
#[derive(Debug, Clone)]
pub enum OperationType {
    /// Create a new element
    Create {
        element_type: String,
        element_id: String,
    },
    /// Update an existing element
    Update {
        element_id: String,
        property: String,
        old_value: String,
        new_value: String,
    },
    /// Delete an element
    Delete { element_id: String },
    /// Move an element
    Move {
        element_id: String,
        from: (f64, f64, f64),
        to: (f64, f64, f64),
    },
}

/// An operation in the CRDT log.
#[derive(Debug, Clone)]
pub struct Operation {
    /// Unique operation ID
    pub id: String,
    /// The operation type and data
    pub op_type: OperationType,
    /// Vector clock at time of operation
    pub clock: VectorClock,
    /// Replica that created this operation
    pub replica_id: ReplicaId,
    /// Unix timestamp (for ordering within same vector clock)
    pub wall_time: u64,
}

impl Operation {
    /// Create a new operation.
    pub fn new(
        id: impl Into<String>,
        op_type: OperationType,
        replica_id: ReplicaId,
        clock: VectorClock,
    ) -> Self {
        Self {
            id: id.into(),
            op_type,
            clock,
            replica_id,
            wall_time: 0, // Would use actual time in production
        }
    }

    /// Check if this operation happened-before another.
    pub fn happened_before(&self, other: &Self) -> bool {
        self.clock.happened_before(&other.clock)
    }

    /// Check if this operation is concurrent with another.
    pub fn is_concurrent(&self, other: &Self) -> bool {
        self.clock.is_concurrent(&other.clock)
    }
}

/// Operation log for storing and merging operations.
#[derive(Debug, Default)]
pub struct OperationLog {
    operations: Vec<Operation>,
    /// Tracks which operations have been seen (for deduplication)
    seen_ids: std::collections::HashSet<String>,
}

impl OperationLog {
    /// Create a new empty operation log.
    pub fn new() -> Self {
        Self {
            operations: Vec::new(),
            seen_ids: std::collections::HashSet::new(),
        }
    }

    /// Add an operation to the log.
    ///
    /// Returns false if operation was already seen (duplicate).
    pub fn add(&mut self, op: Operation) -> bool {
        if self.seen_ids.contains(&op.id) {
            return false; // Already seen, self-healing deduplication
        }
        self.seen_ids.insert(op.id.clone());
        self.operations.push(op);
        true
    }

    /// Merge operations from another log.
    ///
    /// Returns the number of new operations added.
    pub fn merge(&mut self, other: &Self) -> usize {
        let mut added = 0;
        for op in &other.operations {
            if self.add(op.clone()) {
                added += 1;
            }
        }
        added
    }

    /// Get operations in causal order.
    ///
    /// Operations are sorted such that if A happened-before B, A comes first.
    /// Concurrent operations are ordered by wall time, then by replica ID.
    pub fn operations_ordered(&self) -> Vec<&Operation> {
        let mut ops: Vec<_> = self.operations.iter().collect();
        ops.sort_by(|a, b| {
            if a.happened_before(b) {
                std::cmp::Ordering::Less
            } else if b.happened_before(a) {
                std::cmp::Ordering::Greater
            } else {
                // Concurrent - use wall time, then replica ID
                a.wall_time
                    .cmp(&b.wall_time)
                    .then_with(|| a.replica_id.0.cmp(&b.replica_id.0))
            }
        });
        ops
    }

    /// Get total operation count.
    pub fn len(&self) -> usize {
        self.operations.len()
    }

    /// Check if log is empty.
    pub fn is_empty(&self) -> bool {
        self.operations.is_empty()
    }

    /// Get operations for a specific element.
    pub fn operations_for_element(&self, element_id: &str) -> Vec<&Operation> {
        self.operations
            .iter()
            .filter(|op| match &op.op_type {
                OperationType::Create { element_id: id, .. } => id == element_id,
                OperationType::Update { element_id: id, .. } => id == element_id,
                OperationType::Delete { element_id: id } => id == element_id,
                OperationType::Move { element_id: id, .. } => id == element_id,
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vector_clock_increment() {
        let mut clock = VectorClock::new();
        let replica = ReplicaId::new("user-1");

        assert_eq!(clock.get(&replica), 0);
        clock.increment(&replica);
        assert_eq!(clock.get(&replica), 1);
        clock.increment(&replica);
        assert_eq!(clock.get(&replica), 2);
    }

    #[test]
    fn vector_clock_merge() {
        let mut clock1 = VectorClock::new();
        let mut clock2 = VectorClock::new();
        let replica1 = ReplicaId::new("user-1");
        let replica2 = ReplicaId::new("user-2");

        clock1.increment(&replica1);
        clock1.increment(&replica1);
        clock2.increment(&replica2);

        clock1.merge(&clock2);

        assert_eq!(clock1.get(&replica1), 2);
        assert_eq!(clock1.get(&replica2), 1);
    }

    #[test]
    fn vector_clock_happened_before() {
        let mut clock1 = VectorClock::new();
        let mut clock2 = VectorClock::new();
        let replica = ReplicaId::new("user-1");

        clock1.increment(&replica);
        clock2.increment(&replica);
        clock2.increment(&replica);

        assert!(clock1.happened_before(&clock2));
        assert!(!clock2.happened_before(&clock1));
    }

    #[test]
    fn vector_clock_concurrent() {
        let mut clock1 = VectorClock::new();
        let mut clock2 = VectorClock::new();
        let replica1 = ReplicaId::new("user-1");
        let replica2 = ReplicaId::new("user-2");

        clock1.increment(&replica1);
        clock2.increment(&replica2);

        assert!(clock1.is_concurrent(&clock2));
        assert!(clock2.is_concurrent(&clock1));
    }

    #[test]
    fn lww_register_set_get() {
        let mut register = LWWRegister::new("initial".to_string());
        let replica = ReplicaId::new("user-1");
        let mut clock = VectorClock::new();

        assert_eq!(register.get(), "initial");

        clock.increment(&replica);
        register.set("updated".to_string(), &replica, &clock);
        assert_eq!(register.get(), "updated");
    }

    #[test]
    fn lww_register_merge_clean() {
        let mut reg1 = LWWRegister::new("v1".to_string());
        let mut reg2 = LWWRegister::new("v2".to_string());
        let replica = ReplicaId::new("user-1");
        let mut clock = VectorClock::new();

        clock.increment(&replica);
        reg1.set("v1-updated".to_string(), &replica, &clock);

        clock.increment(&replica);
        reg2.set("v2-updated".to_string(), &replica, &clock);

        // reg2 has higher timestamp, so it should win
        let result = reg1.merge(&reg2);
        assert!(result.is_clean());
        assert_eq!(reg1.get(), "v2-updated");
    }

    #[test]
    fn lww_register_merge_conflict() {
        let mut reg1 = LWWRegister::new("".to_string());
        let mut reg2 = LWWRegister::new("".to_string());
        let replica1 = ReplicaId::new("user-1");
        let replica2 = ReplicaId::new("user-2");
        let mut clock1 = VectorClock::new();
        let mut clock2 = VectorClock::new();

        clock1.increment(&replica1);
        clock2.increment(&replica2);

        reg1.set("value-from-1".to_string(), &replica1, &clock1);
        reg2.set("value-from-2".to_string(), &replica2, &clock2);

        // Same timestamp (1), different replicas - conflict!
        let result = reg1.merge(&reg2);
        assert!(!result.is_clean());
        assert!(result.conflict_description().is_some());
    }

    #[test]
    fn operation_log_deduplication() {
        let mut log = OperationLog::new();
        let replica = ReplicaId::new("user-1");
        let clock = VectorClock::new();

        let op = Operation::new(
            "op-1",
            OperationType::Create {
                element_type: "wall".to_string(),
                element_id: "wall-1".to_string(),
            },
            replica.clone(),
            clock.clone(),
        );

        assert!(log.add(op.clone())); // First add succeeds
        assert!(!log.add(op)); // Duplicate is rejected
        assert_eq!(log.len(), 1);
    }

    #[test]
    fn operation_log_merge() {
        let mut log1 = OperationLog::new();
        let mut log2 = OperationLog::new();
        let replica1 = ReplicaId::new("user-1");
        let replica2 = ReplicaId::new("user-2");
        let clock = VectorClock::new();

        log1.add(Operation::new(
            "op-1",
            OperationType::Create {
                element_type: "wall".to_string(),
                element_id: "wall-1".to_string(),
            },
            replica1,
            clock.clone(),
        ));

        log2.add(Operation::new(
            "op-2",
            OperationType::Create {
                element_type: "door".to_string(),
                element_id: "door-1".to_string(),
            },
            replica2,
            clock,
        ));

        let added = log1.merge(&log2);
        assert_eq!(added, 1);
        assert_eq!(log1.len(), 2);
    }
}
