/**
 * IndexedDB persistence layer for Alert Rules and Notifications
 * Extends the existing storage pattern from src/lib/storage.js
 */

import { openDB, type IDBPDatabase } from 'idb'
import type { AlertRule, AlertNotification } from '../types/alerts'

const DB_NAME = 'stellar-dev-dashboard'
const DB_VERSION = 3 // Increment from existing version 2
const RULES_STORE = 'alert-rules'
const NOTIFICATIONS_STORE = 'alert-notifications'

let dbPromise: Promise<IDBPDatabase> | null = null

function initDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Create alert-rules store if it doesn't exist
        if (!db.objectStoreNames.contains(RULES_STORE)) {
          const rulesStore = db.createObjectStore(RULES_STORE, { keyPath: 'id' })
          rulesStore.createIndex('userId', 'userId', { unique: false })
          rulesStore.createIndex('accountAddress', 'accountAddress', { unique: false })
          rulesStore.createIndex('enabled', 'enabled', { unique: false })
        }

        // Create alert-notifications store
        if (!db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
          const notifStore = db.createObjectStore(NOTIFICATIONS_STORE, { keyPath: 'id' })
          notifStore.createIndex('ruleId', 'ruleId', { unique: false })
          notifStore.createIndex('read', 'read', { unique: false })
          notifStore.createIndex('triggeredAt', 'triggeredAt', { unique: false })
          notifStore.createIndex('accountAddress', 'accountAddress', { unique: false })
        }
      },
    })
  }
  return dbPromise
}

// ─── Alert Rules ──────────────────────────────────────────────────────────────

export async function saveRule(rule: AlertRule): Promise<void> {
  const db = await initDb()
  const tx = db.transaction(RULES_STORE, 'readwrite')
  await tx.store.put(rule)
  await tx.done
}

export async function deleteRule(ruleId: string): Promise<void> {
  const db = await initDb()
  const tx = db.transaction(RULES_STORE, 'readwrite')
  await tx.store.delete(ruleId)
  await tx.done
}

export async function getRules(userId: string): Promise<AlertRule[]> {
  const db = await initDb()
  const tx = db.transaction(RULES_STORE, 'readonly')
  const index = tx.store.index('userId')
  const rules = await index.getAll(userId)
  await tx.done
  return rules
}

export async function getEnabledRules(userId: string): Promise<AlertRule[]> {
  const rules = await getRules(userId)
  return rules.filter(rule => rule.enabled)
}

export async function updateRuleEvaluationTime(
  ruleId: string,
  lastEvaluatedAt: number,
  lastTriggeredAt?: number
): Promise<void> {
  const db = await initDb()
  const tx = db.transaction(RULES_STORE, 'readwrite')
  const rule = await tx.store.get(ruleId)
  
  if (rule) {
    rule.lastEvaluatedAt = lastEvaluatedAt
    if (lastTriggeredAt !== undefined) {
      rule.lastTriggeredAt = lastTriggeredAt
    }
    await tx.store.put(rule)
  }
  
  await tx.done
}

// ─── Alert Notifications ──────────────────────────────────────────────────────

export async function saveNotification(notification: AlertNotification): Promise<void> {
  const db = await initDb()
  const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite')
  await tx.store.put(notification)
  await tx.done
}

export async function getNotifications(
  userId: string,
  unreadOnly = false
): Promise<AlertNotification[]> {
  const db = await initDb()
  const tx = db.transaction(NOTIFICATIONS_STORE, 'readonly')
  const index = tx.store.index('accountAddress')
  const notifications = await index.getAll(userId)
  await tx.done
  
  const sorted = notifications.sort((a, b) => b.triggeredAt - a.triggeredAt)
  
  if (unreadOnly) {
    return sorted.filter(n => !n.read)
  }
  
  return sorted
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const db = await initDb()
  const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite')
  const notification = await tx.store.get(notificationId)
  
  if (notification) {
    notification.read = true
    await tx.store.put(notification)
  }
  
  await tx.done
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notifications = await getNotifications(userId, true)
  const db = await initDb()
  const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite')
  
  for (const notification of notifications) {
    notification.read = true
    await tx.store.put(notification)
  }
  
  await tx.done
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const db = await initDb()
  const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite')
  await tx.store.delete(notificationId)
  await tx.done
}

export async function clearOldNotifications(userId: string, olderThanMs: number): Promise<void> {
  const cutoff = Date.now() - olderThanMs
  const notifications = await getNotifications(userId)
  const db = await initDb()
  const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite')
  
  for (const notification of notifications) {
    if (notification.triggeredAt < cutoff) {
      await tx.store.delete(notification.id)
    }
  }
  
  await tx.done
}

// Initialize the database on module load
if (typeof window !== 'undefined') {
  initDb().catch(err => console.error('Failed to initialize alert rules database:', err))
}
